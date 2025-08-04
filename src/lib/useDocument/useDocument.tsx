import type { Options } from 'html-to-image/lib/types'
import {
  memo,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode
} from 'react'
import {
  DEFAULT_MARGIN,
  PAPER_DIMENSIONS,
  type IMargin,
  type IPaperFormat
} from '../constants.ts'
import { css } from '../css.ts'
import { Document, type IDocumentProps } from '../Document.tsx'
import { getCharDimensions } from '../getCharDimensions.ts'
import { traverse } from '../traverse.ts'
import { cropCanvas } from '../utils/cropCanvas.ts'
import { makeStyleProps } from '../utils/makeStyleProps.ts'
import { range } from '../utils/range.ts'
import PdfWorker from '../workers/pdfWorker.ts?worker'
import type { PdfWorkerInput, PdfWorkerOutput } from '../workers/types.ts'

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
  autoScale?: boolean
  autoPaginate?: boolean
  debug?: boolean
}

export const useDocument = ({
  format = 'Letter',
  margin = DEFAULT_MARGIN,
  workspaceScale = 3.5,
  autoScale = true,
  autoPaginate = true,
  debug = false,
  ...props
}: IUseDocumentOptions = {}) => {
  const ref = useRef<HTMLDivElement>(null)

  const [isCreating, setIsCreating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dataUri, setDataUri] = useState('')

  const updateProgress = (progress: number) => {
    setProgress((prev) => {
      const total = progress * (100 - prev) + prev
      const rounded = Math.round(total * 100) / 100

      return Math.min(100, rounded)
    })
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
    setProgress(1)

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

      traverse(clonedNode, (node: HTMLElement) => {
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

      const ocrCanvas = await toCanvas(clonedNode, TO_CANVAS_OPTIONS)

      document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
        (s) => s !== sheet
      )

      function findVisualPageBreaks(
        canvas: HTMLCanvasElement,
        pageHeight: number,
        tolerance = 5
      ): number[] {
        const ctx = canvas.getContext('2d')
        if (!ctx) return []

        const { width, height } = canvas
        const imageData = ctx.getImageData(0, 0, width, height).data

        const isRowMostlyWhite = (y: number): boolean =>
          range(width).reduce((count, x) => {
            const pixelIndex = (y * width + x) * 4

            const [r, g, b] = [
              imageData[pixelIndex],
              imageData[pixelIndex + 1],
              imageData[pixelIndex + 2]
            ]

            const isDarkPixel = r + g + b < 700

            return isDarkPixel ? count + 1 : count
          }, 0) <= tolerance

        const [result] = range(height).reduce<[number[], number]>(
          ([breaks, lastBreak], y) => {
            const isNewBreak =
              y >= pageHeight &&
              y - lastBreak >= pageHeight &&
              isRowMostlyWhite(y)

            return isNewBreak ? [[...breaks, y], y] : [breaks, lastBreak]
          },
          [[], 0]
        )

        if (debug) {
          const lineWidth = 3
          ctx.strokeStyle = 'red'
          ctx.lineWidth = lineWidth

          result.forEach((y) => {
            const adjustedY = y + lineWidth / 2
            ctx.beginPath()
            ctx.moveTo(0, adjustedY)
            ctx.lineTo(width, adjustedY)
            ctx.stroke()
          })
        }

        return result
      }

      async function getPaginatedCanvases(
        canvas: HTMLCanvasElement
      ): Promise<[HTMLCanvasElement, HTMLCanvasElement][]> {
        const pageHeightPx = height * workspaceScale
        const safeBreaks = findVisualPageBreaks(canvas, pageHeightPx)

        const offsets = [0, ...safeBreaks, canvas.height]

        return await Promise.all(
          range(offsets.length - 1).map(
            (i) =>
              cropCanvas(
                [canvas, ocrCanvas],
                offsets[i],
                offsets[i + 1] - offsets[i]
              ) as [HTMLCanvasElement, HTMLCanvasElement]
          )
        )
      }

      const cropped = await getPaginatedCanvases(canvas)

      const bitmaps: [ImageBitmap, ImageBitmap][] = await Promise.all(
        cropped.map(async ([a, b]) => {
          const [bmpA, bmpB] = await Promise.all([
            createImageBitmap(a, { resizeQuality: 'high' }),
            createImageBitmap(b, { resizeQuality: 'high' })
          ])
          return [bmpA, bmpB] as const
        })
      )

      document.body.removeChild(clonedNode)

      const input: PdfWorkerInput = {
        bitmaps,
        options: {
          height,
          width,
          workspaceScale,
          autoScale,
          autoPaginate,
          knownFontSize
        }
      }

      setProgress(10)

      pdfWorker.postMessage(input)

      pdfWorker.onmessage = (e: MessageEvent<PdfWorkerOutput>) => {
        const {
          type,
          message,
          pageIndex = 0,
          totalPages = 0,
          pdfBuffer
        } = e.data

        if (type === 'progress') {
          updateProgress(pageIndex / totalPages)
          if (debug)
            console.debug(`Rendering page ${pageIndex} of ${totalPages}`)
        }

        if (type === 'done') {
          pdfWorker.terminate()
          setIsCreating(false)
          setProgress(0)

          resolve({
            download: () => {
              const blob = new Blob([pdfBuffer!], { type: 'application/pdf' })

              const url = URL.createObjectURL(blob)
              const anchor = document.createElement('a')

              anchor.setAttribute('href', url)
              anchor.setAttribute('target', '_blank')
              anchor.setAttribute('rel', 'noopener noreferrer')
              anchor.setAttribute('download', 'document.pdf')

              // anchor.click()
              window.open(url, '_blank')

              URL.revokeObjectURL(url)
            }
          })
        }

        if (type === 'error') {
          setIsCreating(false)
          setProgress(0)
          console.error('Worker error:', message)
        }
      }
    })
  }

  let pdfDataUri = ''

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
