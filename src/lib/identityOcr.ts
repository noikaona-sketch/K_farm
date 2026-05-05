import { preprocessImageForOcr } from './imagePreprocess'

export type IdentityOcrResult = {
  full_name: string
  id_card: string
  address: string
  province: string
  district: string
  subdistrict: string
  expiry_date?: string
  issue_date?: string
  confidence: number
  raw_text: string
}

function isThaiText(value: string) {
  return /[ก-๙]/.test(value)
}

function cleanName(value: string) {
  return value
    .replace(/^(ชื่อ|ชื่อตัวและชื่อสกุล|Thai Name|Name|Full Name)\s*[:：]?\s*/i, '')
    .replace(/^(นาย|นาง|นางสาว)\s+/, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractThaiNameFromRawText(rawText: string) {
  const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(Boolean)

  for (const line of lines) {
    const cleaned = cleanName(line)
    if (
      isThaiText(cleaned) &&
      /^(นาย|นาง|นางสาว)\s*[ก-๙]/.test(cleaned) &&
      !/(เลข|บัตร|ประชาชน|เกิด|ที่อยู่|ศาสนา|วัน|หมดอายุ|ออกบัตร)/.test(cleaned)
    ) {
      return cleaned
    }
  }

  const compact = rawText.replace(/\s+/g, ' ').trim()
  const match = compact.match(/(นาย|นางสาว|นาง)\s*[ก-๙][ก-๙\s.]{3,80}/)
  return match ? cleanName(match[0]) : ''
}

export function preferThaiIdentityName(ocr: IdentityOcrResult): IdentityOcrResult {
  if (isThaiText(ocr.full_name)) return ocr
  const thaiName = extractThaiNameFromRawText(ocr.raw_text ?? '')
  return thaiName ? { ...ocr, full_name: thaiName } : ocr
}

export async function runIdentityOcr(file: File): Promise<IdentityOcrResult> {
  const processed = await preprocessImageForOcr(file, {
    maxSide: 1200,
    quality: 0.8,
    centerCrop: true,
  })

  const res = await fetch('/api/ocr-documentai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: processed.base64,
      mimeType: processed.file.type,
    }),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'อ่านข้อความจากรูปไม่สำเร็จ')
  return preferThaiIdentityName(json as IdentityOcrResult)
}
