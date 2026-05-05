export type ImagePreprocessOptions = {
  /** Longest output side in pixels. */
  maxSide?: number
  /** JPEG/WebP quality from 0 to 1. */
  quality?: number
  /** Output mime type. */
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp'
  /** Crop center area before resize. Useful when the card is centered in the photo. */
  centerCrop?: boolean
  /** Target crop aspect ratio. Thai ID card is close to 85.6:54 = 1.586. */
  cropAspectRatio?: number
  /** Extra border kept around the center crop. 0.08 = keep 8% more area. */
  cropPaddingRatio?: number
}

export type ProcessedImage = {
  file: File
  base64: string
  dataUrl: string
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  originalSize: number
  size: number
}

const DEFAULT_OPTIONS: Required<ImagePreprocessOptions> = {
  maxSide: 1280,
  quality: 0.82,
  mimeType: 'image/jpeg',
  centerCrop: true,
  cropAspectRatio: 85.6 / 54,
  cropPaddingRatio: 0.1,
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('แปลงรูปไม่สำเร็จ'))),
      mimeType,
      quality,
    )
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function getCenteredCardCrop(width: number, height: number, aspectRatio: number, paddingRatio: number) {
  const paddedAspectRatio = aspectRatio * (1 + Math.max(0, paddingRatio))
  let cropWidth = width
  let cropHeight = cropWidth / paddedAspectRatio

  if (cropHeight > height) {
    cropHeight = height
    cropWidth = cropHeight * paddedAspectRatio
  }

  return {
    sx: Math.max(0, (width - cropWidth) / 2),
    sy: Math.max(0, (height - cropHeight) / 2),
    sw: Math.min(width, cropWidth),
    sh: Math.min(height, cropHeight),
  }
}

function getResizedSize(width: number, height: number, maxSide: number) {
  const longestSide = Math.max(width, height)
  if (longestSide <= maxSide) return { width: Math.round(width), height: Math.round(height) }
  const scale = maxSide / longestSide
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

function getFileName(file: File, mimeType: string) {
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image'
  return `${baseName}-ocr.${ext}`
}

export async function preprocessImageForOcr(
  file: File,
  options: ImagePreprocessOptions = {},
): Promise<ProcessedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const bitmap = await createImageBitmap(file)
  const sourceCrop = opts.centerCrop
    ? getCenteredCardCrop(bitmap.width, bitmap.height, opts.cropAspectRatio, opts.cropPaddingRatio)
    : { sx: 0, sy: 0, sw: bitmap.width, sh: bitmap.height }

  const resized = getResizedSize(sourceCrop.sw, sourceCrop.sh, opts.maxSide)
  const canvas = document.createElement('canvas')
  canvas.width = resized.width
  canvas.height = resized.height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('เปิดตัวประมวลผลรูปไม่สำเร็จ')

  ctx.drawImage(
    bitmap,
    sourceCrop.sx,
    sourceCrop.sy,
    sourceCrop.sw,
    sourceCrop.sh,
    0,
    0,
    resized.width,
    resized.height,
  )
  bitmap.close?.()

  const blob = await canvasToBlob(canvas, opts.mimeType, opts.quality)
  const dataUrl = await blobToDataUrl(blob)
  const processedFile = new File([blob], getFileName(file, opts.mimeType), {
    type: opts.mimeType,
    lastModified: Date.now(),
  })

  return {
    file: processedFile,
    base64: dataUrl.split(',')[1] ?? '',
    dataUrl,
    width: resized.width,
    height: resized.height,
    originalWidth: bitmap.width,
    originalHeight: bitmap.height,
    originalSize: file.size,
    size: blob.size,
  }
}

export async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await blobToDataUrl(file)
  return dataUrl.split(',')[1] ?? ''
}
