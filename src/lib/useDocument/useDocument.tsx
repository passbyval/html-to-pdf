import type { Options } from 'html-to-image/lib/types'
import {
  memo,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode
} from 'react'
import { Document, type IDocumentProps } from '../components/Document.tsx'
import {
  DEFAULT_MARGIN,
  PAPER_DIMENSIONS,
  type IMargin,
  type IPaperFormat
} from '../constants.ts'
import { chain } from '../utils/chain.ts'
import { css } from '../utils/css.ts'
import { getCharDimensions } from '../utils/getCharDimensions.ts'
import { makeStyleProps } from '../utils/makeStyleProps.ts'
import { traverse } from '../utils/traverse.ts'
import PdfWorker from '../workers/pdfWorker.ts?worker'
import {
  Progress,
  type PdfWorkerInput,
  type PdfWorkerOutput
} from '../workers/types.ts'

export interface IUseDocumentOptions
  extends Partial<Omit<IDocumentProps, 'ref'>> {
  /**
   * A scaling factor applied to the document to reduce its on-screen size.
   *
   * By default, the document is scaled down from 300 DPI ANSI Letter size
   * using a factor of 3.5 so it fits within typical screen resolutions.
   *
   * Higher default resolutions ensures that the final PDF is crisp.
   *
   */
  workspaceScale?: number
  autoPaginate?: boolean
  debug?: boolean
}

export const useDocument = ({
  format = 'Letter',
  margin = DEFAULT_MARGIN,
  workspaceScale = 3.5,
  autoPaginate = true,
  debug = false,
  ...props
}: IUseDocumentOptions = {}) => {
  const ref = useRef<HTMLDivElement>(null)

  const [isCreating, setIsCreating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dataUri, setDataUri] = useState('')
  const [pdfDataUri, setPdfDataUri] = useState('')

  const updateProgress = (progress: number) => {
    const percent = Math.round(progress * 10000) / 100
    setProgress(Math.min(100, percent))
  }

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

  const htmlToImage = useMemo(() => (async () => import('html-to-image'))(), [])

  const create = (): Promise<{ download: () => void }> => {
    setIsCreating(true)
    setProgress(0)

    return new Promise(async (resolve) => {
      if (!ref.current) {
        return Promise.resolve({ download: () => void 0 })
      }

      const pdfWorker = new PdfWorker()
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
            font-smooth: antialiased;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            transform: translateZ(0);
            will-change: transform;
            backface-visibility: hidden;
            text-rendering: optimizeLegibility;
            image-rendering: crisp-edges;
          }
        `.replace(/[\s\n]*/gm, '')
      )

      clonedNode.classList.add('pdfize-node')
      document.body.appendChild(clonedNode)

      document.adoptedStyleSheets = [
        ...Array.from(document.adoptedStyleSheets ?? []),
        sheet
      ]

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

      const [{ toCanvas }, canvas] = await chain(
        async () => htmlToImage,
        async ({ toCanvas }) => toCanvas(clonedNode, TO_CANVAS_OPTIONS),
        (canvas) => setDataUri(canvas.toDataURL())
      )

      clonedNode.querySelectorAll("[data-ocr='false']")?.forEach((node) => {
        if (node instanceof HTMLElement) {
          node.style.opacity = '0'
        }
      })

      const ocrCanvas = await toCanvas(clonedNode, TO_CANVAS_OPTIONS)

      document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
        (s) => s !== sheet
      )

      document.body.removeChild(clonedNode)

      const [bitmap, ocrBitmap] = await Promise.all(
        [canvas, ocrCanvas].map((c) =>
          createImageBitmap(c, {
            resizeQuality: 'high'
          })
        )
      )

      const input: PdfWorkerInput = {
        options: {
          height,
          width,
          margin: padding,
          pageHeight: height * workspaceScale,
          workspaceScale,
          bitmap,
          ocrBitmap,
          autoPaginate,
          knownFontSize
        }
      }

      pdfWorker.postMessage(input, [bitmap, ocrBitmap])

      pdfWorker.onmessage = (e: MessageEvent<PdfWorkerOutput>) => {
        const { type, message, pdfBuffer } = e.data

        if (type === Progress.Pending) {
          updateProgress(e.data.progress ?? 0)
        }

        if (type === Progress.Done) {
          pdfWorker.terminate()
          setIsCreating(false)
          setProgress(100)

          resolve({
            download: () => {
              const blob = new Blob([pdfBuffer!], { type: 'application/pdf' })

              const url = URL.createObjectURL(blob)
              const anchor = document.createElement('a')

              const attrs = [
                ['href', url],
                ['target', '_blank'],
                ['rel', 'noopener noreferrer'],
                ['download', 'document.pdf']
              ]

              attrs.forEach(([key, value]) => anchor.setAttribute(key, value))

              // anchor.click()
              window.open(url, '_blank')

              URL.revokeObjectURL(url)
            }
          })
        }

        if (type === Progress.Error) {
          setIsCreating(false)
          setProgress(0)
          console.error('Worker error:', message)
        }
      }
    })
  }

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
    isCreating,
    progress
  }
}
