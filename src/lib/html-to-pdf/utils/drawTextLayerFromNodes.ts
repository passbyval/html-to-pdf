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
  logger
}: DrawTextLayerOptions): void {
  const startTime = Date.now()

  logger?.info('Drawing text layer from extracted nodes', {
    totalNodes: textNodes.length,
    canvasSize: `${canvasWidth}x${canvasHeight}`,
    ratio: (ratio * 1000) / 1000
  })

  const { width: pdfWidth, height: pdfHeight } = doc.internal.pageSize

  const scaleX = pdfWidth / canvasWidth
  const scaleY = pdfHeight / canvasHeight

  const processedNodes = textNodes.map((textNode) => {
    const { text, x: canvasX, y: canvasY, width: wordWidth, height } = textNode

    const pdfX = canvasX * scaleX
    const pdfY = canvasY * scaleY
    const pdfFontSize = height * scaleX

    doc.setFontSize(pdfFontSize)

    const charCount = text.length - 1
    const jspdfWidth = doc.getTextWidth(text)

    const charSpace =
      charCount > 0 ? (wordWidth * scaleX - jspdfWidth) / charCount : 0

    doc.text(text, pdfX, pdfY, {
      baseline: 'top',
      align: 'left',
      renderingMode: 'invisible',
      charSpace
    })

    return {
      text,
      pdfX: (pdfX * 100) / 100,
      pdfY: (pdfY * 100) / 100,
      fontSize: (pdfFontSize * 10) / 10
    }
  })

  const processingTime = Date.now() - startTime

  const summaryStats = {
    totalProcessed: processedNodes.length,
    duration: `${processingTime}ms`
  }

  logger?.info('Text layer drawing completed', summaryStats)
}
