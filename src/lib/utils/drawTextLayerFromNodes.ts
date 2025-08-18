import type jsPDF from 'jspdf'
import { DebugLogger, type LogLevel } from '../DebugLogger'
import type { ITextNode } from './getTextNodes'

interface DrawTextLayerOptions {
  doc: jsPDF
  textNodes: ITextNode[]
  canvasWidth: number
  canvasHeight: number
  ratio: number
  debug: LogLevel
  logger?: DebugLogger
}

export function drawTextLayerFromNodes({
  doc,
  textNodes,
  canvasWidth,
  canvasHeight,
  ratio,
  debug,
  logger
}: DrawTextLayerOptions): void {
  const startTime = Date.now()

  logger?.info('Drawing text layer from extracted nodes', {
    totalNodes: textNodes.length,
    canvasSize: `${canvasWidth}x${canvasHeight}`,
    ratio: Math.round(ratio * 1000) / 1000
  })

  const { width: pdfWidth, height: pdfHeight } = doc.internal.pageSize
  const scaleX = pdfWidth / canvasWidth
  const scaleY = pdfHeight / canvasHeight

  const processedNodes = textNodes.map((textNode, index) => {
    const {
      text,
      x: canvasX,
      y: canvasY,
      fontSize: originalFontSize,
      height: originalDOMHeight
    } = textNode

    const pdfX = canvasX * scaleX
    const pdfY = canvasY * scaleY
    const pdfFontSize = originalFontSize * scaleX

    doc.setFontSize(pdfFontSize)

    doc.text(text, pdfX, pdfY, {
      baseline: 'top',
      align: 'left',
      renderingMode: 'invisible'
    })

    return {
      text,
      pdfX: Math.round(pdfX * 100) / 100,
      pdfY: Math.round(pdfY * 100) / 100,
      fontSize: Math.round(pdfFontSize * 10) / 10
    }
  })

  const processingTime = Date.now() - startTime

  const summaryStats = {
    totalProcessed: processedNodes.length,
    avgFontSize:
      processedNodes.length > 0
        ? Math.round(
            (processedNodes.reduce((sum, node) => sum + node.fontSize, 0) /
              processedNodes.length) *
              10
          ) / 10
        : 0,
    positionRange:
      processedNodes.length > 0
        ? {
            minX: Math.min(...processedNodes.map((n) => n.pdfX)),
            maxX: Math.max(...processedNodes.map((n) => n.pdfX)),
            minY: Math.min(...processedNodes.map((n) => n.pdfY)),
            maxY: Math.max(...processedNodes.map((n) => n.pdfY))
          }
        : null,
    duration: `${processingTime}ms`
  }

  logger?.info('Text layer drawing completed', summaryStats)

  if (Array.isArray(debug) && debug.includes('verbose')) {
    const debugTable = processedNodes.slice(0, 10).map((node, i) => ({
      index: i + 1,
      text:
        node.text.length > 20 ? `${node.text.substring(0, 20)}...` : node.text,
      x: node.pdfX,
      y: node.pdfY,
      fontSize: node.fontSize
    }))

    logger?.table(debugTable)

    if (processedNodes.length > 10) {
      logger?.info(`... and ${processedNodes.length - 10} more nodes`)
    }
  }
}
