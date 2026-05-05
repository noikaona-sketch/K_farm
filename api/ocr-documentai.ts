type OcrResult = {
  full_name: string
  id_card: string
  address: string
  province: string
  district: string
  subdistrict: string
  expiry_date: string
  issue_date: string
  confidence: number
  raw_text: string
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function createAccessToken() {
  const clientEmail = process.env.GOOGLE_DOCUMENTAI_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_DOCUMENTAI_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!clientEmail || !privateKey) throw new Error('Missing GOOGLE_DOCUMENTAI_CLIENT_EMAIL or GOOGLE_DOCUMENTAI_PRIVATE_KEY')

  const now = Math.floor(Date.now() / 1000)
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64UrlEncode(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }))
  const data = `${header}.${claim}`
  const crypto = await import('crypto')
  const signature = crypto.createSign('RSA-SHA256').update(data).sign(privateKey, 'base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const jwt = `${data}.${signature}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const tokenJson = await tokenRes.json()
  if (!tokenRes.ok) throw new Error(tokenJson?.error_description || tokenJson?.error || 'Failed to get Google access token')
  return String(tokenJson.access_token)
}

function cleanSpaces(s: string) {
  return s.replace(/\s+/g, ' ').trim()
}

function cutBeforeMarkers(text: string, markers: string[]) {
  let end = text.length
  for (const marker of markers) {
    const idx = text.toLowerCase().indexOf(marker.toLowerCase())
    if (idx >= 0 && idx < end) end = idx
  }
  return text.slice(0, end).trim()
}

function extractDateAfter(text: string, markers: string[]) {
  const compact = cleanSpaces(text)
  const datePattern = '(\\d{1,2}\\s*(?:ม\\.ค\\.|ก\\.พ\\.|มี\\.ค\\.|เม\\.ย\\.|พ\\.ค\\.|มิ\\.ย\\.|ก\\.ค\\.|ส\\.ค\\.|ก\\.ย\\.|ต\\.ค\\.|พ\\.ย\\.|ธ\\.ค\\.|Jan\\.?|Feb\\.?|Mar\\.?|Apr\\.?|May|Jun\\.?|Jul\\.?|Aug\\.?|Sep\\.?|Oct\\.?|Nov\\.?|Dec\\.?)\\s*\\d{4})'
  for (const marker of markers) {
    const re = new RegExp(`${datePattern}\\s*${marker}|${marker}\\s*${datePattern}`, 'i')
    const m = compact.match(re)
    if (m) return cleanSpaces(m[1] || m[2] || '')
  }
  return ''
}

function extractAddress(compact: string) {
  const startCandidates = ['ที่อยู่', 'Address']
  let start = -1
  for (const marker of startCandidates) {
    const idx = compact.toLowerCase().indexOf(marker.toLowerCase())
    if (idx >= 0 && (start < 0 || idx < start)) start = idx
  }
  if (start < 0) return ''

  let address = compact.slice(start).replace(/^ที่อยู่\s*/i, '').replace(/^Address\s*/i, '').trim()
  address = cutBeforeMarkers(address, [
    'วันออกบัตร', 'Date of Issue', 'วันบัตรหมดอายุ', 'Date of Expiry',
    'เจ้าพนักงานออกบัตร', 'กระทรวงมหาดไทย', 'กระทรวงมหาดไท', 'Date of Expiry', 'Date of Issue'
  ])
  address = address.replace(/\b\d{1,3}\s+\d{1,3}\s+\d{1,3}\s+\d{1,3}\b.*$/g, '').trim()
  return cleanSpaces(address)
}

function parseThaiDocumentText(text: string): OcrResult {
  const compact = cleanSpaces(text)
  const idMatch = compact.match(/\b\d[\d\s-]{11,20}\d\b/)
  const idCard = idMatch ? idMatch[0].replace(/\D/g, '').slice(0, 13) : ''

  const lines = text.split(/\r?\n/).map(x => x.trim()).filter(Boolean)
  const nameLine = lines.find(line =>
    /นาย|นางสาว|นาง|Mr\.?|Mrs\.?|Miss/i.test(line) && !/เลข|บัตร|identification|address|date|เกิด|ออกบัตร|หมดอายุ/i.test(line)
  ) || ''

  const address = extractAddress(compact)
  const provinceMatch = address.match(/(?:จังหวัด|จ\.)\s*([^\s]+)/) || compact.match(/(?:จังหวัด|จ\.)\s*([^\s]+)/)
  const districtMatch = address.match(/(?:อำเภอ|อ\.|เขต)\s*([^\s]+)/) || compact.match(/(?:อำเภอ|อ\.|เขต)\s*([^\s]+)/)
  const subdistrictMatch = address.match(/(?:ตำบล|ต\.|แขวง)\s*([^\s]+)/) || compact.match(/(?:ตำบล|ต\.|แขวง)\s*([^\s]+)/)

  return {
    full_name: nameLine.replace(/^(ชื่อ|Name|Thai Name)\s*[:：]?\s*/i, '').trim(),
    id_card: idCard,
    address,
    province: provinceMatch?.[1] ?? '',
    district: districtMatch?.[1] ?? '',
    subdistrict: subdistrictMatch?.[1] ?? '',
    expiry_date: extractDateAfter(compact, ['วันบัตรหมดอายุ', 'Date of Expiry']),
    issue_date: extractDateAfter(compact, ['วันออกบัตร', 'Date of Issue']),
    confidence: text ? 0.75 : 0,
    raw_text: text,
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
    const location = process.env.GOOGLE_DOCUMENTAI_LOCATION || 'us'
    const processorId = process.env.GOOGLE_DOCUMENTAI_PROCESSOR_ID
    if (!projectId || !processorId) return res.status(500).json({ error: 'Missing GOOGLE_CLOUD_PROJECT_ID or GOOGLE_DOCUMENTAI_PROCESSOR_ID' })

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const imageBase64 = String(body?.imageBase64 ?? '')
    const mimeType = String(body?.mimeType ?? 'image/jpeg')
    if (!imageBase64) return res.status(400).json({ error: 'Missing imageBase64' })

    const token = await createAccessToken()
    const endpoint = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`
    const docRes = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawDocument: { content: imageBase64, mimeType } }),
    })
    const docJson = await docRes.json()
    if (!docRes.ok) {
      console.error('[ocr-documentai] failed', docRes.status, docJson)
      return res.status(500).json({ error: docJson?.error?.message || 'Document AI OCR failed', status: docRes.status, detail: docJson })
    }
    const parsed = parseThaiDocumentText(String(docJson?.document?.text ?? ''))
    return res.status(200).json(parsed)
  } catch (error: any) {
    console.error('[ocr-documentai]', error)
    return res.status(500).json({ error: error?.message ?? 'Document AI OCR failed' })
  }
}
