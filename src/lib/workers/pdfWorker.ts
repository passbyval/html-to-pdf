import jsPDF from 'jspdf'
import { createWorker } from 'tesseract.js'
import { OCR_PARAMS } from '../constants'
import { getDimensions } from '../getDimensions'
import { chain } from '../utils/chain'
import { cropCanvas } from '../utils/cropCanvas'
import { drawOcrFromBlocks } from '../utils/drawOcrFromBlocks'
import type { PdfWorkerInput, PdfWorkerOutput } from './types'

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

export async function getPaginatedCanvases(
  canvas: OffscreenCanvas,
  ocrCanvas: OffscreenCanvas,
  pageHeight: number
): Promise<[OffscreenCanvas, OffscreenCanvas][]> {
  const pageCount = Math.ceil(canvas.height / pageHeight)

  return await Promise.all(
    Array.from({ length: pageCount }, (_, i) => {
      const y = i * pageHeight

      return cropCanvas([canvas, ocrCanvas], y, pageHeight) as [
        OffscreenCanvas,
        OffscreenCanvas
      ]
    })
  )
}

self.onmessage = async (e: MessageEvent<PdfWorkerInput>) => {
  if (e.data.action === 'terminate') {
    const worker = await workerPromise
    await worker.terminate()
    return
  }

  const { options } = e.data

  const {
    width,
    bitmap,
    ocrBitmap,
    height,
    autoScale,
    autoPaginate,
    knownFontSize,
    workspaceScale
  } = options

  const doc = new jsPDF('p', 'px', [width, height], true)
  const pageHeightPx = height * workspaceScale

  const [canvas] = transferBitmapToCanvas(bitmap)
  const [ocrCanvas] = transferBitmapToCanvas(ocrBitmap)

  const cropped = await getPaginatedCanvases(canvas, ocrCanvas, pageHeightPx)

  const { length: totalPages } = cropped

  for await (const [index, [canvas, ocrCanvas]] of cropped.entries()) {
    const page = index === 0 ? doc : doc.addPage()

    const dimensions = {
      width: canvas.width,
      height: canvas.height
    }

    console.log('loop', canvas.height)

    const { ratio } = autoScale
      ? getDimensions(dimensions, doc.internal.pageSize)
      : { ratio: 1 }

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
      height: doc.internal.pageSize.height,
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
