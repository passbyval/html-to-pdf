import { css } from './utils/css'

export const LogLevel = ['verbose', 'debug', 'info', 'warn', 'error'] as const
export type LogLevel = (typeof LogLevel)[number]

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

export const overrides = [
  'log',
  'debug',
  'info',
  'warn',
  'error',
  'group',
  'groupCollapsed',
  'time',
  'timeEnd',
  'table',
  'dir'
] as const

const BROWSER_STYLES = {
  RESET: '',
  BRIGHT: css`
    font-weight: bold;
  `,
  DIM: css`
    opacity: 0.7;
  `,
  BLACK: css`
    color: #000000;
  `,
  RED: css`
    color: #ff4444;
  `,
  GREEN: css`
    color: #16a34a;
  `,
  YELLOW: css`
    color: #ffaa00;
  `,
  BLUE: css`
    color: #4444ff;
  `,
  MAGENTA: css`
    color: #ff44ff;
  `,
  CYAN: css`
    color: #44ffff;
  `,
  WHITE: css`
    color: #ffffff;
  `,

  BG_RED: css`
    background-color: #ff4444;
    color: white;
    padding: 2px 4px;
    border-radius: 3px;
  `,
  BG_YELLOW: css`
    background-color: #ffaa00;
    color: black;
    padding: 2px 4px;
    border-radius: 3px;
  `,
  BG_BLUE: css`
    background-color: #4444ff;
    color: white;
    padding: 2px 4px;
    border-radius: 3px;
  `,

  HEX_PURPLE: css`
    color: #9980ff;
  `,
  HEX_LIGHT_BLUE: css`
    color: #5dd6fb;
  `,
  HEX_BLUE: css`
    color: #7cacff;
  `,
  HEX_GRAY: css`
    color: #6b6f6f;
  `
} as const

const LEVEL_STYLES: Record<LogLevel, string> = {
  verbose: BROWSER_STYLES.DIM + BROWSER_STYLES.WHITE,
  debug: BROWSER_STYLES.CYAN,
  info: BROWSER_STYLES.GREEN,
  warn: BROWSER_STYLES.YELLOW,
  error: BROWSER_STYLES.RED + BROWSER_STYLES.BRIGHT
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
  private groupStack: string[] = []

  constructor(level: LogLevel = 'warn', options: LoggerOptions = {}) {
    this.level = level ?? 'warn'
    this.literal = LOG_LEVELS[this.level.toUpperCase() as Uppercase<LogLevel>]
    this.enableColors = options.colors ?? true
    this.libraryPrefix = options.prefix ?? 'html-to-pdf'
  }

  private formatMessage(
    level: LogLevel,
    icon: string,
    message: any,
    ...args: any[]
  ): readonly [string, string[], ...any[]] {
    const prefixStr = `[${this.libraryPrefix}]`

    const padLength = Math.max(
      ...Object.keys(LOG_LEVELS).map((key) => key.length)
    )

    const baseLevelBadge = level.toUpperCase().padEnd(padLength)

    if (!this.enableColors) {
      return [
        `${prefixStr} ${baseLevelBadge} ${icon} ${message}`,
        [],
        ...args
      ] as const
    }

    const styledMessage = `%c${prefixStr}%c ${baseLevelBadge} ${icon} ${message}`

    const styles = [
      BROWSER_STYLES.BRIGHT + BROWSER_STYLES.MAGENTA,
      LEVEL_STYLES[level]
    ]

    return [styledMessage, styles, ...args] as const
  }

  @guard
  verbose(message: any, ...args: any[]) {
    const [formatted, styles, ...rest] = this.formatMessage(
      'verbose',
      '💬',
      message,
      ...args
    )

    console.info(formatted, ...styles, ...rest)
  }

  @guard
  debug(message: any, ...args: any[]) {
    const [formatted, styles, ...rest] = this.formatMessage(
      'debug',
      '🐛',
      message,
      ...args
    )

    console.debug(formatted, ...styles, ...rest)
  }

  @guard
  info(message: any, ...args: any[]) {
    const [formatted, styles, ...rest] = this.formatMessage(
      'info',
      'ℹ️',
      message,
      ...args
    )

    console.info(formatted, ...styles, ...rest)
  }

  @guard
  warn(message: any, ...args: any[]) {
    const [formatted, styles, ...rest] = this.formatMessage(
      'warn',
      '⚠️',
      message,
      ...args
    )

    console.warn(formatted, ...styles, ...rest)
  }

  @guard
  error(message: any, ...args: any[]) {
    const [formatted, styles, ...rest] = this.formatMessage(
      'error',
      '🚨',
      message,
      ...args
    )

    console.error(formatted, ...styles, ...rest)
  }

  @guard
  time(label: string) {
    const [formatted, styles] = this.formatMessage(
      'debug',
      '⏱️',
      `Starting timer: ${label}`
    )

    console.debug(formatted, ...styles)
    console.time(label)
  }

  @guard
  timeEnd(label: string) {
    const [formatted, styles] = this.formatMessage(
      'debug',
      '🏁',
      `Timer finished: ${label}`
    )

    console.debug(formatted, ...styles)
    console.timeEnd(label)
  }

  group(label: string, collapsed: boolean = false) {
    const [formatted, styles] = this.formatMessage(
      'info',
      '📁',
      `Group: ${label}`
    )
    console.info(formatted, ...styles)

    const groupMethod = collapsed ? console.groupCollapsed : console.group
    groupMethod(label)

    this.groupStack = [...this.groupStack, label]
  }

  groupCollapsed(label: string) {
    const [formatted, styles] = this.formatMessage(
      'info',
      '📁',
      `Group: ${label}`
    )
    console.info(formatted, ...styles)

    console.groupCollapsed(label)
    this.groupStack = [...this.groupStack, label]
  }

  groupEnd(label: string) {
    const index = this.groupStack.lastIndexOf(label)

    if (index !== -1) {
      const [formatted, styles] = this.formatMessage(
        'debug',
        '📁',
        'Group ended'
      )
      console.debug(formatted, ...styles)

      this.groupStack.slice(index).forEach(() => console.groupEnd())
      this.groupStack = this.groupStack.slice(0, index)
    }
  }

  @guard
  separator(char: string = '─', length: number = 50) {
    const line = char.repeat(length)
    const [formatted, styles] = this.formatMessage('debug', '📏', line)

    console.debug(formatted, ...styles)
  }

  @guard
  table(data: any[], columns?: string[]) {
    const [formatted, styles] = this.formatMessage('info', '📊', 'Data table:')

    console.info(formatted, ...styles)
    console.table(data, columns)
  }

  json(obj: any, label?: string) {
    const message = label ? `${label}:` : 'Object'
    const [formatted, styles] = this.formatMessage('debug', '🔍', message)

    console.debug(formatted, ...styles)

    if (obj && typeof obj === 'object') {
      const metadata = [
        Array.isArray(obj) && `Array[${obj.length}]`,
        obj.constructor?.name !== 'Object' && obj.constructor?.name,
        Object.keys(obj).length > 0 && `${Object.keys(obj).length} items`
      ].reduce<string[]>((acc, item) => {
        if (item) acc.push(item)
        return acc
      }, [])

      if (metadata.length > 0) {
        const [metaFormatted, metaStyles] = this.formatMessage(
          'debug',
          '📋',
          metadata.join(' | ')
        )
        console.debug(metaFormatted, ...metaStyles)
      }
    }

    console.dir(obj)
  }

  static create(
    logLevel: LogLevel = 'warn',
    options?: LoggerOptions
  ): DebugLogger {
    return new DebugLogger(logLevel, options)
  }
}
