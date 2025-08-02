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
import { drawOcrWord } from './drawOcrWord.ts'
import { getDimensions } from './getDimensions.ts'
import { TEST_TEXT } from './getOcrHeightStats'
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
  const htmlToImage = useMemo(() => (async () => import('html-to-image'))(), [])

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

        const doc = new jsPDF('p', 'px', 'letter')
        pdf.current = doc

        const sheet = new CSSStyleSheet()
        const clonedNode = ref.current?.cloneNode(true) as HTMLDivElement

        sheet.replaceSync(
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
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]

        const { createWorker } = await tesseract
        const worker = await createWorker('eng')

        await worker.setParameters({
          preserve_interword_spaces: '0'
        })

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

        const getCharDimensions = () => {
          const testDiv = document.createElement('div')
          const className = 'ocr-test'
          testDiv.classList.add(className)

          testNode.innerHTML = ''
          testDiv.style.display = 'flex'
          testDiv.style.flexDirection = 'row'
          testDiv.style.gap = '30px'
          testDiv.style.flexWrap = 'wrap'

          for (const char of TEST_TEXT) {
            const div = document.createElement('div')
            div.textContent = char.trim()
            div.style.backgroundColor = 'white'
            div.style.fontSize = '20px'
            div.style.color = 'black'
            div.style.flex = '0 1 auto'
            div.style.lineHeight = 'normal'
            div.style.alignSelf = 'auto'
            testDiv.appendChild(div)
          }

          testNode.prepend(testDiv)
          document.body.appendChild(testNode)

          const style = getComputedStyle(
            testNode.querySelector(`.${className}`)!
          )

          return parseFloat(style.fontSize)
        }

        const knownFontSize = getCharDimensions()

        const testCanvas = await toCanvas(testNode, {
          backgroundColor: 'white',
          quality: 1,
          height,
          width,
          pixelRatio: workspaceSize,
          canvasHeight: height,
          canvasWidth: width
        })

        document.body.removeChild(testNode)

        const canvas = await toCanvas(clonedNode, {
          backgroundColor: 'white',
          quality: 1,
          height,
          width,
          pixelRatio: workspaceSize,
          canvasHeight: height,
          canvasWidth: width
        })

        const dimensions = { width, height, ratio: NaN }

        const { ratio, ...scaled } = autoScale
          ? getDimensions(dimensions, doc.internal.pageSize)
          : dimensions

        const {
          data: { blocks = [] }
        } = await worker.recognize(canvas, {}, { blocks: true })

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

        deferred.resolve({ error: false, node: clonedNode })
        worker.terminate()
      } catch (error) {
        deferred.resolve({ error })
      }

      return deferred.promise
    }

    const { node } = await exec()
    setIsCreating(false)

    return () => {
      if (node) document.body.removeChild(node)
    }
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
    pdf: pdf.current,
    isCreating,
    download: () => pdf.current?.save()
  }
}
