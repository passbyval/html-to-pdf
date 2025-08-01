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
import {
  DEFAULT_MARGIN,
  PAPER_DIMENSIONS,
  type IMargin,
  type IPaperFormat
} from './constants'
import { createDeferred } from './createDeferred'
import { css } from './css'
import { Document, type IDocumentProps } from './Document'
import { drawOcrWord } from './drawOcrWord'
import { getDimensions } from './getDimensions.ts'
import { TEST_TEXT, getOcrHeightStats } from './getOcrHeightStats'
import { traverse } from './traverse'
import { makeStyleProps } from './utils/makeStyleProps.ts'

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

  const htmlToImage = useMemo(() => {
    return (async () => import('html-to-image'))()
  }, [])

  const create = useCallback(async () => {
    setIsCreating(true)

    const deferred = createDeferred<{
      error?: unknown | Error | false
      node?: HTMLDivElement
    }>()

    const exec = async () => {
      try {
        const tesseract = import('tesseract.js')

        const [{ jsPDF }, { toCanvas }] = await Promise.all([
          pdfDoc,
          htmlToImage
        ])

        const testDoc = new jsPDF('p', 'px', 'letter')
        const doc = new jsPDF('p', 'px', 'letter')

        pdf.current = doc

        const sheet = new CSSStyleSheet()
        const clonedNode = ref.current?.cloneNode(true) as HTMLDivElement

        const res = css`
          .pdfize-node {
            padding: ${padding}px;
            height: ${height}px;
            width: ${width}px;
            margin: 0px;
            border: none;
          }
        `

        sheet.replaceSync(res.replace(/[\s\n]*/gm, ''))

        clonedNode.classList.add('pdfize-node')
        document.body.appendChild(clonedNode)
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]

        const testDiv = document.createElement('div')

        const className = 'ocr-test'

        testDiv.classList.add(className)
        testDiv.innerHTML = TEST_TEXT

        clonedNode.prepend(testDiv)

        const style = getComputedStyle(
          clonedNode.querySelector(`.${className}`)!
        )
        const knownFontSize = parseFloat(style.fontSize)

        const { createWorker } = await tesseract
        const worker = await createWorker('eng')

        traverse(clonedNode, (node: HTMLElement) => {
          const style = getComputedStyle(node)

          const overflow = makeStyleProps([
            'overflow',
            'overflowX',
            'overflowY'
          ])

          overflow.forEach((property) => {
            const value = style[property]

            if (typeof value !== 'string') return

            if (['scroll', 'auto'].includes(value)) {
              node.style[property] = 'hidden'
            }
          })
        })

        const testCanvas = await toCanvas(clonedNode, {
          backgroundColor: 'white',
          quality: 1,
          height,
          width,
          pixelRatio: workspaceSize,
          canvasHeight: height,
          canvasWidth: width
        })

        console.log({ testCanvas })

        const { average: averageOcrHeight } = await getOcrHeightStats({
          canvas: testCanvas,
          worker,
          testText: TEST_TEXT
        })

        console.log({ averageOcrHeight })

        clonedNode.removeChild(testDiv)

        if (!ref.current) return {}

        const canvas = await toCanvas(clonedNode, {
          backgroundColor: 'white',
          quality: 1,
          height,
          width,
          pixelRatio: workspaceSize,
          canvasHeight: height,
          canvasWidth: width
        })

        const dimensions = {
          width,
          height,
          ratio: NaN
        }

        const { ratio, ...scaled } = autoScale
          ? getDimensions(dimensions, doc.internal.pageSize)
          : dimensions

        doc.addImage({
          imageData: canvas,
          format: 'JPEG',
          x: 0,
          y: 0,
          ...scaled
        })

        const multiplier =
          knownFontSize / ((averageOcrHeight * ratio) / workspaceSize)

        const ret = await worker.recognize(
          canvas,
          {},
          {
            blocks: true
          }
        )

        testDoc.text('Test', 20, 20)

        const {
          data: { blocks = [] }
        } = await ret

        for (const block of blocks!) {
          for (const paragraph of block.paragraphs) {
            for (const line of paragraph.lines) {
              for (const word of line.words) {
                const { text, bbox } = word

                const fontSize =
                  ((bbox.y1 - bbox.y0) * ratio * multiplier) / workspaceSize

                doc.setFontSize(fontSize)

                drawOcrWord(doc, text, bbox, fontSize, workspaceSize, ratio, {
                  spacing: 'ocr', // 'jsPDF' optional for visual rendering
                  baselineFactor: 0.25 // tweak for vertical precision
                })
              }
            }
          }
        }

        setDataUri(canvas.toDataURL())
        setPdfDataUri(doc.output('datauristring'))

        deferred.resolve({
          error: false,
          node: clonedNode
        })
        worker.terminate()
      } catch (error) {
        deferred.resolve({
          error
        })
      }

      return deferred.promise
    }

    const { node } = await exec()

    setIsCreating(false)

    return () => {
      if (node) {
        document.body.removeChild(node)
      }
    }
  }, [setPdfDataUri, setDataUri])

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

  const PreviewImage = () => {
    return dataUri ? <img style={{ width, height }} src={dataUri} /> : null
  }

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

    pdf: pdf.current,
    isCreating,
    download: () => pdf.current?.save()
  }
}
