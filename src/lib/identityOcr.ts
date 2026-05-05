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
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanThaiNameCandidate(value: string) {
  return cleanName(value)
    .replace(/\s*(?:Name|Last name|Date of Birth|เกิดวันที่|ศาสนา|ที่อยู่|Address|วันออกบัตร|วันบัตรหมดอายุ).*$/i, '')
    .replace(/[^ก-๙\s.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractThaiNameAfterMarker(rawText: string) {
  const markerPattern = /ชื่อตัวและชื่อสกุล\s*[:：]?\s*/i
  const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(Boolean)

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const markerMatch = line.match(markerPattern)
    if (!markerMatch) continue

    const afterMarker = line.slice((markerMatch.index ?? 0) + markerMatch[0].length)
    const sameLineName = cleanThaiNameCandidate(afterMarker)
    if (isThaiText(sameLineName)) return sameLineName

    for (let j = i + 1; j < Math.min(i + 4, lines.length); j += 1) {
      const nextLineName = cleanThaiNameCandidate(lines[j])
      if (isThaiText(nextLineName) && !/(เลข|บัตร|ประชาชน|เกิด|ที่อยู่|ศาสนา|วัน|หมดอายุ|ออกบัตร)/.test(nextLineName)) {
        return nextLineName
      }
    }
  }

  const compact = rawText.replace(/\s+/g, ' ').trim()
  const compactMatch = compact.match(/ชื่อตัวและชื่อสกุล\s*[:：]?\s*([ก-๙\s.]{3,80})/i)
  return compactMatch ? cleanThaiNameCandidate(compactMatch[1]) : ''
}

function extractThaiNameFromRawText(rawText: string) {
  const markerName = extractThaiNameAfterMarker(rawText)
  if (markerName) return markerName

  const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(Boolean)

  for (const line of lines) {
    const cleaned = cleanThaiNameCandidate(line)
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
  return match ? cleanThaiNameCandidate(match[0]) : ''
}

export function preferThaiIdentityName(ocr: IdentityOcrResult): IdentityOcrResult {
  const thaiName = extractThaiNameFromRawText(ocr.raw_text ?? '')
  if (thaiName) return { ...ocr, full_name: thaiName }
  return ocr
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
