import type { Options } from 'html-to-image/lib/types'
import type jsPDF from 'jspdf'
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode
} from 'react'
import type { Worker } from 'tesseract.js'
import {
  DEFAULT_MARGIN,
  OCR_PARAMS,
  PAPER_DIMENSIONS,
  type IMargin,
  type IPaperFormat
} from '../constants.ts'
import { createDeferred } from '../createDeferred.ts'
import { css } from '../css.ts'
import { Document, type IDocumentProps } from '../Document.tsx'
import { getCharDimensions } from '../getCharDimensions.ts'
import { getDimensions } from '../getDimensions.ts'
import { traverse } from '../traverse.ts'
import { chain } from '../utils/chain.ts'
import { cropCanvas } from '../utils/cropCanvas.ts'
import { makeStyleProps } from '../utils/makeStyleProps.ts'
import { range } from '../utils/range.ts'
import PdfWorker from '../workers/pdfWorker?worker'
import type { WorkerInput, WorkerOutput } from '../workers/types.ts'

export interface IUseDocumentOptions
  extends Partial<Omit<IDocumentProps, 'ref'>> {
  /**
   * A scaling factor applied to the document to reduce its on-screen size.
   *
   * By default, the document is scaled down from 300 DPI ANSI Letter size
   * using a factor of 3.5 to ensure it fits within typical screen resolutions.
   *
   */
  workspaceScale?: number
  autoScale?: boolean
  autoPaginate?: boolean
}

export const useDocument = ({
  format = 'Letter',
  margin = DEFAULT_MARGIN,
  workspaceScale = 1,
  autoScale = true,
  autoPaginate = true,
  ...props
}: IUseDocumentOptions = {}) => {
  const ref = useRef<HTMLDivElement>(null)
  const tesseractWorkerRef = useRef<Worker | null>(null)

  const [isCreating, setIsCreating] = useState(false)
  const [pdfDataUri, setPdfDataUri] = useState('')
  const [dataUri, setDataUri] = useState('')
  const pdf = useRef<jsPDF>(null)

  const [WIDTH, HEIGHT] =
    PAPER_DIMENSIONS[format?.toUpperCase() as Uppercase<IPaperFormat>]

  const MARGIN_MAP: Record<IMargin, number> = {
    Standard: DEFAULT_MARGIN,
    Thin: DEFAULT_MARGIN / 2,
    None: 0
  }

  const width = WIDTH / workspaceScale
  const height = HEIGHT / workspaceScale

  const padding =
    (typeof margin === 'number' ? margin : MARGIN_MAP[margin]) / workspaceScale

  const pdfDoc = useMemo(() => import('jspdf'), [])
  const htmlToImage = useMemo(() => (async () => import('html-to-image'))(), [])

  useEffect(() => {
    const worker = tesseractWorkerRef.current

    return () => {
      worker?.terminate()
    }
  }, [])

  const terminateWorker = async () => {
    await tesseractWorkerRef?.current?.terminate()
    tesseractWorkerRef.current = null
  }

  const getWorker = async (): Promise<Worker> => {
    if (tesseractWorkerRef.current) return tesseractWorkerRef.current

    const { createWorker } = await import('tesseract.js')

    const [worker] = await chain(
      async () => createWorker('eng'),
      async (worker) => worker.setParameters(OCR_PARAMS)
    )

    tesseractWorkerRef.current = worker

    return worker
  }

  const create = useCallback(async () => {
    setIsCreating(true)

    const exec = async () => {
      if (!ref.current) return Promise.resolve(void 0)

      const pdfWorker = new PdfWorker()

      const { promise, resolve } = createDeferred<HTMLDivElement | void>()

      const { jsPDF } = await pdfDoc

      const doc = new jsPDF('p', 'px', 'letter', true)
      pdf.current = doc

      const sheet = new CSSStyleSheet()
      const clonedNode = ref.current?.cloneNode(true) as HTMLDivElement

      const { scrollHeight } = ref.current
      const trueHeight = Math.max(height, scrollHeight)

      await sheet.replace(
        css`
          .pdfize-node {
            padding: ${padding}px;
            min-height: ${trueHeight}px;
            width: ${width}px;
            margin: 0px;
            border: none;
            overflow: visible;
          }
        `.replace(/[\s\n]*/gm, '')
      )

      clonedNode.classList.add('pdfize-node')
      document.body.appendChild(clonedNode)

      document.adoptedStyleSheets = [
        ...Array.from(document.adoptedStyleSheets ?? []),
        sheet
      ]

      const worker = await getWorker()

      traverse(clonedNode, (node: HTMLElement) => {
        const style = getComputedStyle(node)

        const overflow = makeStyleProps(['overflow', 'overflowX', 'overflowY'])

        overflow.forEach((property) => {
          const value = style[property]

          if (typeof value === 'string' && ['scroll', 'auto'].includes(value)) {
            node.style[property] = 'hidden'
          }
        })
      })

      const testNode = clonedNode.cloneNode(true) as HTMLDivElement
      const knownFontSize = getCharDimensions(testNode)

      document.body.removeChild(testNode)

      const TO_CANVAS_OPTIONS: Options = {
        backgroundColor: 'white',
        quality: 1,
        pixelRatio: workspaceScale,
        width,
        canvasWidth: width
      }

      const { toCanvas } = await htmlToImage

      const canvas = await toCanvas(clonedNode, TO_CANVAS_OPTIONS)

      setDataUri(canvas.toDataURL())

      clonedNode.querySelectorAll("[data-ocr='false']")?.forEach((node) => {
        if (node instanceof HTMLElement) {
          node.style.opacity = '0'
        }
      })

      document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
        (s) => s !== sheet
      )

      const dimensions = { width, height, ratio: NaN }

      const { ratio, ...scaled } = autoScale
        ? getDimensions(dimensions, doc.internal.pageSize)
        : dimensions

      // drawOcrFromBlocks({
      //   ...drawOcrArgs,
      //   canvas: cropped[1]
      // })

      // doc.addImage({
      //   imageData: cropped[0],
      //   format: 'JPEG',
      //   x: 0,
      //   y: 0,
      //   ...scaled
      // })

      async function getPaginatedCanvases(
        canvas: HTMLCanvasElement,
        node: HTMLElement
      ): Promise<[HTMLCanvasElement, HTMLCanvasElement][]> {
        const pageHeightPx = height * workspaceScale
        const pageCount = Math.ceil(canvas.height / pageHeightPx)

        return await Promise.all(
          range(pageCount).map(
            async (page): Promise<[HTMLCanvasElement, HTMLCanvasElement]> => {
              const offsetY = page * pageHeightPx

              const heightForPage = Math.min(
                pageHeightPx,
                canvas.height - offsetY
              )

              const freshClone = await toCanvas(node, TO_CANVAS_OPTIONS)

              return cropCanvas(
                [canvas, freshClone],
                offsetY,
                heightForPage
              ) as [HTMLCanvasElement, HTMLCanvasElement]
            }
          )
        )
      }

      const cropped = await getPaginatedCanvases(canvas, clonedNode)

      cropped[0][1].toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          window.open(url, '_blank')
        }
      })

      const bitmaps: [ImageBitmap, ImageBitmap][] = await Promise.all(
        cropped.map(async ([a, b]) => {
          const [bmpA, bmpB] = await Promise.all([
            createImageBitmap(a),
            createImageBitmap(b)
          ])
          return [bmpA, bmpB] as const
        })
      )

      const input: WorkerInput = {
        bitmaps,
        options: {
          width,
          height,
          workspaceScale,
          autoScale,
          autoPaginate
        }
      }

      pdfWorker.postMessage(input)

      pdfWorker.onmessage = (e: MessageEvent<WorkerOutput>) => {
        const { pdfBlob } = e.data

        // const anchor = document.createElement('a')
        // const url = URL.createObjectURL(pdfBlob)

        // anchor.href = url
        // anchor.click()

        setIsCreating(false)
        pdfWorker.terminate()
      }

      setDataUri(canvas.toDataURL())
      setPdfDataUri(doc.output('datauristring'))

      // doc.save()

      resolve(clonedNode)

      return promise
    }

    const node = await exec()

    setIsCreating(false)

    if (node) document.body.removeChild(node)
  }, [])

  useEffect(() => {
    create()
  }, [])

  const Viewer = ({ fallback }: { fallback?: ReactNode }) =>
    pdfDataUri ? (
      <object
        height={height}
        width={width}
        data={pdfDataUri}
        type="application/pdf"
      >
        {fallback}
      </object>
    ) : null

  const PreviewImage = () =>
    dataUri ? <img style={{ width, height }} src={dataUri} /> : null

  const RefDocument = memo(({ children }: PropsWithChildren) => (
    <Document
      {...props}
      ref={ref}
      margin={padding}
      width={width}
      height={height}
    >
      {children}
    </Document>
  ))

  return {
    Document: RefDocument,
    create,
    Viewer,
    PreviewImage,
    get pdf() {
      return pdf.current
    },
    isCreating,
    download: () => pdf.current?.save(),
    terminateWorker
  }
}
