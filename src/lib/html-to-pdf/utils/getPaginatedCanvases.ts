import { DebugLogger, type LogLevel } from '../DebugLogger'
import { cropCanvas } from './cropCanvas'
import type { ITextNode } from './getTextNodes'
import { range } from './range'

export function getPaginatedCanvases(
  canvas: OffscreenCanvas,
  textNodes: ITextNode[],
  {
    pageHeight,
    margin,
    debug,
    pdfWidth,
    pdfHeight
  }: {
    pageHeight: number
    margin: number
    debug?: LogLevel
    pdfWidth: number
    pdfHeight: number
  }
): [OffscreenCanvas, ITextNode[]][] {
  const logger = DebugLogger.create(debug)

  const { height: totalHeight } = canvas
  const firstPageHeight = pageHeight - margin
  const subsequentPageHeight = pageHeight - margin * 2

  const pageCount =
    1 + Math.ceil((totalHeight - firstPageHeight) / subsequentPageHeight)

  logger.info('Calculated page count', {
    pageCount,
    totalHeight,
    firstPageHeight,
    subsequentPageHeight
  })

  return range(pageCount).reduce<[OffscreenCanvas, ITextNode[]][]>(
    (acc, pageNumber) => {
      const isFirstPage = pageNumber === 0
      const height = isFirstPage ? firstPageHeight : subsequentPageHeight

      const y = isFirstPage
        ? 0
        : firstPageHeight + subsequentPageHeight * (pageNumber - 1)

      const croppedCanvas = cropCanvas(canvas, {
        y,
        height,
        margin,
        isFirstPage,
        isLastPage: pageNumber + 1 === pageCount,
        pageHeight
      })

      const pageTextNodes = textNodes.reduce((acc, node) => {
        const { y: nodeTop, height: nodeHeight, text } = node

        const nodeBottom = nodeTop + nodeHeight
        const pageBottom = y + height
        const isOnPage = nodeTop >= y && nodeBottom <= pageBottom + nodeHeight

        if (!isOnPage) return acc

        return [
          ...acc,
          {
            ...node,
            y: nodeTop - y + (isFirstPage ? 0 : margin)
          }
        ]
      }, [] as ITextNode[])

      return [...acc, [croppedCanvas, pageTextNodes]]
    },
    []
  )
}
