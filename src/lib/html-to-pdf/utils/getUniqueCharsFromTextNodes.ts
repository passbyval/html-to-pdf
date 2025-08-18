import type { ITextNode } from './getTextNodes'

export function getUniqueCharsFromTextNodes(textNodes: ITextNode[]): string[] {
  const charSet = new Set<string>()

  for (const node of textNodes) {
    for (const char of node.text) {
      charSet.add(char)
    }
  }

  return Array.from(charSet).sort()
}
