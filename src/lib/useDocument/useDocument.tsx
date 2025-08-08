import type { Options } from 'html-to-image/lib/types'
import {
  memo,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode
} from 'react'
import { Document } from '../components/Document.tsx'
import {
  DEFAULT_MARGIN,
  PAPER_DIMENSIONS,
  type IMargin,
  type IPaperFormat
} from '../constants.ts'
import { chain } from '../utils/chain.ts'
import { css } from '../utils/css.ts'
import { makeStyleProps } from '../utils/makeStyleProps.ts'
import { traverse } from '../utils/traverse.ts'
import PdfWorker from '../workers/pdfWorker.ts?worker'
import {
  Progress,
  type PdfWorkerInput,
  type PdfWorkerOutput
} from '../workers/types.ts'
import { getTextNodes } from '../utils/getTextNodes.ts'
import { getUniqueCharsFromTextNodes } from '../utils/getUniqueCharsFromTextNodes.ts'
import { getUniqueWordsFromTextNodes } from '../utils/getUniqueWordsFromTextNodes.ts'
import type { IDownload, IUseDocumentOptions } from './types.ts'

export const useDocument = ({
  format = 'Letter',
  margin = DEFAULT_MARGIN,
  workspaceScale = 3.5,
  autoPaginate = true,
  debug = false,
  ocrSettings = {
    confidenceThreshold: 30
  },
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

  const create = (): Promise<{
    download: IDownload
    message?: string
  }> => {
    setIsCreating(true)
    setProgress(0)

    return new Promise(async (resolve) => {
      if (!ref.current) return Promise.resolve({ download: () => () => void 0 })

      if (!(ref.current instanceof HTMLElement)) {
        const current = (ref.current as unknown)!
        const instanceType = current.constructor.name

        return Promise.reject({
          download: () => () => void 0,
          message: `Invalid element provided. Expected type of HTMLElement, got ${instanceType}.`
        })
      }

      const pdfWorker = new PdfWorker()
      const clonedNode = ref.current.cloneNode(true) as HTMLElement

      const { scrollHeight } = ref.current
      const trueHeight = Math.max(height, scrollHeight)

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
        will-change: transform;
        backface-visibility: hidden;
        text-rendering: optimizeLegibility;
        image-rendering: crisp-edges;
      `

      document.body.appendChild(clonedNode)

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

      const userDefinedReplacements = Array.from(
        clonedNode.querySelectorAll('[data-ocr]')
      )?.reduce<string[]>((acc, node) => {
        const value = node.getAttribute('data-ocr')

        if (!(node instanceof HTMLElement) || !value) return acc

        if (value === 'false') {
          node.style.opacity = '0'
          return acc
        }

        const { height, width } = node.getBoundingClientRect()

        const [x, y] = ['data-ocr-x', 'data-ocr-y'].map(
          (attr) => parseFloat(node.getAttribute(attr) ?? '') || 0
        )

        const style = getComputedStyle(node)
        const fontSize = Math.max(height, parseFloat(style.fontSize))

        const ocrElement = document.createElement('div')
        const textSpan = document.createElement('span')

        ocrElement.style.cssText = css`
          display: inline-block;
          position: relative;
          margin-top: ${y}px;
          margin-left: ${x}px;
          width: ${width}px;
          height: ${height}px;
          background: #fff;
          line-height: 1;
          white-space: nowrap;
        `

        textSpan.textContent = value

        textSpan.style.cssText = css`
          background: #fff;
          color: #000;
          letter-spacing: 3px;
          font-family: 'Georgia', serif;
          font-weight: 400;
          font-size: ${Math.max(fontSize, 48)}px;
          line-height: 1;
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: none;
          font-smooth: never;
          display: inline-block;
          border: 1px solid transparent;
          vertical-align: baseline;
        `

        const attributes = Array.from(node.attributes)
        attributes.forEach((attr) => {
          if (attr.name.startsWith('data-')) {
            const clonedAttr = attr.cloneNode(true)

            if (clonedAttr instanceof Attr) {
              ocrElement.setAttributeNode(clonedAttr)
            }
          }
        })

        ocrElement.appendChild(textSpan)
        node.replaceWith(ocrElement)

        return acc.includes(value) ? acc : [...acc, value]
      }, [])

      const textNodes = getTextNodes(clonedNode, canvas)
      const charWhiteList = getUniqueCharsFromTextNodes(textNodes).join('')

      const customWords = getUniqueWordsFromTextNodes(textNodes, [
        ...userDefinedReplacements,
        'Cl0udCats'
      ])
        .filter((w) => w !== 'CloudCats')
        .join('\n')

      const ocrCanvas = await toCanvas(clonedNode, TO_CANVAS_OPTIONS)

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
          customWords,
          charWhiteList,
          ocrSettings
        }
      }

      pdfWorker.postMessage(input, [bitmap, ocrBitmap])

      pdfWorker.onmessage = (e: MessageEvent<PdfWorkerOutput>) => {
        const { type, message, pdfBuffer } = e.data

        if (type === Progress.Pending) {
          return updateProgress(e.data.progress ?? 0)
        }

        if (type === Progress.Done) {
          pdfWorker.terminate()

          setIsCreating(false)
          setProgress(100)

          const blob = new Blob([pdfBuffer!], { type: 'application/pdf' })
          const url = URL.createObjectURL(blob)

          setPdfDataUri(url)

          return resolve({
            download: (options) => {
              if (options?.type === 'direct') {
                const anchor = document.createElement('a')

                ;[
                  ['href', url],
                  ['target', '_blank'],
                  ['rel', 'noopener noreferrer'],
                  ['download', 'document.pdf']
                ].forEach(([key, value]) => anchor.setAttribute(key, value))

                anchor.click()
                document.removeChild(anchor)

                return () => void 0
              }

              window.open(url, '_blank')

              return () => URL.revokeObjectURL(url)
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
