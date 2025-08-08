export interface ITextNode {
  text: string
  fontSize: number
  letterSpacing: number
  rect: DOMRect
}

export function getTextNodes(
  root: Node,
  canvas: HTMLCanvasElement,
  relativeTo: HTMLElement = root as HTMLElement
): ITextNode[] {
  const scaleX = canvas.width / relativeTo.getBoundingClientRect().width
  const scaleY = canvas.height / relativeTo.getBoundingClientRect().height

  function* textNodeGenerator(node: Node): Generator<ITextNode> {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        n.textContent?.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT
    })

    const baseRect = relativeTo.getBoundingClientRect()

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

      if (isInvisible) continue

      const fontSize = parent ? parseFloat(style.fontSize) : 0
      const letterSpacing = parent ? parseFloat(style.letterSpacing) : 0

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
  }

  return Array.from(textNodeGenerator(root))
}
