/**
 * Traverse the DOM tree using TreeWalker and yield each HTMLElement.
 */
export function* traverse(root: Node): Generator<HTMLElement> {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) =>
      node instanceof HTMLElement
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP
  })

  if (root instanceof HTMLElement) {
    yield root
  }

  for (let current = walker.nextNode(); current; current = walker.nextNode()) {
    yield current as HTMLElement
  }
}
