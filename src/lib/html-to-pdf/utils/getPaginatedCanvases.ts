import { cropCanvas } from './cropCanvas'
import { DebugLogger, type LogLevel } from '../DebugLogger'
import { getDimensions } from './getDimensions'
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
  const startTime = Date.now()
  const logger = DebugLogger.create(debug)
  const { height: totalHeight } = canvas
  const firstPageHeight = pageHeight - margin
  const subsequentPageHeight = pageHeight - margin * 2

  const pageCount =
    1 + Math.ceil((totalHeight - firstPageHeight) / subsequentPageHeight)

  console.info('Calculated page count', {
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
        : firstPageHeight + subsequentPageHeight * (pageNumber - 1) + 1

      console.log(`PAGE ${pageNumber + 1} CROPPING DEBUG:`, {
        pageNumber: pageNumber + 1,
        cropStartY: y,
        cropHeight: height,
        isFirstPage,
        totalCanvasHeight: totalHeight
      })

      const croppedCanvas = cropCanvas(canvas, {
        y,
        height,
        margin,
        isFirstPage,
        pageHeight,
        debug
      })

      // Calculate ratio for THIS specific cropped canvas
      const { ratio } = getDimensions(croppedCanvas, {
        width: pdfWidth,
        height: pdfHeight
      })

      const pageTextNodes = textNodes
        .filter(({ y: top, height: h }) => {
          const nodeTop = top
          const nodeBottom = nodeTop + h
          const pageBottom = y + height

          return !(nodeBottom <= y || nodeTop >= pageBottom)
        })
        .map((node, textIndex) => {
          const originalY = node.y
          const adjustedY = node.y - y + (isFirstPage ? 0 : margin * ratio)

          if (textIndex < 3) {
            console.log(`  Text ${textIndex}: "${node.text.slice(0, 15)}"`, {
              originalY,
              cropStartY: y,
              marginAdjustment: isFirstPage ? 0 : margin * ratio,
              adjustedY,
              shouldBeWithinCanvas: adjustedY < croppedCanvas.height,
              ratio
            })
          }

          return {
            ...node,
            y: adjustedY
          }
        })
        .sort((a, b) => a.y - b.y)

      console.log(`PAGE ${pageNumber + 1} FINAL:`, {
        croppedCanvasSize: `${croppedCanvas.width}x${croppedCanvas.height}`,
        ratio: ratio.toFixed(3),
        textNodesCount: pageTextNodes.length,
        firstTextY: pageTextNodes[0]?.y,
        lastTextY: pageTextNodes[pageTextNodes.length - 1]?.y
      })

      return [...acc, [croppedCanvas, pageTextNodes]]
    },
    []
  )
}
