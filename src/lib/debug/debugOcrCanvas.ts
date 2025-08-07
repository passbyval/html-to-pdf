interface DebugOcrOptions {
  canvas: OffscreenCanvas
  ocrCanvas: OffscreenCanvas
  rectangle: { left: number; top: number; width: number; height: number }
  index: number
  lines: {
    text: string
    top: number
    bottom: number
    words?: { confidence?: number }[]
  }[]
}

export function debugOcrCanvas({
  canvas,
  ocrCanvas,
  rectangle,
  index,
  lines
}: DebugOcrOptions): OffscreenCanvas {
  const debugCanvas = new OffscreenCanvas(canvas.width, canvas.height)
  const ctx = debugCanvas.getContext('2d')!

  ctx.drawImage(canvas, 0, 0)

  const imageData = ctx.getImageData(
    rectangle.left,
    rectangle.top,
    rectangle.width,
    rectangle.height
  )

  console.log('Pixel sample:', imageData)

  ctx.save()

  // Draw red rectangle
  ctx.strokeStyle = 'red'
  ctx.lineWidth = 2
  ctx.strokeRect(
    rectangle.left + 0.5,
    rectangle.top + 0.5,
    rectangle.width - 1,
    rectangle.height - 1
  )

  // Draw blue label
  ctx.fillStyle = 'blue'
  ctx.font = '16px sans-serif'
  ctx.fillText(`Page ${index + 1}`, rectangle.left + 4, rectangle.top + 20)

  // Draw OCR line bounds
  ctx.strokeStyle = 'blue'
  ctx.lineWidth = 1
  lines.forEach((line) => {
    ctx.strokeRect(0, line.top, ocrCanvas.width, line.bottom - line.top)
  })

  ctx.restore()

  // Log line info
  console.group(`Page ${index + 1}`)
  lines.forEach((line, i) => {
    console.log(`Line ${i + 1}:`, {
      text: line.text,
      top: line.top,
      bottom: line.bottom,
      height: line.bottom - line.top
    })
  })

  console.log(
    lines.map(({ text, top, bottom, words }) => ({
      text,
      top,
      bottom,
      height: bottom - top,
      confidence: Math.round(
        (text.length &&
          text
            .split(' ')
            .map((_, i) => words?.[i]?.confidence || 0)
            .reduce((a, b) => a + b, 0)) / text.length
      )
    }))
  )

  console.groupEnd()

  return debugCanvas
}
