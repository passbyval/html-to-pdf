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
    logger?.verbose('No words found in line', { lineText: line.text })
    return
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

    logger?.verbose(`Processing word: "${text}"`, {
      confidence,
      x0: bbox.x0,
      y0: bbox.y0,
      x1: bbox.x1,
      y1: bbox.y1,
      width: bbox.x1 - bbox.x0,
      height: bbox.y1 - bbox.y0
    })

    const calculations = {
      x: bbox.x0 * ratio,
      y0: line.baseline.y0 * ratio,
      y1: line.baseline.y1 * ratio,
      wordWidth: (bbox.x1 - bbox.x0) * ratio,
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

      doc.rect(
        bbox.x0 * ratio,
        bbox.y0 * ratio,
        (bbox.x1 - bbox.x0) * ratio,
        (bbox.y1 - bbox.y0) * ratio
      )
    }

    return {
      word: text,
      charSpace: positioning.charSpace,
      confidence,
      processed: true
    }
  })

  const summary = wordProcessingResults.reduce(
    (acc, result) => ({
      processedWords: acc.processedWords + (result.processed ? 1 : 0),
      totalCharSpace: acc.totalCharSpace + result.charSpace
    }),
    { processedWords: 0, totalCharSpace: 0 }
  )

  logger?.info('Line processing completed', {
    wordsProcessed: summary.processedWords,
    averageCharSpace:
      summary.processedWords > 0
        ? summary.totalCharSpace / summary.processedWords
        : 0,
    lineConfidence: line.confidence,
    fontSize
  })
}
