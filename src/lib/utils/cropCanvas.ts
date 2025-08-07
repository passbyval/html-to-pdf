export function cropCanvas(
  sourceCanvases: OffscreenCanvas[],
  {
    y,
    height,
    margin,
    isFirstPage,
    pageHeight
  }: {
    y: number
    height: number
    margin: number
    isFirstPage: boolean
    pageHeight: number
  }
): OffscreenCanvas[] {
  const topMargin = isFirstPage ? 0 : margin
  const drawOffsetY = topMargin

  return sourceCanvases.map((canvas) => {
    const cv = new OffscreenCanvas(canvas.width, pageHeight)

    const ctx = cv.getContext('2d', {
      desynchronized: true,
      willReadFrequently: true,
      colorType: 'float16'
    })!

    // Fill with white background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, cv.width, cv.height)

    const drawableHeight = Math.min(height, canvas.height - y)

    ctx.drawImage(
      canvas,
      0,
      y,
      canvas.width,
      drawableHeight, // source rect
      0,
      drawOffsetY,
      canvas.width,
      drawableHeight // dest rect, vertically offset by topMargin
    )

    return cv
  })
}
