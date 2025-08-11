export type LogLevel = 'verbose' | 'debug' | 'info' | 'warn' | 'error'

export const LOG_LEVELS: Record<Uppercase<LogLevel>, number> = {
  VERBOSE: 0b10000,
  DEBUG: 0b01000,
  INFO: 0b00100,
  WARN: 0b00010,
  ERROR: 0b00001
}

function guard<T extends (...args: any[]) => any>(
  _: DebugLogger,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> {
  const originalMethod = descriptor.value!
  const levels = Object.keys(LOG_LEVELS)

  descriptor.value = function (this: DebugLogger, ...args: any[]) {
    const levelToCheck: LogLevel = (() => {
      if (levels.includes(propertyKey.toUpperCase())) {
        return propertyKey as LogLevel
      }

      const levelArg = args.find(
        (arg) => typeof arg === 'string' && levels.includes(arg.toUpperCase())
      ) as LogLevel | undefined

      return levelArg ?? 'info'
    })()

    if (
      LOG_LEVELS[levelToCheck.toUpperCase() as Uppercase<LogLevel>] <=
      this.literal
    ) {
      return originalMethod.apply(this, args)
    }
  } as T

  return descriptor
}

export class DebugLogger {
  level: LogLevel = 'warn'
  literal: number

  constructor(level: LogLevel = 'warn') {
    this.level = level
    this.literal = LOG_LEVELS[level.toUpperCase() as Uppercase<LogLevel>]
  }

  @guard
  verbose(message: any, ...args: any[]) {
    console.info('💬', message, ...args)
  }

  @guard
  debug(message: any, ...args: any[]) {
    console.debug('🐛', message, ...args)
  }

  time(label: string) {
    console.debug('⏱️', `Starting timer: ${label}`)
    console.time(label)
  }

  @guard
  timeEnd(label: string) {
    console.debug('🏁', `Timer finished: ${label}`)
    console.timeEnd(label)
  }

  @guard
  group(label: string, collapsed: boolean = false) {
    console.info('📁', `Group: ${label}`)

    if (collapsed) {
      console.groupCollapsed(label)
    } else {
      console.group(label)
    }
  }

  @guard
  groupCollapsed(label: string) {
    this.group(label, true)
  }

  @guard
  groupEnd() {
    console.groupEnd()
  }

  @guard
  info(message: any, ...args: any[]) {
    console.info('𝒾', message, ...args)
  }

  @guard
  warn(message: any, ...args: any[]) {
    console.warn('⚠️', message, ...args)
  }

  @guard
  error(message: any, ...args: any[]) {
    console.error('🚨', message, ...args)
  }

  static create(logLevel: LogLevel = 'warn'): DebugLogger {
    return new DebugLogger(logLevel)
  }
}
