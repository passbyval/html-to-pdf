import { cropCanvas } from './cropCanvas'
import { range } from './range'

export async function getPaginatedCanvases(
  canvas: OffscreenCanvas,
  ocrCanvas: OffscreenCanvas,
  pageHeight: number
): Promise<[OffscreenCanvas, OffscreenCanvas][]> {
  const pageCount = Math.ceil(canvas.height / pageHeight)

  return await Promise.all(
    range(pageCount).map((_, i) => {
      const y = i * pageHeight

      return cropCanvas([canvas, ocrCanvas], y, pageHeight) as [
        OffscreenCanvas,
        OffscreenCanvas
      ]
    })
  )
}
