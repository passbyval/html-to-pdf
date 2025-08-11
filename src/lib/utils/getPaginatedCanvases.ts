import { cropCanvas } from './cropCanvas'
import type { Worker } from 'tesseract.js'
import { DebugLogger, type LogLevel } from '../DebugLogger'

interface LineBox {
  top: number
  bottom: number
  confidence: number
}

export async function getPaginatedCanvases(
  [canvas, ocrCanvas]: [OffscreenCanvas, OffscreenCanvas],
  {
    pageHeight,
    margin,
    worker,
    debug = []
  }: {
    pageHeight: number
    margin: number
    worker: Worker
    debug?: LogLevel
  }
): Promise<[OffscreenCanvas, OffscreenCanvas][]> {
  const startTime = Date.now()
  const logger = DebugLogger.create(debug)

  const totalHeight = canvas.height
  const firstPageHeight = pageHeight - margin
  const subsequentPageHeight = pageHeight - margin * 2

  logger.info('Analyzing canvas for pagination', {
    canvasSize: `${canvas.width}x${totalHeight}`,
    pageHeight: `${pageHeight}px`,
    margin: `${margin}px`,
    firstPageHeight: `${firstPageHeight}px`,
    subsequentPageHeight: `${subsequentPageHeight}px`
  })

  logger.time('Performing OCR analysis for line detection', 'debug')

  const { data } = await worker.recognize(ocrCanvas, {}, { blocks: true })

  logger.timeEnd('Performing OCR analysis for line detection', 'debug')

  const allLines: LineBox[] = (data.blocks ?? []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.map((line) => ({
        top: line.bbox.y0,
        bottom: line.bbox.y1,
        confidence: line.confidence
      }))
    )
  )

  logger.debug('Line detection completed', {
    blocksFound: data.blocks?.length || 0,
    linesFound: allLines.length,
    averageConfidence:
      allLines.length > 0
        ? Math.round(
            allLines.reduce((sum, line) => sum + line.confidence, 0) /
              allLines.length
          )
        : 0
  })

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

    if (lineAtCut) {
      logger.verbose('Adjusted cut point to avoid splitting line', {
        proposedCut: Math.round(proposedCut),
        adjustedCut: Math.round(safeCut),
        lineConfidence: Math.round(lineAtCut.confidence)
      })
    }

    return safeCut === previousCut ? acc : [...acc, safeCut]
  }, [])

  logger.info('Page cuts calculated', {
    totalPages: cutPoints.length - 1,
    cuts: cutPoints.map((cut) => `${Math.round(cut)}px`).join(', '),
    analysisTime: `${Date.now() - startTime}ms`
  })

  logger.debug('Cropping canvases into pages')
  const results = cutPoints.slice(1).map((cut, i) => {
    const startY = cutPoints[i]
    const height = cut - startY
    const isFirstPage = i === 0

    logger.verbose(`Creating page ${i + 1}`, {
      startY: Math.round(startY),
      height: Math.round(height),
      isFirstPage,
      pageSize: `${canvas.width}x${Math.round(height)}`
    })

    return cropCanvas([canvas, ocrCanvas], {
      y: startY,
      height,
      margin,
      isFirstPage,
      pageHeight,
      debug
    }) as [OffscreenCanvas, OffscreenCanvas]
  })

  const paginationTime = Date.now() - startTime

  logger.info('Canvas pagination completed', {
    pages: results.length,
    duration: `${paginationTime}ms`,
    avgPageHeight:
      results.length > 0
        ? `${Math.round(results.reduce((sum, [canvas]) => sum + canvas.height, 0) / results.length)}px`
        : 'N/A'
  })

  return results
}
