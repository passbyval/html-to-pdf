import { DebugLogger, type LogLevel } from '../DebugLogger'

export function transferBitmapToCanvas(
  bitmap: ImageBitmap,
  debug: LogLevel,
  width = bitmap.width,
  height = bitmap.height
) {
  const logger = DebugLogger.create(debug)

  logger.debug('Transferring bitmap to canvas')

  logger.verbose('Bitmap transfer started', {
    bitmapSize: `${bitmap.width}x${bitmap.height}`,
    targetSize: `${width}x${height}`,
    sizeMatch: width === bitmap.width && height === bitmap.height
  })

  const canvas = new OffscreenCanvas(width, height)

  const ctx =
    canvas.getContext('bitmaprenderer', {
      alpha: true,
      desynchronized: true,
      willReadFrequently: false,
      colorType: 'float16',
      colorSpace: 'display-p3'
    }) ??
    canvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
      willReadFrequently: true,
      colorType: 'float16',
      colorSpace: 'display-p3'
    })

  if (ctx instanceof ImageBitmapRenderingContext) {
    ctx?.transferFromImageBitmap(bitmap)
    logger.verbose('Used ImageBitmapRenderingContext for optimal transfer')
  } else if (ctx instanceof CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    ctx?.drawImage(bitmap, 0, 0)
    logger.verbose('Fallback to 2D context for bitmap transfer')
  }

  bitmap.close()

  logger.debug('Bitmap transfer completed')

  return [canvas, ctx] as const
}
