import jsPDF from 'jspdf'
import { blobToDataURL } from '../utils/blobToDataURL'
import { chain } from '../utils/chain'
import { getDimensions } from '../utils/getDimensions'
import { getPaginatedCanvases } from '../utils/getPaginatedCanvases'
import { transferBitmapToCanvas } from '../utils/transferBitmapToCanvas'
import { forceGarbageCollection } from '../utils/forceGarbageCollection'
import { cleanupCanvas } from '../utils/createCanvas'
import { DebugLogger, type LogLevel, overrides } from '../DebugLogger'
import type { ITextNode } from '../utils/getTextNodes'
import { drawTextLayerFromNodes } from '../utils/drawTextLayerFromNodes'
import { sanitizeForTransfer } from './sanitizeForTransfer'
import { CONFIG } from '../config'

import {
  Progress,
  type PdfWorkerInput,
  type PdfWorkerOutput,
  type ProcessingMetrics
} from './types'

/**
 * Override console methods to direct messages to the main thread for proper logging.
 */

const wrapper =
  (level: string) =>
  (...args: unknown[]) => {
    try {
      self.postMessage({
        type: 'console',
        level,
        args: args.map(sanitizeForTransfer)
      })
    } catch (error) {
      self.postMessage({
        type: 'console',
        level,
        args: args.map((arg) => String(arg))
      })
    }
  }

overrides.forEach((override) => {
  console[override] = wrapper(override)
})

const CONVERT_TO_BLOB_OPTIONS = Object.freeze({
  type: `image/${CONFIG.PDF.IMAGE_FORMAT.toLowerCase()}`,
  quality: CONFIG.PDF.IMAGE_QUALITY
})

const handleDataCloneError = (
  event: PromiseRejectionEvent | ErrorEvent
): boolean => {
  const logger = DebugLogger.create('warn')

  const error =
    event instanceof PromiseRejectionEvent ? event.reason : event.error
  const message = event instanceof ErrorEvent ? event.message : 'event'

  const isDataCloneError =
    error?.name === 'DataCloneError' ||
    (error?.message && error.message.includes('could not be cloned')) ||
    (message && message.includes('could not be cloned'))

  if (isDataCloneError) {
    logger.debug(
      'Caught DataCloneError (harmless Tesseract.js internal operation)'
    )
    event.preventDefault?.()
    return true
  }
  return false
}

self.addEventListener('unhandledrejection', handleDataCloneError)
self.addEventListener('error', handleDataCloneError)

const reportProgress = (
  progress: number,
  options: Readonly<{
    pageNumber?: number
    totalPages?: number
    stage?: string
    eta?: number
  }> = {}
): void => {
  const message: PdfWorkerOutput = Object.freeze({
    type: Progress.Pending,
    progress,
    ...options,
    timestamp: Date.now()
  })

  postMessage(message)
}

const processPage = async ({
  canvas,
  doc,
  pageIndex,
  totalPages,
  margin,
  textNodes,
  debug
}: {
  canvas: OffscreenCanvas
  doc: jsPDF
  pageIndex: number
  totalPages: number
  margin: number
  textNodes: ITextNode[]
  debug: LogLevel
}): Promise<ProcessingMetrics> => {
  const startTime = Date.now()
  const logger = DebugLogger.create(debug)

  const pageInfo = {
    pageIndex: pageIndex + 1,
    totalPages,
    canvasSize: {
      width: canvas.width,
      height: canvas.height
    }
  }

  logger.info('Page processing started', pageInfo)

  const page = pageIndex === 0 ? doc : doc.addPage()

  logger.debug('Converting canvas to blob')

  const [, imageData] = await chain(
    () => canvas.convertToBlob(CONVERT_TO_BLOB_OPTIONS),
    (blob) => blobToDataURL(blob, debug)
  )

  const { width, height } = doc.internal.pageSize
  const { ratio } = getDimensions(canvas, { width, height })

  const pageDetails = {
    pageWidth: Math.round(width),
    pageHeight: Math.round(height),
    ratio: Math.round(ratio * 1000) / 1000
  }

  logger.info(`Processing page ${pageIndex + 1}/${totalPages}`, pageDetails)
  logger.debug('Adding image to PDF page')

  page.addImage({
    imageData,
    format: CONFIG.PDF.IMAGE_FORMAT,
    x: 0,
    y: 0,
    width,
    height
  })

  logger.debug('Drawing text layer from extracted text nodes')

  drawTextLayerFromNodes({
    doc: page,
    textNodes,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    ratio,
    debug,
    logger
  })

  const { pageNumber } = page.getCurrentPageInfo()

  if (pageNumber !== 1) {
    page.setTextColor(CONFIG.PDF.PAGE_NUMBER_COLOR)

    page.text(
      `${pageNumber}`,
      width - (margin * ratio) / 2,
      height - (margin * ratio) / 2,
      {
        align: 'center',
        baseline: 'middle'
      }
    )
  }

  const processingTime = Date.now() - startTime

  const completionData = {
    pageIndex: pageIndex + 1,
    processingTime,
    pageSize: { width, height }
  }

  logger.info('Page processing complete', completionData)

  return {
    stage: 'PAGE_COMPLETE',
    progress: 1,
    eta: 0,
    processingTime,
    timestamp: Date.now()
  }
}

self.onmessage = async ({ data }: MessageEvent<PdfWorkerInput>) => {
  const startTime = Date.now()
  const logger = DebugLogger.create('info')

  try {
    const { options } = data

    reportProgress(0.1, { stage: 'Initializing...' })

    const doc = new jsPDF('p', 'px', [options.width, options.height], true)

    const canvases = options.bitmaps.map(
      (bitmap) => transferBitmapToCanvas(bitmap, options.debug)[0]
    )

    reportProgress(0.2, { stage: 'Preparing pages...' })

    const allCropped = canvases
      .map((canvas, index) => {
        const pageTextNodes = options.textNodes[index] || []

        if (!options.autoPaginationFlags[index]) {
          return [[canvas, pageTextNodes]]
        }

        const { width: pdfWidth, height: pdfHeight } = doc.internal.pageSize

        return getPaginatedCanvases(canvas, pageTextNodes, {
          pageHeight: options.pageHeight,
          margin: options.margin,
          debug: options.debug,
          pdfWidth,
          pdfHeight
        })
      })
      .flat() as [OffscreenCanvas, ITextNode[]][]

    const totalPages = allCropped.length

    logger.info('Pagination completed', allCropped)

    reportProgress(0.3, {
      pageNumber: 1,
      totalPages,
      stage: 'Processing pages...'
    })

    const durations: number[] = []

    for (const [
      pageIndex,
      [pageCanvas, pageTextNodes]
    ] of allCropped.entries()) {
      const pageStartTime = Date.now()

      console.info('HI', {
        pageCanvas,
        pageTextNodes
      })

      await processPage({
        canvas: pageCanvas,
        doc,
        pageIndex,
        totalPages,
        margin: options.margin,
        textNodes: pageTextNodes,
        debug: options.debug
      })

      const pageDuration = Date.now() - pageStartTime
      durations.push(pageDuration)

      const pageProgress = 0.3 + (0.6 * (pageIndex + 1)) / totalPages
      const averageMs = durations.reduce((a, b) => a + b, 0) / durations.length
      const pagesRemaining = totalPages - (pageIndex + 1)
      const eta = averageMs * pagesRemaining

      reportProgress(pageProgress, {
        pageNumber: pageIndex + 1,
        totalPages,
        stage: `Processing page ${pageIndex + 1}...`,
        eta
      })

      cleanupCanvas(pageCanvas)

      if (pageIndex % CONFIG.PERFORMANCE.BATCH_SIZE === 0) {
        forceGarbageCollection()
      }
    }

    canvases.forEach(cleanupCanvas)

    reportProgress(0.95, {
      pageNumber: totalPages,
      totalPages,
      stage: 'Generating PDF...'
    })

    const buffer = doc.output('arraybuffer')
    const totalProcessingTime = Date.now() - startTime

    const result: PdfWorkerOutput = {
      type: Progress.Done,
      pdfBuffer: buffer,
      metrics: {
        stage: 'COMPLETE',
        progress: 1,
        eta: 0,
        processingTime: totalProcessingTime,
        timestamp: Date.now()
      }
    }

    postMessage(result, [buffer])
  } catch (error) {
    console.error('Worker error:', error)

    const errorResult: PdfWorkerOutput = {
      type: Progress.Error,
      message: error instanceof Error ? error.message : String(error)
    }

    postMessage(errorResult)
  } finally {
    forceGarbageCollection()
  }
}
