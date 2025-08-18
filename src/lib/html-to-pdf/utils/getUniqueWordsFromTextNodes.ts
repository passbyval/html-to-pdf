import type { ITextNode } from './getTextNodes'

export function getUniqueWordsFromTextNodes(
  textNodes: ITextNode[],
  additionalWords: readonly string[] = []
) {
  const wordSet = new Set<string>()

  for (const node of textNodes) {
    const words = node.text.split(/\s+/).filter(Boolean)
    for (const word of words) {
      wordSet.add(word)
    }
  }

  for (const word of additionalWords) {
    if (word) {
      wordSet.add(word)
    }
  }

  return Object.freeze(Array.from(wordSet).sort())
}
