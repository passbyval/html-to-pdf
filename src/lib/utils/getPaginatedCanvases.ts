import { cropCanvas } from './cropCanvas'
import { range } from './range'

export async function getPaginatedCanvases(
  canvas: OffscreenCanvas,
  ocrCanvas: OffscreenCanvas,
  pageHeight: number,
  margin: number
): Promise<[OffscreenCanvas, OffscreenCanvas][]> {
  const totalHeight = canvas.height

  const firstPageHeight = pageHeight - margin
  const subsequentPageHeight = pageHeight - margin * 2
  const remainingHeight = totalHeight - firstPageHeight

  const pageCount =
    1 + Math.max(0, Math.ceil(remainingHeight / subsequentPageHeight))

  return Promise.all(
    range(pageCount).map((index) => {
      const isFirstPage = index === 0

      const y = isFirstPage
        ? 0
        : firstPageHeight + (index - 1) * subsequentPageHeight

      return cropCanvas([canvas, ocrCanvas], {
        y,
        height: isFirstPage ? firstPageHeight : subsequentPageHeight,
        margin,
        isFirstPage,
        pageHeight
      }) as [OffscreenCanvas, OffscreenCanvas]
    })
  )
}
