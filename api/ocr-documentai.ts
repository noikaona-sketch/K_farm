type OcrResult = {
  full_name: string
  id_card: string
  address: string
  province: string
  district: string
  subdistrict: string
  confidence: number
  raw_text: string
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

async function createAccessToken() {
  const clientEmail = process.env.GOOGLE_DOCUMENTAI_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_DOCUMENTAI_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    throw new Error('Missing GOOGLE_DOCUMENTAI_CLIENT_EMAIL or GOOGLE_DOCUMENTAI_PRIVATE_KEY')
  }

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
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(data)
    .sign(privateKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  const jwt = `${data}.${signature}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const tokenJson = await tokenRes.json()
  if (!tokenRes.ok) {
    throw new Error(tokenJson?.error_description || tokenJson?.error || 'Failed to get Google access token')
  }

  return String(tokenJson.access_token)
}

function textBetween(text: string, start: number, end: number) {
  return text.slice(start, end).replace(/\s+/g, ' ').trim()
}

function parseThaiDocumentText(text: string): OcrResult {
  const compact = text.replace(/\s+/g, ' ').trim()
  const idMatch = compact.match(/\b\d[\d\s-]{11,20}\d\b/)
  const idCard = idMatch ? idMatch[0].replace(/\D/g, '').slice(0, 13) : ''

  const lines = text.split(/\r?\n/).map(x => x.trim()).filter(Boolean)
  const nameLine = lines.find(line =>
    /นาย|นางสาว|นาง|Mr\.|Mrs\.|Miss/i.test(line) &&
    !/เลข|บัตร|identification|address/i.test(line)
  ) || ''

  const provinceMatch = compact.match(/(?:จังหวัด|จ\.)\s*([^\s]+)/)
  const districtMatch = compact.match(/(?:อำเภอ|อ\.|เขต)\s*([^\s]+)/)
  const subdistrictMatch = compact.match(/(?:ตำบล|ต\.|แขวง)\s*([^\s]+)/)

  const addressStart = Math.max(
    compact.indexOf('ที่อยู่'),
    compact.indexOf('Address'),
    compact.indexOf('address')
  )
  const address = addressStart >= 0 ? compact.slice(addressStart).slice(0, 260) : ''

  return {
    full_name: nameLine.replace(/^(ชื่อ|Name|Thai Name)\s*[:：]?\s*/i, '').trim(),
    id_card: idCard,
    address,
    province: provinceMatch?.[1] ?? '',
    district: districtMatch?.[1] ?? '',
    subdistrict: subdistrictMatch?.[1] ?? '',
    confidence: text ? 0.7 : 0,
    raw_text: text,
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
    const location = process.env.GOOGLE_DOCUMENTAI_LOCATION || 'us'
    const processorId = process.env.GOOGLE_DOCUMENTAI_PROCESSOR_ID

    if (!projectId || !processorId) {
      return res.status(500).json({ error: 'Missing GOOGLE_CLOUD_PROJECT_ID or GOOGLE_DOCUMENTAI_PROCESSOR_ID' })
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const imageBase64 = String(body?.imageBase64 ?? '')
    const mimeType = String(body?.mimeType ?? 'image/jpeg')
    if (!imageBase64) return res.status(400).json({ error: 'Missing imageBase64' })

    const token = await createAccessToken()
    const endpoint = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`

    const docRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rawDocument: {
          content: imageBase64,
          mimeType,
        },
      }),
    })

    const docJson = await docRes.json()
    if (!docRes.ok) {
      console.error('[ocr-documentai] failed', docRes.status, docJson)
      return res.status(500).json({
        error: docJson?.error?.message || 'Document AI OCR failed',
        status: docRes.status,
        detail: docJson,
      })
    }

    const text = String(docJson?.document?.text ?? '')
    const parsed = parseThaiDocumentText(text)
    return res.status(200).json(parsed)
  } catch (error: any) {
    console.error('[ocr-documentai]', error)
    return res.status(500).json({ error: error?.message ?? 'Document AI OCR failed' })
  }
}
