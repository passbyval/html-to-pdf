import jsPDF from 'jspdf'
import { createWorker } from 'tesseract.js'
import { OCR_PARAMS } from '../constants'
import { getDimensions } from '../getDimensions'
import { chain } from '../utils/chain'
import { drawOcrFromBlocks } from '../utils/drawOcrFromBlocks'
import type { WorkerInput, WorkerOutput } from './types'

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const { bitmaps, options } = e.data

  const {
    width,
    height,
    workspaceScale,
    autoScale,
    autoPaginate,
    knownFontSize
  } = options

  const doc = new jsPDF('p', 'px', 'letter', true)

  const [worker] = await chain(
    async () => createWorker('eng'),
    async (worker) => worker.setParameters(OCR_PARAMS)
  )

  const dimensions = { width, height, ratio: NaN }

  const { ratio, ...scaled } = autoScale
    ? getDimensions(dimensions, doc.internal.pageSize)
    : dimensions

  for (const [index, bitmap] of bitmaps.entries()) {
    const page = index === 0 ? doc : doc.addPage()

    const [canvas, ocrCanvas] = bitmap.map(
      (b) => new OffscreenCanvas(b.width, b.height)
    )

    canvas.getContext('2d')!.drawImage(bitmap[0], 0, 0)
    ocrCanvas.getContext('2d')!.drawImage(bitmap[1], 0, 0)

    await drawOcrFromBlocks({
      doc,
      canvas: ocrCanvas,
      knownFontSize,
      ratio,
      worker,
      workspaceScale
    })

    const [, imageData] = await chain(
      async () => canvas.convertToBlob({ type: 'image/jpeg' }),
      async (blob) => blobToDataURL(blob)
    )

    page.addImage({
      imageData,
      format: 'JPEG',
      x: 0,
      y: 0,
      width: scaled.width,
      height: (canvas.height / workspaceScale) * ratio
    })
  }

  await worker.terminate()

  const result: WorkerOutput = {
    pdfBlob: doc.output('blob')
  }

  postMessage(result)
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onloadend = () => res(reader.result as string)
    reader.onerror = rej
    reader.readAsDataURL(blob)
  })
}
