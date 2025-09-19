export function cropCanvas(
  canvas: OffscreenCanvas,
  {
    y,
    height,
    margin,
    isFirstPage,
    isLastPage,
    pageHeight
  }: {
    y: number
    height: number
    margin: number
    isFirstPage: boolean
    isLastPage: boolean
    pageHeight: number
  }
): OffscreenCanvas {
  const topMargin = isFirstPage ? 0 : margin
  const drawOffsetY = topMargin

  const cv = new OffscreenCanvas(canvas.width, pageHeight)

  const ctx = cv.getContext('2d', {
    alpha: true,
    desynchronized: true,
    willReadFrequently: true,
    colorType: 'float16',
    colorSpace: 'display-p3'
  })!

  ctx.fillStyle = 'white'
  ctx.filter = 'none'
  ctx.fillRect(0, 0, cv.width, cv.height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

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

  return cv
}
