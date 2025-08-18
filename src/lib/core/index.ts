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
  debug?: LogLevel
  workspaceScale?: number
  readonly ocrSettings?: OCRSettings
  onError?: (error: Error) => void
  onProgress?: (message: PdfWorkerOutput) => void
  autoPaginate?: boolean
}

export const MARGIN_MAP: Record<IMargin, number> = Object.freeze({
  Standard: DEFAULT_MARGIN,
  Thin: DEFAULT_MARGIN / 2,
  None: 0
} as const)

export const getMargin = (margin: IMargin = 'Standard', scale: number) =>
  Math.round(typeof margin === 'number' ? margin : MARGIN_MAP[margin]) / scale

export const getDimensions = ({
  format,
  margin,
  workspaceScale
}: Required<
  Pick<ICreateOptions, 'workspaceScale' | 'format' | 'margin'>
>): IDimensions => {
  const [WIDTH, HEIGHT] =
    PAPER_DIMENSIONS[format?.toUpperCase() as Uppercase<IPaperFormat>]

  const scale = Math.round(workspaceScale * 2) / 2
  const width = Math.round(WIDTH / scale)
  const height = Math.round(HEIGHT / scale)
  const padding = Math.round(getMargin(margin, scale))

  return Object.freeze({
    width,
    height,
    padding
  })
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
    debug = 'warn',
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

  const htmlToImagePromise = import('../../html-to-image')
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
        const { name: instanceType } = current.constructor

        throw new Error(
          `Invalid element type: expected HTMLElement, got ${instanceType}`
        )
      }

      const worker = new PdfWorker()
      const clonedNode = element.cloneNode(true) as HTMLElement

      const { fixed, auto } = Array.from(
        clonedNode.querySelectorAll('[data-html-to-pdf-page]')
      ).reduce(
        (acc, page) => {
          if (!(page instanceof HTMLElement)) return acc

          const autoPagination =
            page.getAttribute('data-html-to-pdf-page') === 'true'

          return {
            fixed: autoPagination ? acc.fixed : [...acc.fixed, page],
            auto: autoPagination ? [...acc.auto, page] : acc.auto
          }
        },
        {
          fixed: [] as HTMLElement[],
          auto: [] as HTMLElement[]
        }
      )

      const { width, height, padding } = dimensions

      const nodes: [HTMLElement, boolean][] = [...fixed, ...auto].map(
        (node) => {
          const { scrollHeight } = node

          const autoPaginate = auto.includes(node)

          const trueHeight = autoPaginate
            ? Math.max(height, Math.round(scrollHeight))
            : height

          node.style.cssText = css`
            width: ${width}px;
            border: none;

            /* Enhanced font rendering */
            font-smooth: antialiased;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;

            /* Better image rendering */
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;

            /* Force hardware acceleration */
            transform: translateZ(0);
            will-change: transform;
            backface-visibility: hidden;

            /* Prevent blurry rendering */
            -webkit-backface-visibility: hidden;
            -webkit-perspective: 1000;
            -webkit-transform: translate3d(0, 0, 0);
          `

          if (autoPaginate) {
            node.style.cssText = css`
              ${node.style.cssText}
              min-height: ${trueHeight}px;
              overflow: visible;
              overflow-y: scroll;
              overflow-x: hidden;
            `
          } else {
            node.style.cssText = css`
              ${node.style.cssText}
              height: ${trueHeight}px;
              overflow: hidden;
              overflow-y: scroll;
              overflow-x: hidden;
            `
          }

          return [node, autoPaginate]
        }
      )

      clonedNode.style.cssText = css`
        display: block;
      `

      document.body.appendChild(clonedNode)

      logger.debug('Processing DOM nodes for layout fixes')

      for (const node of traverse(clonedNode)) {
        const style = getComputedStyle(node)

        makeStyleProps(['overflow', 'overflowX', 'overflowY']).forEach(
          (property) => {
            const value = style[property]

            if (
              typeof value === 'string' &&
              ['scroll', 'auto'].includes(value)
            ) {
              node.style[property] = 'hidden'
            }
          }
        )

        Object.getOwnPropertyNames(style).forEach((property) => {
          const value = style[property as keyof CSSStyleDeclaration] as string

          /* Reduce sub-pixels for crisper image */
          if (typeof value === 'string' && value.endsWith('px')) {
            const num = parseFloat(value)

            if (!isNaN(num)) {
              node.style.setProperty(
                property,
                `${Math.round(num * 1000) / 1000}px`
              )
            }
          }
        })
      }

      const [{ toCanvas }] = await Promise.all([
        htmlToImagePromise,
        document.fonts.ready,
        ...Array.from(clonedNode.querySelectorAll('img')).map((img) => {
          if (img.complete) return Promise.resolve()

          return new Promise((resolve) => {
            img.onload = resolve
            img.onerror = resolve
          })
        })
      ])

      const TO_CANVAS_OPTIONS: ToCanvasOptions = {
        backgroundColor: 'white',
        quality: CONFIG.PDF.IMAGE_QUALITY,
        pixelRatio: Math.round(Math.min(workspaceScale * 2, 6) * 2) / 2,
        width,
        canvasWidth: width
      }

      logger.debug('Converting HTML to canvas')

      const mainCanvases = await Promise.all(
        nodes.map(([node, autoPaginate]) =>
          toCanvas(node, {
            ...TO_CANVAS_OPTIONS,
            height: autoPaginate ? undefined : height,
            canvasHeight: autoPaginate ? undefined : height
          })
        )
      )

      const autoPaginationFlags = nodes.map(([, autoPaginate]) => autoPaginate)

      const { pixelRatio = 1 } = TO_CANVAS_OPTIONS

      const textNodesPerCanvas = mainCanvases.map(([canvas, node]) => {
        document.body.appendChild(node)

        const nodeBounds = node.getBoundingClientRect()

        const scaleX = canvas.width / pixelRatio / nodeBounds.width
        const scaleY = canvas.height / pixelRatio / nodeBounds.height

        const rawTextNodes = getTextNodes(node, 1, debug)

        document.body.removeChild(node)

        return rawTextNodes.map((textNode) => ({
          ...textNode,
          x: (textNode.x + padding) * scaleX * pixelRatio,
          y: (textNode.y + padding) * scaleY * pixelRatio,
          fontSize: textNode.fontSize * scaleY * pixelRatio,
          width: textNode.width * scaleX * pixelRatio,
          height: textNode.height * scaleY * pixelRatio
        }))
      })

      const allTextNodes = textNodesPerCanvas.flat()
      const charWhiteList = getUniqueCharsFromTextNodes(allTextNodes).join('')

      const userDefinedReplacements = processOCRReplacements(clonedNode, {
        logger
      })

      const customWords = getUniqueWordsFromTextNodes(
        allTextNodes,
        userDefinedReplacements
      ).join('\n')

      logger.info('Gathered document text information', {
        count: allTextNodes.length,
        uniqueChars: charWhiteList.length,
        customWords: customWords.split('\n').length,
        userReplacements: userDefinedReplacements.length,
        textNodes: allTextNodes
      })

      document.body.removeChild(clonedNode)

      const bitmaps = await Promise.all(
        mainCanvases.map(([canvas]) =>
          createImageBitmap(canvas, {
            resizeQuality: 'high',
            colorSpaceConversion: 'none',
            premultiplyAlpha: 'none'
          })
        )
      )

      const input: PdfWorkerInput = {
        options: {
          height,
          width,
          margin: padding * pixelRatio,
          pageHeight: height * pixelRatio,
          bitmaps,
          autoPaginationFlags,
          autoPaginate,
          customWords,
          charWhiteList,
          debug,
          ocrSettings: ocrSettings,
          textNodes: textNodesPerCanvas
        }
      }

      logger.debug('Sending work to PDF worker')

      worker.postMessage(input, [...bitmaps])

      worker.onmessage = ({ data: message }: MessageEvent<PdfWorkerOutput>) => {
        onProgress?.(message)

        if (message.type === 'console') {
          const { level, args = [] } = message

          const consoleMethod =
            console[level as 'debug' | 'warn' | 'error' | 'info' | 'log']

          if (typeof consoleMethod === 'function') {
            consoleMethod.apply(console, args)
          }
        }

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
