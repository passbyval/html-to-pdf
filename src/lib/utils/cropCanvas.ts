export function cropCanvas(
  sourceCanvases: OffscreenCanvas[],
  y: number,
  height: number
): OffscreenCanvas[] {
  return sourceCanvases.map((canvas) => {
    const cv = new OffscreenCanvas(canvas.width, height)

    const ctx = cv.getContext('2d', {
      desynchronized: true,
      willReadFrequently: true,
      colorType: 'float16'
    })!

    // Fill the background with white
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, cv.width, cv.height)

    const drawableHeight = Math.min(height, canvas.height - y)

    // ✅ Draw into full-height canvas without stretching
    ctx.drawImage(
      canvas,
      0,
      y,
      canvas.width,
      drawableHeight, // source rect
      0,
      0,
      canvas.width,
      drawableHeight // destination rect: top-aligned
    )

    return cv
  })
}
