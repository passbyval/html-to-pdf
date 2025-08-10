import { DebugLogger, type IDebugOptions } from '../DebugLogger'

export function transferBitmapToCanvas(
  bitmap: ImageBitmap,
  width = bitmap.width,
  height = bitmap.height,
  debug: IDebugOptions = 'none'
) {
  const logger = DebugLogger.create(debug)

  logger.debug('Transferring bitmap to canvas')
  logger.verbose('Bitmap transfer started', {
    bitmapSize: `${bitmap.width}x${bitmap.height}`,
    targetSize: `${width}x${height}`,
    sizeMatch: width === bitmap.width && height === bitmap.height
  })

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('bitmaprenderer') ?? canvas.getContext('2d')

  if (ctx instanceof ImageBitmapRenderingContext) {
    ctx?.transferFromImageBitmap(bitmap)
    logger.verbose('Used ImageBitmapRenderingContext for optimal transfer')
  } else {
    ctx?.drawImage(bitmap, 0, 0)
    logger.verbose('Fallback to 2D context for bitmap transfer')
  }

  bitmap.close()

  logger.debug('Bitmap transfer completed')

  return [canvas, ctx] as const
}
