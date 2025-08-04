export function cropCanvas(
  sourceCanvases: HTMLCanvasElement[],
  y: number,
  height: number
): HTMLCanvasElement[] {
  return sourceCanvases.map((canvas) => {
    const cv = document.createElement('canvas')

    const ctx = cv.getContext('2d', {
      desynchronized: true,
      willReadFrequently: true,
      colorType: 'float16'
    })!

    cv.style.paddingTop = '20px'

    cv.width = canvas.width
    cv.height = height

    ctx.drawImage(
      canvas,
      0,
      y,
      canvas.width,
      height,
      0,
      0,
      canvas.width,
      height
    )

    return cv
  })
}
