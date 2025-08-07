import { cropCanvas } from './cropCanvas'
import { range } from './range'
import { createTesseractWorker } from '../workers/createTesseractWorker'
import { debugOcrCanvas } from '../debug/debugOcrCanvas'

export async function getPaginatedCanvases(
  canvas: OffscreenCanvas,
  ocrCanvas: OffscreenCanvas,
  pageHeight: number,
  margin: number,
  debug: boolean = true
): Promise<[OffscreenCanvas, OffscreenCanvas][]> {
  const totalHeight = canvas.height

  const firstPageHeight = pageHeight - margin
  const subsequentPageHeight = pageHeight - margin * 2
  const remainingHeight = totalHeight - firstPageHeight

  const pageCount =
    1 + Math.max(0, Math.ceil(remainingHeight / subsequentPageHeight))

  return Promise.all(
    range(pageCount).map(async (index) => {
      const isFirstPage = index === 0

      const y = isFirstPage
        ? 0
        : firstPageHeight + (index - 1) * subsequentPageHeight

      const height = isFirstPage ? firstPageHeight : subsequentPageHeight

      const worker = await createTesseractWorker()

      const { height: maxHeight } = ocrCanvas

      /**
       * Clamps the Y coordinate so it stays within the vertical bounds of the canvas.
       * This prevents attempting to read pixel data outside of the valid range.
       */
      const clampedY = Math.max(0, Math.min(y, maxHeight))

      /**
       * Calculates the height of the rectangle without exceeding canvas bounds.
       * Ensures that the total region stays within the visible area.
       */
      const clampedHeight = Math.max(1, Math.min(height, maxHeight - clampedY))

      /**
       * Defines the rectangle region to extract from the canvas.
       * - Width is set to canvas width minus 1 due to a known Tesseract.js quirk. See issue {@link https://github.com/naptha/tesseract.js/issues/936 #936}
       * - Height is clamped to avoid reading out-of-bounds pixel data.
       */
      const rectangle = {
        top: clampedY,
        left: 0,
        width: Math.max(1, ocrCanvas.width - 1),
        height: clampedHeight - 1
      }

      const { data } = await worker.recognize(
        ocrCanvas,
        { rectangle },
        { blocks: true }
      )

      const lines = (data.blocks ?? [])
        .flatMap((block) =>
          block.paragraphs.flatMap((paragraph) =>
            paragraph.lines.map((line) => ({
              top: line.bbox.y0,
              bottom: line.bbox.y1,
              text: line.words.reduce((acc, w) => `${acc} ${w.text}`, ''),
              words: line.words
            }))
          )
        )
        .sort((a, b) => a.top - b.top)

      const mainCanvas = debug
        ? debugOcrCanvas({ canvas, ocrCanvas, rectangle, index, lines })
        : canvas

      worker.terminate()

      return cropCanvas([mainCanvas, ocrCanvas], {
        y,
        height,
        margin,
        isFirstPage,
        pageHeight
      }) as [OffscreenCanvas, OffscreenCanvas]
    })
  )
}
