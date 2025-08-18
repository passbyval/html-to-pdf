export const sanitizeForTransfer = (value: unknown, depth = 0): unknown => {
  if (depth > 100) return String(value)

  if (
    value === null ||
    value === undefined ||
    ['string', 'number', 'boolean'].includes(typeof value)
  ) {
    return value
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForTransfer(item, depth + 1))
  }

  if (value.constructor?.name === 'Object') {
    try {
      return Object.fromEntries(
        Object.entries(value).map(([key, val]) => [
          key,
          sanitizeForTransfer(val, depth + 1)
        ])
      )
    } catch {
      return String(value)
    }
  }

  return `[${value.constructor?.name ?? typeof value}]`
}
