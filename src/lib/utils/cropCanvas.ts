import { DebugLogger, type IDebugOptions } from '../DebugLogger'

export function cropCanvas(
  sourceCanvases: OffscreenCanvas[],
  {
    y,
    height,
    margin,
    isFirstPage,
    pageHeight,
    debug = 'none'
  }: {
    y: number
    height: number
    margin: number
    isFirstPage: boolean
    pageHeight: number
    debug?: IDebugOptions
  }
): OffscreenCanvas[] {
  const logger = DebugLogger.create(debug)
  const topMargin = isFirstPage ? 0 : margin
  const drawOffsetY = topMargin

  logger.verbose('Cropping canvas section', {
    sourceCanvases: sourceCanvases.length,
    cropY: Math.round(y),
    cropheight: Math.round(height),
    pageHeight: Math.round(pageHeight),
    margin: Math.round(margin),
    isFirstPage,
    topMargin: Math.round(topMargin)
  })

  return sourceCanvases.map((canvas, index) => {
    const cv = new OffscreenCanvas(canvas.width, pageHeight)

    const ctx = cv.getContext('2d', {
      desynchronized: true,
      willReadFrequently: true,
      colorType: 'float16'
    })!

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, cv.width, cv.height)

    const drawableHeight = Math.min(height, canvas.height - y)

    ctx.drawImage(
      canvas,
      0,
      y,
      canvas.width,
      drawableHeight,
      0,
      drawOffsetY,
      canvas.width,
      drawableHeight
    )

    logger.verbose(`Canvas ${index + 1} cropped`, {
      sourceSize: `${canvas.width}x${canvas.height}`,
      targetSize: `${cv.width}x${cv.height}`,
      drawableHeight: Math.round(drawableHeight),
      offsetY: Math.round(drawOffsetY)
    })

    return cv
  })
}
