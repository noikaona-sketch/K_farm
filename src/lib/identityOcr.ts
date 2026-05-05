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
  return json as IdentityOcrResult
}
