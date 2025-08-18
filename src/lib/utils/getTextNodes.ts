import { DebugLogger, type LogLevel } from '../DebugLogger'

export interface ITextNode {
  text: string
  fontSize: number
  letterSpacing: number
  x: number
  y: number
  width: number
  height: number
}

export function getTextNodes(
  root: Node,
  workspaceScale: number,
  debug: LogLevel
): ITextNode[] {
  const startTime = Date.now()
  const logger = DebugLogger.create(debug)

  logger.verbose('Extracting text nodes with positions from DOM', {
    rootType: root.constructor.name
  })

  const rootElement =
    root.nodeType === Node.ELEMENT_NODE
      ? (root as Element)
      : (root as any).parentElement

  const rootRect = rootElement
    ? rootElement.getBoundingClientRect()
    : { left: 0, top: 0 }

  function createTextNodeFromElement(textNode: Node): ITextNode | null {
    const { parentElement: parent } = textNode

    if (!parent) {
      return null
    }

    const style = getComputedStyle(parent)

    const invisibleStyles = [
      ['display', 'none'],
      ['visibility', 'hidden'],
      ['opacity', '0']
    ] as const

    const isInvisible = invisibleStyles.some(
      ([prop, val]) => style[prop as keyof CSSStyleDeclaration] === val
    )

    if (isInvisible) return null

    const range = document.createRange()
    range.selectNodeContents(textNode)
    const rect = range.getBoundingClientRect()

    if (rect.width === 0 || rect.height === 0) {
      return null
    }

    const fontSize = parseFloat(style.fontSize) || 0
    const letterSpacing = parseFloat(style.letterSpacing) || 0

    const relativeX = rect.left - rootRect.left
    const relativeY = rect.top - rootRect.top

    return {
      text: textNode.textContent ?? '',
      fontSize: fontSize * workspaceScale,
      letterSpacing,
      x: relativeX * workspaceScale,
      y: relativeY * workspaceScale,
      width: rect.width * workspaceScale,
      height: rect.height * workspaceScale
    }
  }

  function* textNodeGenerator(node: Node): Generator<ITextNode> {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        n.textContent?.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT
    })

    const processedCount = { value: 0 }
    const skippedCount = { value: 0 }

    for (
      let current = walker.nextNode();
      current;
      current = walker.nextNode()
    ) {
      const textNodeData = createTextNodeFromElement(current)

      if (textNodeData === null) {
        skippedCount.value++
        continue
      }

      processedCount.value++
      yield textNodeData
    }

    logger.verbose('Text node processing complete', {
      processedNodes: processedCount.value,
      skippedNodes: skippedCount.value,
      totalAttempted: processedCount.value + skippedCount.value
    })
  }

  const results = Array.from(textNodeGenerator(root))
  const extractionTime = Date.now() - startTime

  const calculateStats = (nodes: readonly ITextNode[]) => {
    if (nodes.length === 0) {
      return {
        totalNodes: 0,
        totalCharacters: 0,
        averageFontSize: 0,
        positionRange: null
      }
    }

    const totalCharacters = nodes.reduce(
      (sum, node) => sum + node.text.length,
      0
    )
    const averageFontSize = Math.round(
      nodes.reduce((sum, node) => sum + node.fontSize, 0) / nodes.length
    )

    const xValues = nodes.map((n) => n.x)
    const xPlusWidthValues = nodes.map((n) => n.x + n.width)
    const yValues = nodes.map((n) => n.y)
    const yPlusHeightValues = nodes.map((n) => n.y + n.height)

    const positionRange = {
      minX: Math.min(...xValues),
      maxX: Math.max(...xPlusWidthValues),
      minY: Math.min(...yValues),
      maxY: Math.max(...yPlusHeightValues)
    }

    return {
      totalNodes: nodes.length,
      totalCharacters,
      averageFontSize,
      positionRange
    }
  }

  const textStats = calculateStats(results)

  logger.info('Text extraction with positions completed', {
    nodes: textStats.totalNodes,
    characters: textStats.totalCharacters,
    avgFontSize: `${textStats.averageFontSize}px`,
    positionRange: textStats.positionRange,
    duration: `${extractionTime}ms`
  })

  return results
}
