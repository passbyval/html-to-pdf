import { DebugLogger, type LogLevel } from '../DebugLogger'

export interface ITextNode {
  text: string
  fontSize: number
  letterSpacing: number
  rect: DOMRect
}

export function getTextNodes(
  root: Node,
  canvas: HTMLCanvasElement,
  relativeTo: HTMLElement = root as HTMLElement,
  debug: LogLevel[] = []
): ITextNode[] {
  const startTime = Date.now()
  const logger = DebugLogger.create(debug)

  const scaleX = canvas.width / relativeTo.getBoundingClientRect().width
  const scaleY = canvas.height / relativeTo.getBoundingClientRect().height

  logger.verbose('Extracting text nodes from DOM', {
    rootType: root.constructor.name,
    canvasSize: `${canvas.width}x${canvas.height}`,
    scaling: `${Math.round(scaleX * 100)}% x ${Math.round(scaleY * 100)}%`
  })

  function* textNodeGenerator(node: Node): Generator<ITextNode> {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        n.textContent?.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT
    })

    const baseRect = relativeTo.getBoundingClientRect()
    let processedNodes = 0
    let skippedNodes = 0

    for (
      let current = walker.nextNode();
      current;
      current = walker.nextNode()
    ) {
      const range = document.createRange()
      range.selectNodeContents(current)
      const rect = range.getBoundingClientRect()

      const { parentElement: parent } = current
      const style = parent
        ? getComputedStyle(parent)
        : ({} as CSSStyleDeclaration)

      const invisibleStyles = [
        ['display', 'none'],
        ['visibility', 'hidden'],
        ['opacity', '0']
      ]

      const isInvisible = invisibleStyles.some(
        ([prop, val]) => style[prop as keyof CSSStyleDeclaration] === val
      )

      if (isInvisible) {
        skippedNodes++
        continue
      }

      const fontSize = parent ? parseFloat(style.fontSize) : 0
      const letterSpacing = parent ? parseFloat(style.letterSpacing) : 0

      processedNodes++

      yield {
        text: current.textContent ?? '',
        fontSize: fontSize * scaleY,
        letterSpacing: letterSpacing * scaleX,
        rect: new DOMRect(
          (rect.left - baseRect.left) * scaleX,
          (rect.top - baseRect.top) * scaleY,
          rect.width * scaleX,
          rect.height * scaleY
        )
      }
    }

    logger.verbose('Text node processing complete', {
      processedNodes,
      skippedNodes,
      totalAttempted: processedNodes + skippedNodes
    })
  }

  const results = Array.from(textNodeGenerator(root))
  const extractionTime = Date.now() - startTime

  const textStats = {
    totalNodes: results.length,
    totalCharacters: results.reduce((sum, node) => sum + node.text.length, 0),
    averageFontSize:
      results.length > 0
        ? Math.round(
            results.reduce((sum, node) => sum + node.fontSize, 0) /
              results.length
          )
        : 0
  }

  logger.info('Text extraction completed', {
    nodes: results.length,
    characters: textStats.totalCharacters,
    avgFontSize: `${textStats.averageFontSize}px`,
    duration: `${extractionTime}ms`
  })

  return results
}
