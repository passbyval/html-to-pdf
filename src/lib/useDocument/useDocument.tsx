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
import { forceGarbageCollection } from '../utils/forceGarbageCollection'
import { CONFIG } from '../config'
import { create as createPdf, type ICreateOptions, Progress } from '../core'
import { type ProcessingMetrics } from '../workers/types'
import { pick } from '../utils/pick'

export interface IUseDocumentOptions extends ICreateOptions {}

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
    pageSegMode: CONFIG.OCR.PAGE_SEG_MODE
  },
  onProgress,
  onError,
  ...props
}: IUseDocumentOptions = {}) => {
  const ref = useRef<HTMLDivElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const [state, setState] = useState<DocumentState>(getInitialState)

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

  const updateState = useCallback((updates: Partial<DocumentState>) => {
    setState((prevState) => ({
      ...prevState,
      ...updates
    }))
  }, [])

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

  const create = async () => {
    updateState({
      isCreating: true,
      progress: 0,
      error: undefined
    })

    const { download, url, metrics, worker } = await createPdf(ref.current, {
      debug,
      autoPaginate,
      format,
      margin,
      ocrSettings,
      onError: (error) => {
        onError?.(error)

        return updateState({
          isCreating: false,
          progress: 0,
          error: error.message
        })
      },
      workspaceScale,
      onProgress: (message) => {
        onProgress?.(message)

        switch (message.type) {
          case Progress.Pending: {
            return updateState({
              ...pick(message, [
                'stage',
                'stageDescription',
                'eta',
                'pageNumber',
                'totalPages',
                'metrics'
              ]),
              progress: message.progress ? message.progress * 100 : 0
            })
          }
        }
      }
    })

    workerRef.current = worker

    updateState({
      isCreating: false,
      progress: 100,
      pdfDataUri: url,
      metrics
    })

    return Object.freeze({
      download
    })
  }

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
