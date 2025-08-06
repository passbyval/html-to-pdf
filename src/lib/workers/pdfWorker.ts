import jsPDF from 'jspdf'
import { createWorker } from 'tesseract.js'
import { OCR_PARAMS } from '../constants'
import { blobToDataURL } from '../utils/blobToDataURL'
import { chain } from '../utils/chain'
import { drawOcrFromBlocks } from '../utils/drawOcrFromBlocks'
import { getDimensions } from '../utils/getDimensions'
import { getPaginatedCanvases } from '../utils/getPaginatedCanvases'
import { transferBitmapToCanvas } from '../utils/transferBitmapToCanvas'

import type { PdfWorkerInput, PdfWorkerOutput } from './types'

const workerPromise = (async () => {
  const [worker] = await chain(
    async () => createWorker('eng'),
    async (worker) => worker.setParameters(OCR_PARAMS)
  )

  return worker
})()

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
    autoPaginate,
    knownFontSize,
    workspaceScale
  } = options

  const doc = new jsPDF('p', 'px', [width, height], true)
  const totalHeight = height * workspaceScale

  const [canvas] = transferBitmapToCanvas(bitmap)
  const [ocrCanvas] = transferBitmapToCanvas(ocrBitmap)

  const cropped = await getPaginatedCanvases(canvas, ocrCanvas, totalHeight)
  const withPagination = autoPaginate ? cropped : [cropped[0]]

  const durations: number[] = []

  for await (const [index, [canvas, ocrCanvas]] of withPagination.entries()) {
    const start = performance.now()
    const page = index === 0 ? doc : doc.addPage()

    const [, dataURL] = await chain(
      () => canvas.convertToBlob({ type: 'image/jpeg', quality: 1 }),
      blobToDataURL
    )

    const { ratio } = getDimensions(canvas, doc.internal.pageSize)

    await drawOcrFromBlocks({
      doc: page,
      canvas: ocrCanvas,
      ratio,
      knownFontSize,
      worker: await workerPromise
    })

    page.addImage({
      imageData: dataURL,
      format: 'JPEG',
      x: 0,
      y: 0,
      height: doc.internal.pageSize.height,
      width: doc.internal.pageSize.width
    })

    const end = performance.now()
    const durationMs = end - start

    durations.push(durationMs)

    const pageNumber = index + 1
    const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length
    const totalPages = withPagination.length
    const pagesRemaining = totalPages - (index + 1)

    const message: PdfWorkerOutput = {
      type: 'progress',
      pageNumber,
      totalPages,
      progress: (index + 1) / totalPages,
      durationMs,
      eta: avgMs * pagesRemaining,
      totalEstimatedTime: avgMs * totalPages
    }

    postMessage(message)
  }

  const buffer = doc.output('arraybuffer')

  const result: PdfWorkerOutput = {
    type: 'done',
    pdfBuffer: buffer
  }

  postMessage(result, [buffer])
}
