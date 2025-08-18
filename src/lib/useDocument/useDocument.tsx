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
import { Page, type IPageProps } from '../components/Page'
import { forceGarbageCollection } from '../utils/forceGarbageCollection'
import {
  create as createPdf,
  type ICreateOptions,
  Progress,
  getDimensions,
  getDefaults
} from '../core'
import { type ProcessingMetrics } from '../workers/types'
import { pick } from '../utils/pick'
import { PageHeader, type IPageHeaderProps } from '../components/PageHeader'

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

export const useDocument = (props: IUseDocumentOptions = {}) => {
  const ref = useRef<HTMLDivElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const [state, setState] = useState<DocumentState>(getInitialState)

  const {
    format,
    margin,
    workspaceScale,
    autoPaginate,
    debug,
    ocrSettings,
    onProgress,
    onError
  } = getDefaults(props)

  const dimensions = getDimensions({
    format,
    margin,
    workspaceScale
  })

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
          style={{
            width: dimensions.width,
            height: dimensions.height
          }}
          src={state.dataUri}
          alt="Document preview"
          className="border border-gray-200 rounded-lg shadow-sm"
        />
      ) : null,
    [state.dataUri, dimensions]
  )

  const RefPageHeader = memo(
    ({ children, ...props }: Partial<IPageHeaderProps>) => (
      <PageHeader
        {...props}
        workspaceScale={workspaceScale}
        margin={dimensions.padding}
      >
        {children}
      </PageHeader>
    )
  )

  const RefPage = useMemo(
    () =>
      memo(({ children, ...props }: Partial<IPageProps>) => (
        <Page
          {...props}
          workspaceScale={workspaceScale}
          width={dimensions.width ?? 0}
          height={dimensions.height ?? 0}
        >
          {children}
        </Page>
      )),
    [props, dimensions]
  )

  const RefDocument = useMemo(
    () =>
      memo(({ children }: PropsWithChildren) => (
        <Document {...props} ref={ref}>
          {children}
        </Document>
      )),
    [props, dimensions]
  )

  return Object.freeze({
    Document: RefDocument,
    PageHeader: RefPageHeader,
    Page: RefPage,
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
