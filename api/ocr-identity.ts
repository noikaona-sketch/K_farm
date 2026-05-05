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

function normalizeOcrResult(value: Record<string, unknown>): OcrResult {
  return {
    full_name: String(value.full_name ?? ''),
    id_card: String(value.id_card ?? '').replace(/\D/g, ''),
    address: String(value.address ?? ''),
    province: String(value.province ?? ''),
    district: String(value.district ?? ''),
    subdistrict: String(value.subdistrict ?? ''),
    confidence: Number(value.confidence ?? 0),
    raw_text: String(value.raw_text ?? ''),
  }
}

function safeJsonParse(text: string): OcrResult {
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(cleaned) as Record<string, unknown>
  return normalizeOcrResult(parsed)
}

function getGeminiErrorMessage(detail: any): string {
  const status = detail?.error?.status ? String(detail.error.status) : ''
  const message = detail?.error?.message ? String(detail.error.message) : ''

  if (status === 'PERMISSION_DENIED') return `Gemini permission denied: ${message}`
  if (status === 'RESOURCE_EXHAUSTED') return `Gemini quota exceeded: ${message}`
  if (status === 'INVALID_ARGUMENT') return `Gemini invalid request: ${message}`
  if (status === 'NOT_FOUND') return `Gemini model not found: ${message}`
  if (message) return `Gemini error: ${message}`
  return 'Gemini OCR failed'
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' })

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const imageBase64 = String(body?.imageBase64 ?? '')
    const mimeType = String(body?.mimeType ?? 'image/jpeg')

    if (!imageBase64) return res.status(400).json({ error: 'Missing imageBase64' })

    const prompt = `
อ่านข้อมูลจากรูปเอกสารยืนยันตัวตน แล้วตอบกลับเป็น JSON เท่านั้น ห้ามมี markdown

ต้องการ field:
{
  "full_name": "",
  "id_card": "",
  "address": "",
  "province": "",
  "district": "",
  "subdistrict": "",
  "confidence": 0,
  "raw_text": ""
}

กติกา:
- ถ้าอ่านไม่ได้ให้ใส่ค่าว่าง
- id_card ให้คืนเฉพาะตัวเลข
- confidence 0 ถึง 1
- raw_text คือข้อความทั้งหมดที่อ่านได้แบบย่อ
`

    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
      }
    )

    const geminiJson = await geminiRes.json()

    if (!geminiRes.ok) {
      const readable = getGeminiErrorMessage(geminiJson)
      console.error('[ocr-identity] Gemini failed', geminiRes.status, geminiJson)
      return res.status(500).json({ error: readable, status: geminiRes.status, detail: geminiJson })
    }

    const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const result = safeJsonParse(text)
    return res.status(200).json(result)
  } catch (error: any) {
    console.error('[ocr-identity]', error)
    return res.status(500).json({ error: error?.message ?? 'OCR failed' })
  }
}
