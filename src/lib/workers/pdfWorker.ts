import jsPDF from 'jspdf'
import { createWorker } from 'tesseract.js'
import { OCR_PARAMS } from '../constants'
import { getDimensions } from '../getDimensions'
import { chain } from '../utils/chain'
import { drawOcrFromBlocks } from '../utils/drawOcrFromBlocks'
import type { PdfWorkerInput, PdfWorkerOutput } from './types'

const UPSCALE = self.devicePixelRatio || 2

const workerPromise = (async () => {
  const [worker] = await chain(
    async () => createWorker('eng'),
    async (worker) => worker.setParameters(OCR_PARAMS)
  )

  return worker
})()

async function blobToDataURL(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert Blob to Data URL'))
      }
    }

    reader.onerror = () => reject(reader.error)

    reader.readAsDataURL(blob)
  })
}

function transferBitmapToCanvas(
  bitmap: ImageBitmap,
  width = bitmap.width,
  height = bitmap.height
) {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('bitmaprenderer') ?? canvas.getContext('2d')

  if (ctx instanceof ImageBitmapRenderingContext) {
    ctx?.transferFromImageBitmap(bitmap)
  } else {
    ctx?.drawImage(bitmap, 0, 0)
  }

  return [canvas, ctx] as const
}

self.onmessage = async (e: MessageEvent<PdfWorkerInput>) => {
  if (e.data.action === 'terminate') {
    const worker = await workerPromise
    await worker.terminate()
    return
  }

  const { bitmaps, options } = e.data
  const { width, height, autoScale, autoPaginate, knownFontSize } = options

  const doc = new jsPDF('p', 'px', [width, height], true)

  const bitmapsCopy = autoPaginate ? [...bitmaps] : bitmaps.slice(0, 1)
  const totalPages = bitmapsCopy.length

  for await (const [index, bitmap] of bitmapsCopy.entries()) {
    const page = index === 0 ? doc : doc.addPage()

    const [mainBitmap, ocrBitmap] = bitmap

    const [canvas] = transferBitmapToCanvas(
      mainBitmap,
      mainBitmap.width * UPSCALE,
      mainBitmap.height * UPSCALE
    )

    const [ocrCanvas] = transferBitmapToCanvas(ocrBitmap)

    const dimensions = {
      width: canvas.width / UPSCALE,
      height: canvas.height / UPSCALE,
      ratio: NaN
    }

    const { ratio, ...scaled } = autoScale
      ? getDimensions(dimensions, doc.internal.pageSize)
      : dimensions

    const [, imageData] = await chain(
      async () => canvas.convertToBlob({ type: 'image/jpeg', quality: 1 }),
      async (blob) => blobToDataURL(blob)
    )

    await drawOcrFromBlocks({
      doc: page,
      canvas: ocrCanvas,
      ratio,
      knownFontSize,
      worker: await workerPromise
    })

    page.addImage({
      imageData,
      format: 'JPEG',
      x: 0,
      y: 0,
      ...scaled,
      width: doc.internal.pageSize.width
    })

    const result: PdfWorkerOutput = {
      type: 'progress',
      pageIndex: index + 1,
      totalPages
    }

    postMessage(result)
  }

  const buffer = doc.output('arraybuffer')

  const result: PdfWorkerOutput = {
    type: 'done',
    pdfBuffer: buffer
  }

  postMessage(result, [buffer])
}
