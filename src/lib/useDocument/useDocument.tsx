import type { Options } from 'html-to-image/lib/types'
import {
  memo,
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
  type PropsWithChildren,
  type ReactNode
} from 'react'
import { Document } from '../components/Document'
import {
  DEFAULT_MARGIN,
  PAPER_DIMENSIONS,
  type IMargin,
  type IPaperFormat
} from '../constants'
import { chain } from '../utils/chain'
import { css } from '../utils/css'
import { makeStyleProps } from '../utils/makeStyleProps'
import { traverse } from '../utils/traverse'
import { getTextNodes } from '../utils/getTextNodes'
import { getUniqueCharsFromTextNodes } from '../utils/getUniqueCharsFromTextNodes'
import { getUniqueWordsFromTextNodes } from '../utils/getUniqueWordsFromTextNodes'
import { forceGarbageCollection } from '../utils/forceGarbageCollection'
import { DebugLogger, type IDebugOptions } from '../DebugLogger'
import { CONFIG } from '../config'
import PdfWorker from '../workers/pdfWorker?worker'
import type { OCRSettings } from '../config'
import {
  Progress,
  type PdfWorkerInput,
  type ProcessingMetrics,
  type IDownloadOptions
} from '../workers/types'

interface IUseDocumentOptions {
  readonly format?: IPaperFormat
  readonly margin?: IMargin | number
  readonly workspaceScale?: number
  readonly autoPaginate?: boolean
  readonly debug?: IDebugOptions
  readonly ocrSettings?: OCRSettings
  readonly enableAnalytics?: boolean
  readonly onProgress?: (metrics: ProcessingMetrics) => void
  readonly onError?: (error: Error) => void
}

interface DocumentState {
  readonly isCreating: boolean
  readonly progress: number
  readonly stage?: string
  readonly stageDescription?: string
  readonly eta?: number
  readonly pageNumber?: number
  readonly totalPages?: number
  readonly dataUri: string
  readonly pdfDataUri: string
  readonly metrics?: ProcessingMetrics
  readonly error?: string
}

const getInitialState = (): Readonly<DocumentState> => ({
  isCreating: false,
  progress: 0,
  dataUri: '',
  pdfDataUri: ''
})

export const useDocument = ({
  format = 'Letter',
  margin = DEFAULT_MARGIN,
  workspaceScale = 3.5,
  autoPaginate = true,
  debug = false,
  ocrSettings = {
    confidenceThreshold: CONFIG.OCR.CONFIDENCE_THRESHOLD,
    pageSegMode: CONFIG.OCR.PAGE_SEG_MODE,
    enableAnalytics: false
  },
  enableAnalytics = false,
  onProgress,
  onError,
  ...props
}: IUseDocumentOptions = {}) => {
  const ref = useRef<HTMLDivElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const [state, setState] = useState<DocumentState>(getInitialState)

  const logger = useMemo(() => DebugLogger.create(debug), [debug])

  const dimensions = useMemo(() => {
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
      (typeof margin === 'number' ? margin : MARGIN_MAP[margin]) /
      workspaceScale

    return Object.freeze({ width, height, padding })
  }, [format, margin, workspaceScale])

  const htmlToImage = useMemo(() => (async () => import('html-to-image'))(), [])

  const updateState = useCallback((updates: Partial<DocumentState>) => {
    setState((prevState) => ({
      ...prevState,
      ...updates
    }))
  }, [])

  const handleError = useCallback(
    (error: Error | string) => {
      const errorMessage = error instanceof Error ? error.message : error
      logger.error('Document generation error:', errorMessage)

      updateState({
        isCreating: false,
        progress: 0,
        error: errorMessage
      })

      onError?.(error instanceof Error ? error : new Error(errorMessage))
    },
    [onError, updateState, logger]
  )

  const cleanup = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }

    if (state.pdfDataUri) {
      URL.revokeObjectURL(state.pdfDataUri)
    }

    forceGarbageCollection()
  }, [state.pdfDataUri])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const processOCRReplacements = useCallback(
    (clonedNode: HTMLElement) => {
      logger.debug('Processing OCR replacements')

      return Array.from(clonedNode.querySelectorAll('[data-ocr]')).reduce<
        readonly string[]
      >((acc, node) => {
        const value = node.getAttribute('data-ocr')

        if (!(node instanceof HTMLElement) || !value) return acc

        if (value === 'false') {
          node.style.opacity = '0'
          return acc
        }

        const { height, width } = node.getBoundingClientRect()

        const [x, y] = (['data-ocr-x', 'data-ocr-y'] as const).map(
          (attr) => parseFloat(node.getAttribute(attr) ?? '') || 0
        )

        const style = getComputedStyle(node)
        const fontSize = Math.max(height, parseFloat(style.fontSize), 32)

        const svg = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'svg'
        )

        const svgText = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'text'
        )

        const offsetWidth = width - x

        svg.style.cssText = css`
          display: inline-block;
          position: relative;
          margin-top: ${y}px;
          margin-left: ${x}px;
          width: ${offsetWidth}px;
          height: ${height}px;
        `

        svg.appendChild(svgText)
        svgText.innerHTML = value

        svgText.style.cssText = css`
          background: #fff;
          color: #000;
          font-family: Consolas, 'Courier New', monospace;
          font-weight: 600;
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: none;
          font-smooth: never;
          border: 1px solid ${fontSize > 25 ? 'black' : 'transparent'};
          text-shadow: none;
        `

        Array.from(node.attributes).forEach((attr) => {
          if (attr.name.startsWith('data-')) {
            const clonedAttr = attr.cloneNode(true)
            if (clonedAttr instanceof Attr) {
              svg.setAttributeNode(clonedAttr)
            }
          }
        })

        node.replaceWith(svg)

        const bbox = svgText.getBBox()

        svg.setAttribute(
          'viewBox',
          [bbox.x, bbox.y, bbox.width, bbox.height].join(' ')
        )

        logger.verbose('OCR replacement processed', {
          value,
          fontSize: Math.round(fontSize),
          dimensions: `${Math.round(width)}x${Math.round(height)}`
        })

        return acc.includes(value) ? acc : Object.freeze([...acc, value])
      }, [])
    },
    [logger]
  )

  const create = useCallback((): Promise<{
    readonly download: (options?: IDownloadOptions) => () => void
    readonly message?: string
  }> => {
    return new Promise(async (resolve, reject) => {
      try {
        logger.info('Starting document creation')

        updateState({
          isCreating: true,
          progress: 0,
          error: undefined
        })

        if (!ref.current) {
          throw new Error('Document reference not available')
        }

        if (!(ref.current instanceof HTMLElement)) {
          const current = (ref.current as unknown)!
          const instanceType = current.constructor.name

          throw new Error(
            `Invalid element type: expected HTMLElement, got ${instanceType}`
          )
        }

        workerRef.current = new PdfWorker()

        const clonedNode = ref.current.cloneNode(true) as HTMLElement

        const { width, height, padding } = dimensions
        const { scrollHeight } = ref.current

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

        logger.debug('Processing DOM nodes for layout optimization')
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

          const overflow = makeStyleProps([
            'overflow',
            'overflowX',
            'overflowY'
          ])

          overflow.forEach((property) => {
            const value = style[property]

            if (
              typeof value === 'string' &&
              ['scroll', 'auto'].includes(value)
            ) {
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

        const TO_CANVAS_OPTIONS: Options = Object.freeze({
          backgroundColor: 'white',
          quality: CONFIG.PDF.IMAGE_QUALITY,
          pixelRatio: workspaceScale,
          width,
          canvasWidth: width
        })

        logger.debug('Converting HTML to canvas')
        const [{ toCanvas }, canvas] = await chain(
          async () => htmlToImage,
          async ({ toCanvas }) => toCanvas(clonedNode, TO_CANVAS_OPTIONS),
          (canvas) => updateState({ dataUri: canvas.toDataURL() })
        )

        const userDefinedReplacements = processOCRReplacements(clonedNode)
        const textNodes = getTextNodes(clonedNode, canvas)
        const charWhiteList = getUniqueCharsFromTextNodes(textNodes).join('')

        const customWords = getUniqueWordsFromTextNodes(
          textNodes,
          userDefinedReplacements
        ).join('\n')

        logger.info('Text analysis completed', {
          textNodes: textNodes.length,
          uniqueChars: charWhiteList.length,
          customWords: customWords.split('\n').length,
          userReplacements: userDefinedReplacements.length
        })

        const ocrCanvas = await toCanvas(clonedNode, TO_CANVAS_OPTIONS)

        if (
          debug === 'debug' ||
          (Array.isArray(debug) && debug.includes('debug'))
        ) {
          ocrCanvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob)
              window.open(url, '_blank', 'width=800,height=600')
            }
          })
        }

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
            ocrSettings: Object.freeze({
              ...ocrSettings,
              enableAnalytics
            })
          })
        })

        logger.debug('Sending work to PDF worker')
        workerRef.current.postMessage(input, [bitmap, ocrBitmap])

        workerRef.current.onmessage = ({ data: message }) => {
          switch (message.type) {
            case Progress.Pending:
              if (message.metrics && onProgress) {
                onProgress(message.metrics)
              }

              return updateState({
                stage: message.stage,
                stageDescription: message.stageDescription,
                progress: message.progress * 100 || 0,
                eta: message.eta,
                pageNumber: message.pageNumber,
                totalPages: message.totalPages,
                metrics: message.metrics
              })

            case Progress.Done:
              if (message.metrics && onProgress) {
                onProgress(message.metrics)
              }

              const blob = new Blob([message.pdfBuffer!], {
                type: 'application/pdf'
              })

              const url = URL.createObjectURL(blob)

              updateState({
                isCreating: false,
                progress: 100,
                pdfDataUri: url,
                metrics: message.metrics
              })

              logger.info('PDF generation completed successfully')

              const download = (options: IDownloadOptions = {}) => {
                const config = Object.freeze({
                  type: 'window' as const,
                  filename: 'document.pdf',
                  ...options
                })

                if (config.type === 'direct') {
                  const anchor = document.createElement('a')

                  const attributes: readonly [string, string][] = Object.freeze(
                    [
                      ['href', url],
                      ['target', '_blank'],
                      ['rel', 'noopener noreferrer'],
                      ['download', config.filename]
                    ]
                  )

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
                  download
                })
              )

            case Progress.Error:
              return handleError(message.message || 'Unknown worker error')
          }
        }
      } catch (error) {
        handleError(error as Error)
        reject(error)
      }
    })
  }, [
    updateState,
    dimensions,
    handleError,
    processOCRReplacements,
    htmlToImage,
    workspaceScale,
    autoPaginate,
    ocrSettings,
    enableAnalytics,
    debug,
    state.pdfDataUri,
    logger
  ])

  const Viewer = useCallback(
    ({
      fallback
    }: {
      readonly fallback?: ReactNode
    } = {}) =>
      state.pdfDataUri ? (
        <object
          height={dimensions.height}
          width={dimensions.width}
          data={state.pdfDataUri}
          type="application/pdf"
          className="border border-gray-200 rounded-lg shadow-sm"
        >
          {fallback}
        </object>
      ) : null,
    [state.pdfDataUri, dimensions]
  )

  const PreviewImage = useCallback(
    () =>
      state.dataUri ? (
        <img
          style={{ width: dimensions.width, height: dimensions.height }}
          src={state.dataUri}
          alt="Document preview"
          className="border border-gray-200 rounded-lg shadow-sm"
        />
      ) : null,
    [state.dataUri, dimensions]
  )

  const RefDocument = useMemo(
    () =>
      memo(({ children }: PropsWithChildren) => (
        <Document
          {...props}
          ref={ref}
          margin={dimensions.padding}
          width={dimensions.width}
          height={dimensions.height}
        >
          {children}
        </Document>
      )),
    [props, dimensions]
  )

  return Object.freeze({
    Document: RefDocument,
    Viewer,
    PreviewImage,

    create,
    cleanup,

    ...Object.freeze(state),
    dimensions: Object.freeze(dimensions),
    isProcessing: state.isCreating && state.progress > 0,
    isCompleted: !state.isCreating && state.progress === 100,
    hasError: Boolean(state.error)
  })
}
