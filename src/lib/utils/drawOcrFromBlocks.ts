import type jsPDF from 'jspdf'
import { CONFIG } from '../config'
import type { RecognizeResult, Worker } from 'tesseract.js'
import { drawOcrWord } from '../utils/drawOcrWord'
import type { IOcrSettings } from '../useDocument/types'
import { DebugLogger, type IDebugOptions } from '../DebugLogger'

interface ProcessingState {
  totalLines: number
  processedLines: number
  skippedLines: number
  totalWords: number
  confidenceSum: number
  fontSizes: number[]
  confidences: number[]
}

const initialProcessingState: ProcessingState = {
  totalLines: 0,
  processedLines: 0,
  skippedLines: 0,
  totalWords: 0,
  confidenceSum: 0,
  fontSizes: [],
  confidences: []
}

export async function drawOcrFromBlocks({
  doc,
  worker,
  canvas,
  ratio,
  ocrSettings: { confidenceThreshold = CONFIG.OCR.CONFIDENCE_THRESHOLD },
  debug,
  logger
}: {
  doc: jsPDF
  worker: Worker
  canvas: HTMLCanvasElement | OffscreenCanvas
  ratio: number
  ocrSettings: Partial<IOcrSettings>
  debug: IDebugOptions
  logger?: DebugLogger
}): Promise<void> {
  const startTime = Date.now()

  logger?.info('Starting OCR recognition', {
    canvasType: canvas.constructor.name,
    dimensions: `${canvas.width}x${canvas.height}`,
    confidenceThreshold,
    ratio: Math.round(ratio * 1000) / 1000
  })

  const recognitionResult = await (async (): Promise<RecognizeResult> => {
    try {
      logger?.debug('OCR recognition started')
      logger?.time('OCR Recognition', 'debug')

      const result = await worker.recognize(canvas, {}, { blocks: true })

      logger?.timeEnd('OCR Recognition', 'debug')
      logger?.debug('OCR recognition completed', {
        duration: `${Date.now() - startTime}ms`
      })

      return result
    } catch (error) {
      logger?.error('OCR recognition failed', error)
      throw error
    }
  })()

  const {
    data: { blocks = [], confidence: overallConfidence }
  } = recognitionResult

  if (!blocks || blocks.length === 0) {
    logger?.error('No OCR blocks found', {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      overallConfidence
    })
    return
  }

  logger?.info(`OCR found ${blocks.length} text blocks`, {
    overallConfidence: Math.round(overallConfidence || 0),
    recognitionTime: `${Date.now() - startTime}ms`
  })

  logger?.group('Processing OCR Blocks', 'debug')

  const finalState = blocks.reduce((blockState, block, blockIndex) => {
    logger?.verbose(`Processing block ${blockIndex + 1}/${blocks.length}`, {
      paragraphs: block.paragraphs.length,
      blockConfidence: Math.round(block.confidence)
    })

    return block.paragraphs.reduce(
      (paragraphState, paragraph, paragraphIndex) => {
        logger?.verbose(`Processing paragraph ${paragraphIndex + 1}`, {
          lines: paragraph.lines.length,
          paragraphConfidence: Math.round(paragraph.confidence)
        })

        return paragraph.lines.reduce((lineState, line, lineIndex) => {
          const {
            bbox: { y1, y0 },
            text,
            confidence
          } = line

          const lineHeight = y1 - y0
          const fontSize = lineHeight * ratio

          const updatedState = {
            ...lineState,
            totalLines: lineState.totalLines + 1,
            confidenceSum: lineState.confidenceSum + confidence,
            fontSizes: [...lineState.fontSizes, fontSize],
            confidences: [...lineState.confidences, confidence]
          }

          logger?.debug(`Line ${lineIndex + 1}: "${text}"`, {
            confidence: Math.round(confidence),
            threshold: confidenceThreshold,
            fontSize: Math.round(fontSize),
            lineHeight: Math.round(lineHeight),
            y0: Math.round(y0),
            y1: Math.round(y1),
            height: Math.round(lineHeight)
          })

          if (Array.isArray(debug) && debug.includes('debug')) {
            console.log({
              text: line.text,
              confidence: line.confidence
            })
          }

          if (line.confidence <= confidenceThreshold) {
            logger?.verbose('Skipping line due to low confidence', {
              text,
              confidence: Math.round(confidence),
              threshold: confidenceThreshold
            })

            return {
              ...updatedState,
              skippedLines: updatedState.skippedLines + 1
            }
          }

          const wordCount = line.words?.length || 0

          logger?.debug(
            `Drawing line: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`
          )

          drawOcrWord(doc, line, fontSize, ratio, {
            debug,
            logger
          })

          return {
            ...updatedState,
            processedLines: updatedState.processedLines + 1,
            totalWords: updatedState.totalWords + wordCount
          }
        }, paragraphState)
      },
      blockState
    )
  }, initialProcessingState)

  logger?.groupEnd()

  const processingTime = Date.now() - startTime

  const {
    totalLines,
    confidenceSum,
    fontSizes,
    processedLines,
    skippedLines,
    totalWords
  } = finalState

  const averageConfidence = totalLines > 0 ? confidenceSum / totalLines : 0

  const averageFontSize =
    fontSizes.length > 0
      ? fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length
      : 0

  const successRate = totalLines > 0 ? (processedLines / totalLines) * 100 : 0

  const summaryInfo = {
    processed: `${processedLines}/${totalLines} lines`,
    skipped: skippedLines,
    words: totalWords,
    avgConfidence: `${Math.round(averageConfidence)}%`,
    avgFontSize: `${Math.round(averageFontSize)}px`,
    duration: `${processingTime}ms`,
    successRate: `${Math.round(successRate)}%`
  }

  logger?.info('OCR processing completed', summaryInfo)

  if (Array.isArray(debug) && debug.includes('info')) {
    const analyticsTable = [
      {
        metric: 'Lines Found',
        value: totalLines
      },
      {
        metric: 'Lines Processed',
        value: processedLines
      },
      {
        metric: 'Lines Skipped',
        value: finalState.skippedLines
      },
      {
        metric: 'Success Rate',
        value: `${Math.round(successRate)}%`
      },
      {
        metric: 'Average Confidence',
        value: `${Math.round(averageConfidence)}%`
      },
      {
        metric: 'Processing Time',
        value: `${processingTime}ms`
      }
    ]

    logger?.table(analyticsTable, 'info')
  }
}
