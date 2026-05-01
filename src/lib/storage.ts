import { supabase, isSupabaseReady } from './supabase'

const BUCKET = 'farm-photos'

/**
 * อัปโหลดรูปแปลงไปยัง Supabase Storage bucket: farm-photos
 * path: farmers/{farmerId}/{timestamp}-{random}.{ext}
 * คืนค่า public URL หรือ null ถ้าไม่มี Supabase
 */
export async function uploadFarmPhoto(
  file: File,
  farmerId: string
): Promise<string | null> {
  if (!supabase || !isSupabaseReady) {
    console.info('[storage] mock mode — ไม่ได้อัปโหลดรูปจริง')
    return null
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const path = `farmers/${farmerId}/${fileName}`

  console.info('[storage] uploading to', BUCKET, path)

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    })

  if (error) {
    console.error('[storage] upload error:', error.message)
    throw new Error(`อัปโหลดรูปไม่สำเร็จ: ${error.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path)

  console.info('[storage] uploaded:', urlData.publicUrl)
  return urlData.publicUrl
}

/**
 * อัปโหลดรูปไม่เผา (no-burn evidence)
 * path: no-burn/{farmerId}/{type}/{timestamp}.{ext}
 */
export async function uploadNoBurnPhoto(
  file: File,
  farmerId: string,
  photoType: 'before_harvest' | 'after_harvest' | 'field_condition'
): Promise<string | null> {
  if (!supabase || !isSupabaseReady) {
    console.info('[storage] mock mode — no-burn photo skipped')
    return null
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const path = `no-burn/${farmerId}/${photoType}/${fileName}`

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) {
    console.error('[storage] no-burn upload error:', error.message)
    throw new Error(`อัปโหลดรูปไม่เผาไม่สำเร็จ: ${error.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

/**
 * อัปโหลดรูปแจ้งปลูก
 * path: planting/{farmerId}/{cycleId}/{stepKey}/{timestamp}.{ext}
 */
export async function uploadPlantingPhoto(
  file: File,
  farmerId: string,
  cycleId: string,
  stepKey: string
): Promise<string | null> {
  if (!supabase || !isSupabaseReady) {
    console.info('[storage] mock mode — planting photo skipped')
    return null
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const path = `planting/${farmerId}/${cycleId}/${stepKey}/${fileName}`

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) {
    console.error('[storage] planting upload error:', error.message)
    throw new Error(`อัปโหลดรูปการปลูกไม่สำเร็จ: ${error.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path)

  return urlData.publicUrl
}
