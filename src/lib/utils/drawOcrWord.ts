import type jsPDF from 'jspdf'
import { DebugLogger, type IDebugOptions } from '../DebugLogger'

export function drawOcrWord(
  doc: jsPDF,
  line: Tesseract.Line,
  fontSize: number,
  ratio: number,
  options: {
    debug?: IDebugOptions
    logger?: DebugLogger
  } = {}
): void {
  const { debug = false, logger } = options

  if (!line.words) {
    return logger?.verbose('No words found in line', { lineText: line.text })
  }

  logger?.debug(`Processing line with ${line.words.length} words`, {
    lineText: line.text,
    confidence: line.confidence,
    fontSize,
    ratio
  })

  doc.setFontSize(fontSize)

  const wordProcessingResults = line.words.map((word) => {
    const { text, bbox, confidence } = word
    const { x0, y0, x1, y1 } = bbox

    logger?.verbose(`Processing word: "${text}"`, {
      confidence,
      x0,
      y0,
      y1,
      width: x1 - x0,
      height: y1 - y0
    })

    const calculations = {
      x: x0 * ratio,
      y0: line.baseline.y0 * ratio,
      y1: line.baseline.y1 * ratio,
      wordWidth: (x1 - x0) * ratio,
      jspdfWidth: doc.getTextWidth(text),
      charCount: text.length - 1
    }

    const positioning = {
      ...calculations,
      y: (calculations.y0 + calculations.y1) / 2,
      charSpace:
        calculations.charCount > 0
          ? (calculations.wordWidth - calculations.jspdfWidth) /
            calculations.charCount
          : 0
    }

    logger?.verbose('Word positioning calculated', {
      word: text,
      x: Math.round(positioning.x),
      y: Math.round(positioning.y),
      wordWidth: Math.round(positioning.wordWidth),
      jspdfWidth: Math.round(positioning.jspdfWidth),
      charSpace: Math.round(positioning.charSpace * 100) / 100,
      charCount: calculations.charCount
    })

    doc.text(text, positioning.x, positioning.y, {
      charSpace: positioning.charSpace
    })

    if (Array.isArray(debug) && debug.includes('debug')) {
      logger?.debug(`Drawing debug rectangle for word: "${text}"`)

      doc.setDrawColor(255, 0, 0)
      doc.setLineWidth(0.25)

      doc.rect(x0 * ratio, y0 * ratio, (x1 - x0) * ratio, (y1 - y0) * ratio)
    }

    return {
      word: text,
      charSpace: positioning.charSpace,
      confidence,
      processed: true
    }
  })

  const { processedWords, totalCharSpace } = wordProcessingResults.reduce(
    ({ processedWords, totalCharSpace }, result) => ({
      processedWords: processedWords + (result.processed ? 1 : 0),
      totalCharSpace: totalCharSpace + result.charSpace
    }),
    { processedWords: 0, totalCharSpace: 0 }
  )

  logger?.info('Line processing completed', {
    wordsProcessed: processedWords,
    averageCharSpace: processedWords > 0 ? totalCharSpace / processedWords : 0,
    lineConfidence: line.confidence,
    fontSize
  })
}
