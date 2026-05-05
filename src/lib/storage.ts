import { supabase, isSupabaseReady } from './supabase'
import { preprocessImageForOcr } from './imagePreprocess'

const BUCKET = 'farm-photos'
const STORAGE_MAX_SIDE = 1600
const STORAGE_QUALITY = 0.82
const MAX_UPLOAD_BYTES = 1_800_000

async function prepareImageForStorage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  try {
    const processed = await preprocessImageForOcr(file, {
      centerCrop: false,
      maxSide: STORAGE_MAX_SIDE,
      quality: STORAGE_QUALITY,
      mimeType: 'image/jpeg',
    })

    if (processed.file.size > MAX_UPLOAD_BYTES) {
      const smaller = await preprocessImageForOcr(file, {
        centerCrop: false,
        maxSide: 1280,
        quality: 0.74,
        mimeType: 'image/jpeg',
      })
      console.info('[storage] compressed image:', file.size, '→', smaller.file.size)
      return smaller.file
    }

    console.info('[storage] compressed image:', file.size, '→', processed.file.size)
    return processed.file
  } catch (err) {
    console.warn('[storage] image compression skipped:', err)
    return file
  }
}

function makeUploadPath(prefix: string, originalName: string) {
  const safeExt = originalName.split('.').pop()?.toLowerCase()
  const ext = safeExt && ['jpg', 'jpeg', 'png', 'webp'].includes(safeExt) ? safeExt : 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  return `${prefix}/${fileName}`
}

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

  const uploadFile = await prepareImageForStorage(file)
  const path = makeUploadPath(`farmers/${farmerId}`, uploadFile.name)

  console.info('[storage] uploading to', BUCKET, path)

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, uploadFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: uploadFile.type || 'image/jpeg',
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

  const uploadFile = await prepareImageForStorage(file)
  const path = makeUploadPath(`no-burn/${farmerId}/${photoType}`, uploadFile.name)

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, uploadFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: uploadFile.type || 'image/jpeg',
    })

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

  const uploadFile = await prepareImageForStorage(file)
  const path = makeUploadPath(`planting/${farmerId}/${cycleId}/${stepKey}`, uploadFile.name)

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, uploadFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: uploadFile.type || 'image/jpeg',
    })

  if (error) {
    console.error('[storage] planting upload error:', error.message)
    throw new Error(`อัปโหลดรูปการปลูกไม่สำเร็จ: ${error.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path)

  return urlData.publicUrl
}
