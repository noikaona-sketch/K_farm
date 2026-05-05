export type ImageProcessOptions = {
  maxWidth?: number
  quality?: number
  cropToIdCard?: boolean
}

const ID_CARD_RATIO = 85.6 / 53.98

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('โหลดรูปไม่สำเร็จ'))
    }
    img.src = url
  })
}

function getCenterCrop(width: number, height: number, targetRatio: number) {
  const currentRatio = width / height
  let cropWidth = width
  let cropHeight = height

  if (currentRatio > targetRatio) {
    cropWidth = height * targetRatio
  } else {
    cropHeight = width / targetRatio
  }

  return {
    sx: Math.max(0, (width - cropWidth) / 2),
    sy: Math.max(0, (height - cropHeight) / 2),
    sw: cropWidth,
    sh: cropHeight,
  }
}

export async function prepareImageForOcr(
  file: File,
  options: ImageProcessOptions = {}
): Promise<File> {
  const maxWidth = options.maxWidth ?? 1200
  const quality = options.quality ?? 0.72
  const cropToIdCard = options.cropToIdCard ?? true

  const img = await loadImage(file)
  const crop = cropToIdCard
    ? getCenterCrop(img.width, img.height, ID_CARD_RATIO)
    : { sx: 0, sy: 0, sw: img.width, sh: img.height }

  const scale = Math.min(1, maxWidth / crop.sw)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return file

  canvas.width = Math.round(crop.sw * scale)
  canvas.height = Math.round(crop.sh * scale)

  ctx.drawImage(
    img,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    0,
    0,
    canvas.width,
    canvas.height
  )

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  )

  if (!blob) return file
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '-ocr.jpg', {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })
}

export async function compressImage(file: File): Promise<File> {
  return prepareImageForOcr(file, { cropToIdCard: false })
}
