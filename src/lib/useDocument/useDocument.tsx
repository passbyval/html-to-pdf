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
import { drawOcrWord } from '../drawOcrWord.ts'
import { getCharDimensions } from '../getCharDimensions.ts'
import { getDimensions } from '../getDimensions.ts'
import { traverse } from '../traverse.ts'
import { makeStyleProps } from '../utils/makeStyleProps.ts'

export interface IUseDocumentOptions
  extends Partial<Omit<IDocumentProps, 'ref'>> {
  workspaceSize?: number
  autoScale?: boolean
}

export const useDocument = ({
  format = 'Letter',
  margin = DEFAULT_MARGIN,
  workspaceSize = 5,
  autoScale = true,
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

  const width = WIDTH / workspaceSize
  const height = HEIGHT / workspaceSize
  const padding =
    (typeof margin === 'number' ? margin : MARGIN_MAP[margin]) / workspaceSize

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

    const worker = await createWorker('eng')
    await worker.setParameters(OCR_PARAMS)

    tesseractWorkerRef.current = worker

    return worker
  }

  const create = useCallback(async () => {
    setIsCreating(true)

    const exec = async () => {
      const { promise, resolve } = createDeferred<{
        error?: unknown | Error | false
        node?: HTMLDivElement
      }>()

      try {
        const [{ jsPDF }, { toCanvas }] = await Promise.all([
          pdfDoc,
          htmlToImage
        ])

        const doc = new jsPDF('p', 'px', 'letter')
        pdf.current = doc

        const sheet = new CSSStyleSheet()
        const clonedNode = ref.current?.cloneNode(true) as HTMLDivElement

        await sheet.replace(
          css`
            .pdfize-node {
              padding: ${padding}px;
              height: ${height}px;
              width: ${width}px;
              margin: 0px;
              border: none;
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
        })

        const testNode = clonedNode.cloneNode(true) as HTMLDivElement
        const knownFontSize = getCharDimensions(testNode)

        document.body.removeChild(testNode)

        const TO_CANVAS_OPTIONS: Options = {
          backgroundColor: 'white',
          quality: 1,
          height,
          width,
          pixelRatio: workspaceSize,
          canvasHeight: height,
          canvasWidth: width
        }

        const canvas = await toCanvas(clonedNode, TO_CANVAS_OPTIONS)

        clonedNode.querySelectorAll("[data-ocr='false']")?.forEach((node) => {
          if (node instanceof HTMLElement) {
            node.style.opacity = '0'
          }
        })

        const ocrCanvas = await toCanvas(clonedNode, TO_CANVAS_OPTIONS)

        document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
          (s) => s !== sheet
        )

        const dimensions = { width, height, ratio: NaN }

        const { ratio, ...scaled } = autoScale
          ? getDimensions(dimensions, doc.internal.pageSize)
          : dimensions

        const {
          data: { blocks = [] }
        } = await worker.recognize(ocrCanvas, {}, { blocks: true })

        if (blocks) {
          for (const block of blocks) {
            for (const paragraph of block.paragraphs) {
              for (const line of paragraph.lines) {
                const { bbox: linebbox } = line

                const height = linebbox.y1 - linebbox.y0

                const multiplier =
                  knownFontSize / ((height * ratio) / workspaceSize)

                const fontSize = (height * ratio * multiplier) / workspaceSize

                drawOcrWord(doc, line, fontSize, workspaceSize, ratio)
              }
            }
          }
        }

        /**
         * Add image after OCR, so that OCR text is invisible.
         */
        doc.addImage({
          imageData: canvas,
          format: 'JPEG',
          x: 0,
          y: 0,
          ...scaled
        })

        setDataUri(canvas.toDataURL())
        setPdfDataUri(doc.output('datauristring'))

        resolve({ error: false, node: clonedNode })
      } catch (error) {
        resolve({ error })
      }

      return promise
    }

    const { error, node } = await exec()

    if (error) {
      throw error
    }

    setIsCreating(false)

    if (node) {
      document.body.removeChild(node)
    }
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
