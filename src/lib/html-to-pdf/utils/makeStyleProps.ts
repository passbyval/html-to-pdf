export function makeStyleProps<T extends (keyof CSSStyleDeclaration)[]>(
  props: T
): T {
  return props
}
