/**
 * Recursively iterate through a DOM tree.
 */
export const traverse = <T extends Element | Node | ChildNode>(
  node: T,
  callback: <H extends HTMLElement>(node: H) => void
) => {
  if (node instanceof HTMLElement) {
    callback(node)
  }

  if (node.hasChildNodes()) {
    for (const childNode of Array.from(node.childNodes)) {
      if ('style' in node) {
        traverse(childNode, (child) => {
          if (child instanceof HTMLElement) {
            callback(child)
          }
        })
      }
    }
  }
}
