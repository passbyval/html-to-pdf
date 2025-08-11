import type { Options as ToCanvasOptions } from 'html-to-image/lib/types'
import { CONFIG, type OCRSettings } from '../config'
import { DebugLogger, type LogLevel } from '../DebugLogger'
import PdfWorker from '../workers/pdfWorker?worker'
import { css } from '../utils/css'
import { traverse } from '../utils/traverse'
import { getTextNodes } from '../utils/getTextNodes'
import { getUniqueCharsFromTextNodes } from '../utils/getUniqueCharsFromTextNodes'
import { getUniqueWordsFromTextNodes } from '../utils/getUniqueWordsFromTextNodes'
import { makeStyleProps } from '../utils/makeStyleProps'
import { chain } from '../utils/chain'
import { processOCRReplacements } from './processOCRReplacements'

import {
  Progress,
  type PdfWorkerInput,
  type IDownloadOptions,
  type PdfWorkerOutput,
  type ProcessingMetrics
} from '../workers/types'

import {
  DEFAULT_MARGIN,
  PAPER_DIMENSIONS,
  type IMargin,
  type IPaperFormat
} from '../constants'

export interface IDimensions {
  readonly width: number
  readonly height: number
  readonly padding: number
}

export interface ICreateOptions {
  format?: IPaperFormat
  margin?: IMargin | number
  debug?: LogLevel[]
  workspaceScale?: number
  readonly ocrSettings?: OCRSettings
  onError?: (error: Error) => void
  onProgress?: (message: PdfWorkerOutput) => void
  autoPaginate?: boolean
}

export const getDimensions = ({
  format,
  margin,
  workspaceScale
}: Required<
  Pick<ICreateOptions, 'workspaceScale' | 'format' | 'margin'>
>): IDimensions => {
  const [WIDTH, HEIGHT] =
    PAPER_DIMENSIONS[format?.toUpperCase() as Uppercase<IPaperFormat>]

  const MARGIN_MAP: Record<IMargin, number> = Object.freeze({
    Standard: DEFAULT_MARGIN,
    Thin: DEFAULT_MARGIN / 2,
    None: 0
  })

  const width = WIDTH / workspaceScale
  const height = HEIGHT / workspaceScale

  const padding =
    (typeof margin === 'number' ? margin : MARGIN_MAP[margin]) / workspaceScale

  return Object.freeze({ width, height, padding })
}

const createErrorHandler = ({
  logger,
  onError
}: { logger: DebugLogger } & Pick<ICreateOptions, 'onError'>) => {
  return (error: Error | string) => {
    const errorMessage = error instanceof Error ? error.message : error
    logger.error('Document generation error:', errorMessage)

    onError?.(error instanceof Error ? error : new Error(errorMessage))
  }
}

export const getDefaults = (options: ICreateOptions) => {
  const {
    format = 'Letter',
    debug = false,
    margin = DEFAULT_MARGIN,
    workspaceScale = 3.5,
    autoPaginate = true,
    ocrSettings = {
      confidenceThreshold: CONFIG.OCR.CONFIDENCE_THRESHOLD,
      pageSegMode: CONFIG.OCR.PAGE_SEG_MODE
    }
  } = options

  return {
    ...options,
    format,
    debug,
    margin,
    workspaceScale,
    autoPaginate,
    ocrSettings
  }
}

export const create = (
  element: HTMLElement | undefined | null,
  options: ICreateOptions
) => {
  const {
    format,
    debug,
    margin,
    workspaceScale,
    autoPaginate,
    ocrSettings,
    onProgress,
    onError
  } = getDefaults(options)

  const htmlToImagePromise = import('html-to-image')
  const logger = DebugLogger.create(options.debug)
  const dimensions = getDimensions({ format, margin, workspaceScale })

  const errorHandler = createErrorHandler({
    logger,
    onError
  })

  return new Promise<{
    readonly download: (options?: IDownloadOptions) => () => void
    readonly worker: Worker
    readonly url: string
    readonly metrics?: ProcessingMetrics
  }>(async (resolve, reject) => {
    try {
      logger.info('Starting document creation')

      if (!element) {
        throw new Error('Document reference not available')
      }

      if (!(element instanceof HTMLElement)) {
        const current = (element as unknown)!
        const instanceType = current.constructor.name

        throw new Error(
          `Invalid element type: expected HTMLElement, got ${instanceType}`
        )
      }

      const worker = new PdfWorker()

      const clonedNode = element.cloneNode(true) as HTMLElement

      const { width, height, padding } = dimensions
      const { scrollHeight } = element

      const trueHeight = Math.max(height, scrollHeight)

      logger.debug('Preparing document layout', {
        dimensions: `${Math.round(width)}x${Math.round(height)}`,
        padding: Math.round(padding),
        scrollHeight: Math.round(scrollHeight),
        trueHeight: Math.round(trueHeight)
      })

      clonedNode.style.cssText = css`
        padding: ${padding}px;
        min-height: ${trueHeight}px;
        width: ${width}px;
        margin: 0px;
        border: none;
        overflow: visible;
        font-smooth: antialiased;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        transform: translateZ(0);
        backface-visibility: hidden;
        text-rendering: optimizeLegibility;
        image-rendering: crisp-edges;
      `

      document.body.appendChild(clonedNode)

      logger.debug('Processing DOM nodes for layout fixes')

      for (const node of traverse(clonedNode)) {
        const style = getComputedStyle(node)

        const layoutAffectors = makeStyleProps([
          'left',
          'top',
          'width',
          'height',
          'fontSize',
          'lineHeight'
        ])

        const overflow = makeStyleProps(['overflow', 'overflowX', 'overflowY'])

        overflow.forEach((property) => {
          const value = style[property]

          if (typeof value === 'string' && ['scroll', 'auto'].includes(value)) {
            node.style[property] = 'hidden'
          }
        })

        layoutAffectors.forEach((property) => {
          const value = style[property]
          const num = parseFloat(value)

          if (!isNaN(num)) {
            node.style.setProperty(property, `${Math.round(num)}px`)
          }
        })
      }

      const TO_CANVAS_OPTIONS: ToCanvasOptions = Object.freeze({
        backgroundColor: 'white',
        quality: CONFIG.PDF.IMAGE_QUALITY,
        pixelRatio: workspaceScale,
        width,
        canvasWidth: width
      })

      logger.debug('Converting HTML to canvas')

      const [{ toCanvas }, canvas] = await chain(
        async () => htmlToImagePromise,
        async ({ toCanvas }) => toCanvas(clonedNode, TO_CANVAS_OPTIONS)
      )

      const userDefinedReplacements = processOCRReplacements(clonedNode, {
        logger
      })

      const textNodes = getTextNodes(clonedNode, canvas)
      const charWhiteList = getUniqueCharsFromTextNodes(textNodes).join('')

      const customWords = getUniqueWordsFromTextNodes(
        textNodes,
        userDefinedReplacements
      ).join('\n')

      logger.info('Gathered document text information', {
        textNodes: textNodes.length,
        uniqueChars: charWhiteList.length,
        customWords: customWords.split('\n').length,
        userReplacements: userDefinedReplacements.length
      })

      const ocrCanvas = await toCanvas(clonedNode, TO_CANVAS_OPTIONS)

      document.body.removeChild(clonedNode)

      const [bitmap, ocrBitmap] = await Promise.all(
        [canvas, ocrCanvas].map((canvas) =>
          createImageBitmap(canvas, {
            resizeQuality: 'high'
          })
        )
      )

      const input: PdfWorkerInput = Object.freeze({
        options: Object.freeze({
          height,
          width,
          margin: padding,
          pageHeight: height * workspaceScale,
          workspaceScale,
          bitmap,
          ocrBitmap,
          autoPaginate,
          customWords,
          charWhiteList,
          debug,
          ocrSettings: Object.freeze(ocrSettings)
        })
      })

      logger.debug('Sending work to PDF worker')

      worker.postMessage(input, [bitmap, ocrBitmap])

      worker.onmessage = ({ data: message }: MessageEvent<PdfWorkerOutput>) => {
        onProgress?.(message)

        switch (message.type) {
          case Progress.Done:
            const blob = new Blob([message.pdfBuffer!], {
              type: 'application/pdf'
            })

            const url = URL.createObjectURL(blob)

            logger.info('PDF generation completed successfully')

            const download = (options: IDownloadOptions = {}) => {
              const config = Object.freeze({
                type: 'window' as const,
                filename: 'document.pdf',
                ...options
              })

              if (config.type === 'direct') {
                const anchor = document.createElement('a')

                const attributes: readonly [string, string][] = Object.freeze([
                  ['href', url],
                  ['target', '_blank'],
                  ['rel', 'noopener noreferrer'],
                  ['download', config.filename]
                ])

                attributes.forEach(([key, value]) =>
                  anchor.setAttribute(key, value)
                )

                anchor.click()
                return () => void 0
              }

              window.open(url, '_blank')
              return () => URL.revokeObjectURL(url)
            }

            return resolve(
              Object.freeze({
                download,
                url,
                metric: message.metrics,
                worker
              })
            )

          case Progress.Error:
            return errorHandler(message.message || 'Unknown worker error')
        }
      }
    } catch (error) {
      if (error instanceof Error || typeof error === 'string') {
        errorHandler(error as Error)
      }
      reject(error)
    }
  })
}

export { type PdfWorkerOutput, Progress }
