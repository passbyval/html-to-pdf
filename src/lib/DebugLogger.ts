export const LogLevel = ['verbose', 'debug', 'info', 'warn', 'error'] as const
export type LogLevel = (typeof LogLevel)[number] // Extract union type from array
export interface LoggerOptions {
  readonly colors?: boolean
  readonly prefix?: string
}

export const LOG_LEVELS: Record<Uppercase<LogLevel>, number> = {
  VERBOSE: 0b10000,
  DEBUG: 0b01000,
  INFO: 0b00100,
  WARN: 0b00010,
  ERROR: 0b00001
} as const

const COLORS = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  DIM: '\x1b[2m',

  BLACK: '\x1b[30m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',

  BG_RED: '\x1b[41m',
  BG_YELLOW: '\x1b[43m',
  BG_BLUE: '\x1b[44m',

  HEX_PURPLE: '\x1b[38;2;153;128;255m',
  HEX_LIGHT_BLUE: '\x1b[38;2;93;214;251m',
  HEX_BLUE: '\x1b[38;2;124;172;248m',
  HEX_GRAY: '\x1b[38;2;107;111;111m'
} as const

const LEVEL_COLORS: Record<LogLevel, string> = {
  verbose: COLORS.DIM + COLORS.WHITE,
  debug: COLORS.CYAN,
  info: COLORS.GREEN,
  warn: COLORS.YELLOW,
  error: COLORS.RED + COLORS.BRIGHT
} as const

function guard<T extends (...args: any[]) => any>(
  _: DebugLogger,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> {
  const originalMethod = descriptor.value!
  const levels = Object.keys(LogLevel)

  const wrappedMethod = function (this: DebugLogger, ...args: any[]) {
    const levelToCheck: LogLevel = levels.includes(propertyKey)
      ? propertyKey
      : (args.find((arg) => levels.includes(arg)) ?? 'info')

    if (
      LOG_LEVELS[levelToCheck.toUpperCase() as Uppercase<LogLevel>] <=
      this.literal
    ) {
      if (args[1]?.constructor?.name === 'Object') {
        return this.json(args[1])
      }

      return originalMethod.apply(this, args)
    }
  } as T

  return {
    ...descriptor,
    value: wrappedMethod
  }
}

export class DebugLogger {
  public readonly literal: number

  private readonly level: LogLevel
  private readonly enableColors: boolean
  private readonly libraryPrefix: string

  constructor(level: LogLevel = 'warn', options: LoggerOptions = {}) {
    this.level = level ?? 'warn'
    this.literal = LOG_LEVELS[this.level.toUpperCase() as Uppercase<LogLevel>]
    this.enableColors = options.colors ?? true
    this.libraryPrefix = options.prefix ?? 'html-to-pdf'
  }

  public isWorkerContext() {
    return typeof self !== 'undefined' && typeof window === 'undefined'
  }

  private replacer(json: string) {
    return json
      .replace(/"([^"]+)":/g, `${COLORS.HEX_BLUE}"$1"${COLORS.RESET}:`) // keys
      .replace(/: "([^"]+)"/g, `: ${COLORS.HEX_LIGHT_BLUE}"$1"${COLORS.RESET}`) // strings
      .replace(/: (\d+(?:\.\d+)?)/g, `: ${COLORS.HEX_PURPLE}$1${COLORS.RESET}`) // numbers (including decimals)
      .replace(/: (true|false)/g, `: ${COLORS.BLUE}$1${COLORS.RESET}`) // booleans (kept original)
      .replace(/: (null|undefined)/g, `: ${COLORS.HEX_GRAY}$1${COLORS.RESET}`) // null/undefined
  }

  private formatMessage(
    level: LogLevel,
    icon: string,
    message: any,
    ...args: any[]
  ): readonly [string, ...any[]] {
    const prefixStr = `[${this.libraryPrefix}]`

    const padLength = Math.max(
      ...Object.keys(LOG_LEVELS).map((key) => key.length)
    )

    const baseLevelBadge = level.toUpperCase().padEnd(padLength)

    const levelBadge = this.enableColors
      ? `${LEVEL_COLORS[level]}${baseLevelBadge}${COLORS.RESET}`
      : baseLevelBadge

    const prefix = [
      `${COLORS.BRIGHT}${COLORS.MAGENTA}${prefixStr}${COLORS.RESET}`,
      levelBadge,
      icon
    ].join(' ')

    return [`${prefix} ${message}`, ...args] as const
  }

  @guard
  verbose(message: any, ...args: any[]) {
    const [formatted, ...rest] = this.formatMessage(
      'verbose',
      '💬',
      message,
      ...args
    )

    console.info(formatted, ...rest)
  }

  @guard
  debug(message: any, ...args: any[]) {
    const [formatted, ...rest] = this.formatMessage(
      'debug',
      '🐛',
      message,
      ...args
    )

    console.debug(formatted, ...rest)
  }

  @guard
  info(message: any, ...args: any[]) {
    const [formatted, ...rest] = this.formatMessage(
      'info',
      'ℹ️',
      message,
      ...args
    )

    console.info(formatted, ...rest)
  }

  @guard
  warn(message: any, ...args: any[]) {
    const [formatted, ...rest] = this.formatMessage(
      'warn',
      '⚠️',
      message,
      ...args
    )

    console.warn(formatted, ...rest)
  }

  @guard
  error(message: any, ...args: any[]) {
    const [formatted, ...rest] = this.formatMessage(
      'error',
      '🚨',
      message,
      ...args
    )

    console.error(formatted, ...rest)
  }

  @guard
  time(label: string) {
    const [formatted] = this.formatMessage(
      'debug',
      '⏱️',
      `Starting timer: ${label}`
    )

    console.debug(formatted)
    console.time(label)
  }

  @guard
  timeEnd(label: string) {
    const [formatted] = this.formatMessage(
      'debug',
      '🏁',
      `Timer finished: ${label}`
    )

    console.debug(formatted)
    console.timeEnd(label)
  }

  @guard
  group(label: string, collapsed: boolean = false) {
    const [formatted] = this.formatMessage('info', '📁', `Group: ${label}`)
    console.info(formatted)

    const groupMethod = collapsed ? console.groupCollapsed : console.group
    groupMethod(label)
  }

  @guard
  groupCollapsed(label: string) {
    this.group(label, true)
  }

  @guard
  groupEnd() {
    const [formatted] = this.formatMessage('debug', '📁', 'Group ended')

    console.groupEnd()
    console.debug(formatted)
  }

  @guard
  separator(char: string = '─', length: number = 50) {
    const line = char.repeat(length)
    const [formatted] = this.formatMessage('debug', '📏', line)

    console.debug(formatted)
  }

  @guard
  table(data: any[], columns?: string[]) {
    const [formatted] = this.formatMessage('info', '📊', 'Data table:')

    console.info(formatted)
    console.table(data, columns)
  }

  @guard
  json(obj: any, label?: string) {
    const message = label ? `${label}:` : 'Object:'
    const [formatted] = this.formatMessage('debug', '🔍', message)

    console.debug(formatted)

    if (obj && typeof obj === 'object') {
      const metadata = [
        Array.isArray(obj) && `Array[${obj.length}]`,
        obj.constructor?.name !== 'Object' && obj.constructor?.name,
        Object.keys(obj).length > 0 && `${Object.keys(obj).length} keys`
      ].reduce<string[]>((acc, item) => {
        if (item) acc.push(item)
        return acc
      }, [])

      if (metadata.length > 0) {
        const [metaFormatted] = this.formatMessage(
          'debug',
          '📋',
          metadata.join(' | ')
        )
        console.debug(metaFormatted)
      }
    }

    if (this.isWorkerContext()) {
      const json = JSON.stringify(obj, null, 2)
      const prettyJson = this.replacer(json)

      console.debug(prettyJson)
    } else {
      console.dir(obj, {
        depth: null,
        colors: this.enableColors,
        compact: false,
        breakLength: 80,
        maxArrayLength: 100,
        maxStringLength: 200,
        showHidden: false,
        showProxy: true
      })
    }
  }

  static create(
    logLevel: LogLevel = 'warn',
    options?: LoggerOptions
  ): DebugLogger {
    return new DebugLogger(logLevel, options)
  }
}
