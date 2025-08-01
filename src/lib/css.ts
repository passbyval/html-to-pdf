/**
 * Trick to leverage {@link https://marketplace.visualstudio.com/items?itemName=styled-components.vscode-styled-components) vscode-styled-components}'s syntax highlighting.
 */

export const css = (styles: TemplateStringsArray, ...expressions: any[]) => {
  return styles.reduce(
    (acc, string, index) =>
      index < expressions.length
        ? `${acc}${string}${expressions[index]}`
        : `${acc}${string}`,
    ''
  )
}
