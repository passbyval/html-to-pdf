import type jsPDF from 'jspdf'

export function drawOcrWord(
  doc: jsPDF,
  line: Tesseract.Line,
  fontSize: number,
  workspaceScale: number,
  ratio: number,
  options: {
    debug?: boolean
  } = {}
) {
  if (!line.words) return

  const { debug = false } = options

  doc.setFontSize(fontSize)

  for (const word of line.words) {
    const { text, bbox } = word

    const x = (bbox.x0 * ratio) / workspaceScale
    const y0 = (line.baseline.y0 * ratio) / workspaceScale
    const y1 = (line.baseline.y1 * ratio) / workspaceScale
    const y = (y0 + y1) / 2

    const wordWidth = ((bbox.x1 - bbox.x0) * ratio) / workspaceScale
    const jspdfWidth = doc.getTextWidth(text)

    const charCount = text.length - 1
    const charSpace = charCount > 0 ? (wordWidth - jspdfWidth) / charCount : 0

    doc.text(text, x, y, {
      charSpace
    })

    if (debug) {
      doc.setDrawColor(255, 0, 0)
      doc.setLineWidth(0.25)
      doc.rect(
        (bbox.x0 * ratio) / workspaceScale,
        (bbox.y0 * ratio) / workspaceScale,
        ((bbox.x1 - bbox.x0) * ratio) / workspaceScale,
        ((bbox.y1 - bbox.y0) * ratio) / workspaceScale
      )
    }
  }
}
