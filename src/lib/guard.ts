import { type DebugLogger, type LogLevel, LOG_LEVELS } from './DebugLogger'

export function guard<T extends (...args: any[]) => any>(
  _: DebugLogger,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> {
  const { value: originalMethod } = descriptor

  descriptor.value = function (this: DebugLogger, ...args: unknown[]) {
    const levelToCheck: LogLevel = (() => {
      if (LOG_LEVELS.includes(propertyKey as LogLevel)) {
        return propertyKey as LogLevel
      }

      const levelArg = args.find(
        (arg) => typeof arg === 'string' && LOG_LEVELS.includes(arg as LogLevel)
      ) as LogLevel | undefined

      return levelArg ?? 'info'
    })()

    if (!this.shouldLog(levelToCheck)) return

    return originalMethod!.apply(this, args)
  } as T

  return descriptor
}
