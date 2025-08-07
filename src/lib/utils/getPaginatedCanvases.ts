import { cropCanvas } from './cropCanvas'
import { createTesseractWorker } from '../workers/createTesseractWorker'
import { chain } from './chain'

interface LineBox {
  top: number
  bottom: number
  confidence: number
}

export async function getPaginatedCanvases(
  canvas: OffscreenCanvas,
  ocrCanvas: OffscreenCanvas,
  pageHeight: number,
  margin: number,
  customWords: string
): Promise<[OffscreenCanvas, OffscreenCanvas][]> {
  const totalHeight = canvas.height
  const firstPageHeight = pageHeight - margin
  const subsequentPageHeight = pageHeight - margin * 2

  const [worker, { data }] = await chain(
    () => createTesseractWorker(customWords),
    (worker) => worker.recognize(ocrCanvas, {}, { blocks: true })
  )

  await worker.terminate()

  const allLines: LineBox[] = (data.blocks ?? []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.map((line) => ({
        top: line.bbox.y0,
        bottom: line.bbox.y1,
        confidence: line.confidence
      }))
    )
  )

  const cutPoints = allLines.reduce<number[]>((acc, _, i) => {
    if (i === 0) return [0]

    const isFirstPage = acc.length === 1
    const previousCut = acc[acc.length - 1]
    const targetHeight = isFirstPage ? firstPageHeight : subsequentPageHeight
    const proposedCut = previousCut + targetHeight

    if (proposedCut >= totalHeight) {
      return previousCut === totalHeight ? acc : [...acc, totalHeight]
    }

    const lineAtCut = allLines.find(
      (line) => line.top < proposedCut && line.bottom > proposedCut
    )

    const safeCut = lineAtCut ? lineAtCut.bottom : proposedCut

    // Avoid duplicate cuts
    return safeCut === previousCut ? acc : [...acc, safeCut]
  }, [])

  const results = cutPoints.slice(1).map((cut, i) => {
    const startY = cutPoints[i]
    const height = cut - startY
    const isFirstPage = i === 0

    return cropCanvas([canvas, ocrCanvas], {
      y: startY,
      height,
      margin,
      isFirstPage,
      pageHeight
    }) as [OffscreenCanvas, OffscreenCanvas]
  })

  return results
}
