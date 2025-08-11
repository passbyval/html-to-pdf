import jsPDF from 'jspdf'
import { blobToDataURL } from '../utils/blobToDataURL'
import { chain } from '../utils/chain'
import { drawOcrFromBlocks } from '../utils/drawOcrFromBlocks'
import { getDimensions } from '../utils/getDimensions'
import { getPaginatedCanvases } from '../utils/getPaginatedCanvases'
import { transferBitmapToCanvas } from '../utils/transferBitmapToCanvas'
import { createTesseractWorker } from './createTesseractWorker'
import { forceGarbageCollection } from '../utils/forceGarbageCollection'
import { cleanupCanvas } from '../utils/createCanvas'
import { DebugLogger, type LogLevel } from '../DebugLogger'

import { CONFIG, type OCRSettings } from '../config'

import {
  Progress,
  type PdfWorkerInput,
  type PdfWorkerOutput,
  type ProcessingMetrics
} from './types'
import type { Worker } from 'tesseract.js'

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
  ocrCanvas,
  doc,
  worker,
  pageIndex,
  totalPages,
  margin,
  ocrSettings,
  debug
}: {
  canvas: OffscreenCanvas
  ocrCanvas: OffscreenCanvas
  doc: jsPDF
  worker: Worker
  pageIndex: number
  totalPages: number
  margin: number
  ocrSettings: OCRSettings
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
    pagwWidth: Math.round(width),
    pageHeight: Math.round(height),
    ratio: Math.round(ratio * 1000) / 1000
  }

  logger.info(`Processing page ${pageIndex + 1}/${totalPages}`, pageDetails)

  logger.debug('Starting OCR processing for page')

  await drawOcrFromBlocks({
    doc: page,
    canvas: ocrCanvas,
    ratio,
    worker,
    ocrSettings,
    debug,
    logger
  })

  logger.debug('Adding image to PDF page')
  page.addImage({
    imageData,
    format: CONFIG.PDF.IMAGE_FORMAT,
    x: 0,
    y: 0,
    width,
    height
  })

  // Add page number
  page.setTextColor(CONFIG.PDF.PAGE_NUMBER_COLOR)
  page.text(
    `${page.getCurrentPageInfo().pageNumber}`,
    width - margin / 2,
    height - margin / 2,
    {
      align: 'center',
      baseline: 'middle'
    }
  )

  const processingTime = Date.now() - startTime

  const completionData = {
    pageIndex: pageIndex + 1,
    processingTime,
    pageSize: { width, height }
  }

  logger.info('Page processing complete', completionData)

  const completionInfo = {
    duration: `${processingTime}ms`,
    ratio: Math.round(ratio * 1000) / 1000
  }

  logger.info(`Page ${pageIndex + 1} completed`, completionInfo)

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

  try {
    const { options } = data

    reportProgress(0.1, { stage: 'Initializing worker...' })

    const worker = await createTesseractWorker(
      options.customWords,
      options.charWhiteList,
      'eng',
      options.debug
    )

    const doc = new jsPDF('p', 'px', [options.width, options.height], true)
    const [canvas] = transferBitmapToCanvas(options.bitmap)
    const [ocrCanvas] = transferBitmapToCanvas(options.ocrBitmap)

    reportProgress(0.2, { stage: 'Preparing pages...' })

    const cropped = await getPaginatedCanvases([canvas, ocrCanvas], {
      pageHeight: options.pageHeight,
      margin: options.margin * options.workspaceScale,
      worker,
      debug: options.debug
    })

    const pages = options.autoPaginate ? cropped : [cropped[0]]
    const totalPages = pages.length

    reportProgress(0.3, {
      pageNumber: 1,
      totalPages,
      stage: 'Processing pages...'
    })

    const durations: number[] = []

    for (const [pageIndex, [pageCanvas, pageOcrCanvas]] of pages.entries()) {
      const pageStartTime = Date.now()

      await processPage({
        canvas: pageCanvas,
        ocrCanvas: pageOcrCanvas,
        doc,
        worker,
        pageIndex,
        totalPages,
        margin: options.margin,
        ocrSettings: options.ocrSettings ?? {},
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
      cleanupCanvas(pageOcrCanvas)

      if (pageIndex % CONFIG.PERFORMANCE.BATCH_SIZE === 0) {
        forceGarbageCollection()
      }
    }

    await worker.terminate()

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
      timestamp: Date.now(),
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
      message: error instanceof Error ? error.message : String(error),
      timestamp: Date.now()
    }

    postMessage(errorResult)
  } finally {
    forceGarbageCollection()
  }
}
