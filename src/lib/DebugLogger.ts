import { css } from './utils/css'
import { guard } from './guard'

export type LogLevel = 'verbose' | 'debug' | 'info' | 'warn' | 'error'
export type LoggerEnvironment = 'browser' | 'worker'

export interface ProcessingMetrics extends Record<string, any> {
  stage: string
  duration: number
  timestamp: number
  level: LogLevel
  memory?: number
}

interface LogLevelConfig {
  emoji: string
  color: string
  prefix: string
  bgColor?: string
  borderColor?: string
}

interface ConsoleOutput {
  text: string
  styles: string[]
}

const LOG_CONFIGS: Record<LogLevel, LogLevelConfig> = {
  verbose: {
    emoji: '🔍',
    color: '#DDA0DD',
    bgColor: '#6b21a8',
    borderColor: '#a855f7',
    prefix: 'VERBOSE'
  },
  debug: {
    emoji: '🐛',
    color: '#87CEEB',
    bgColor: '#1e3a8a',
    borderColor: '#3b82f6',
    prefix: 'DEBUG'
  },
  info: {
    emoji: '💡',
    color: '#D3D3D3',
    bgColor: '#374151',
    borderColor: '#9ca3af',
    prefix: 'INFO'
  },
  warn: {
    emoji: '⚠️',
    color: '#FFE4B5',
    bgColor: '#d97706',
    borderColor: '#f59e0b',
    prefix: 'WARNING'
  },
  error: {
    emoji: '🚨',
    color: '#FFB6C1',
    bgColor: '#991b1b',
    borderColor: '#ef4444',
    prefix: 'ERROR'
  }
} as const

const TYPE_COLORS = {
  string: '#A5D6A7',
  number: '#FFCC80',
  boolean: '#F48FB1',
  null: '#B39DDB',
  undefined: '#90A4AE',
  key: '#81D4FA',
  bracket: '#FFFFFF',
  error: '#FFAB91',
  function: '#FFD54F',
  array: '#CE93D8',
  object: '#80CBC4',
  date: '#BCAAA4',
  regexp: '#F8BBD9',
  default: '#E8E8E8'
} as const

type ValueType = keyof typeof TYPE_COLORS

export const LOG_LEVELS: LogLevel[] = [
  'verbose',
  'debug',
  'info',
  'warn',
  'error'
]

const LOG_LEVEL_HIERARCHY: Record<LogLevel, LogLevel[]> = {
  verbose: ['verbose', 'debug', 'info', 'warn', 'error'],
  debug: ['debug', 'info', 'warn', 'error'],
  info: ['info', 'warn', 'error'],
  warn: ['warn', 'error'],
  error: ['error']
} as const

class DebugLogger {
  private readonly enabledLevels: Set<LogLevel>
  private readonly startTime = Date.now()

  private logCount = 0
  private environment: LoggerEnvironment = 'browser'
  private groupDepth = 0 // Track group nesting depth

  constructor(
    logConfig: LogLevel[] = ['warn', 'error'], // Default to warn and error
    environment?: LoggerEnvironment
  ) {
    this.enabledLevels = this.parseLogConfig(logConfig)

    if (environment) {
      this.environment = environment
    }
  }

  @guard
  verbose(message: string, data?: any) {
    this.log('verbose', message, data)
  }

  @guard
  debug(message: string, data?: any) {
    this.log('debug', message, data)
  }

  @guard
  info(message: string, data?: any) {
    this.log('info', message, data)
  }

  @guard
  warn(message: string, data?: any) {
    this.log('warn', message, data)
  }

  @guard
  error(message: string, error?: Error | any) {
    this.log('error', message, error)
  }

  @guard
  group(label: string, level: LogLevel = 'info') {
    const config = LOG_CONFIGS[level]

    console.group(
      `%c${this.createGroupBorder('┌')} ${config.emoji} ${label} ${this.createGroupBorder('┐')}`,
      this.createHeaderStyle(config, false)
    )
    this.groupDepth++
  }

  @guard
  groupCollapsed(label: string, level: LogLevel = 'info') {
    const config = LOG_CONFIGS[level]

    console.groupCollapsed(
      `%c${config.emoji} ${label}`,
      this.createHeaderStyle(config, false)
    )
    this.groupDepth++
  }

  @guard
  table(data: any[], level: LogLevel = 'info') {
    const config = LOG_CONFIGS[level]

    console.log(
      `%c${config.emoji} [${config.prefix}] Table Data (${data.length} rows):`,
      this.createHeaderStyle(config, this.isInsideGroup())
    )
    console.table(data)
  }

  @guard
  separator(label?: string) {
    const line = '━'.repeat(50)
    const text = label ? `━━━ ${label} ━━━` : line

    console.log(`%c${text}`, this.createSeparatorStyle())
  }

  @guard
  time(label: string, level: LogLevel = 'debug') {
    const config = LOG_CONFIGS[level]

    console.log(
      `%c${config.emoji} ⏱️ Starting timer: ${label}`,
      this.createHeaderStyle(config, this.isInsideGroup())
    )
    console.time(`⏱️ ${label}`)
  }

  @guard
  timeEnd(label: string, level: LogLevel = 'debug') {
    const config = LOG_CONFIGS[level]

    console.log(
      `%c${config.emoji} 🏁 Timer finished: ${label}`,
      this.createHeaderStyle(config, this.isInsideGroup())
    )
    console.timeEnd(`⏱️ ${label}`)
  }

  @guard
  groupEnd() {
    if (this.groupDepth > 0) {
      this.groupDepth--
    }
    console.log(
      '%c└────────────────────────────────────────────────┘',
      'color: #666; font-family: monospace;'
    )
    console.groupEnd()
  }

  static create(
    logConfig: LogLevel[] = ['warn', 'error'],
    environment?: LoggerEnvironment
  ): DebugLogger {
    return new DebugLogger(logConfig, environment)
  }

  public shouldLog(level: LogLevel): boolean {
    return this.enabledLevels.has(level)
  }

  public getEnabledLevels(): LogLevel[] {
    return Array.from(this.enabledLevels)
  }

  public isInsideGroup(): boolean {
    return this.groupDepth > 0
  }

  private createGroupBorder(char: string): string {
    return char.repeat(3)
  }

  private parseLogConfig(config: LogLevel[]): Set<LogLevel> {
    return new Set(LOG_LEVEL_HIERARCHY[this.getMinimumLevel(config)])
  }

  private getMinimumLevel(levels: LogLevel[]): LogLevel {
    const indices = levels.map((level) => LOG_LEVELS.indexOf(level))
    const minIndex = Math.min(...indices)

    return LOG_LEVELS[minIndex]
  }

  private getElapsedTime(): string {
    return ((Date.now() - this.startTime) / 1000).toFixed(2)
  }

  private createHeaderStyle(
    config: LogLevelConfig,
    hideBorder: boolean = false
  ): string {
    const borderStyle = hideBorder
      ? ''
      : `border-left: 4px solid ${config.borderColor};`

    return css`
      color: ${config.color};
      background: linear-gradient(
        135deg,
        ${config.bgColor}22,
        ${config.borderColor}11
      );
      ${borderStyle}
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 700;
      font-size: 12px;
      line-height: 1.2;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      display: inline-block;
      white-space: nowrap;
    `
  }

  private createSeparatorStyle(): string {
    return css`
      color: #666;
      font-family: monospace;
      font-size: 11px;
      margin: 8px 0;
    `
  }

  private createValueStyle(type: ValueType): string {
    return css`
      color: ${TYPE_COLORS[type]};
      font-family:
        'SF Mono', Monaco, 'Cascadia Code', 'JetBrains Mono', monospace;
      font-size: 11px;
      line-height: 1.65;
      text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
    `
  }

  private getConsoleMethod(level: LogLevel): typeof console.log {
    const consoleMap = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.log,
      verbose: console.log
    } as const

    return consoleMap[level]
  }

  @guard
  private log(level: LogLevel, message: string, data?: any) {
    this.logCount = this.logCount + 1

    const config = LOG_CONFIGS[level]
    const timestamp = new Date().toLocaleTimeString()
    const header = `${config.emoji} [${config.prefix}] ${message} (${this.getElapsedTime()}s @ ${timestamp})`
    const log = this.getConsoleMethod(level)

    const { text, styles } = this.formatData(data)

    if (text) {
      log(`%c${header}`, this.createHeaderStyle(config, this.isInsideGroup()))
      log(`${text}\n\n`, ...styles)
    } else {
      log(`%c${header}`, this.createHeaderStyle(config, this.isInsideGroup()))
      log('\n\n')
    }
  }

  private formatData(data: any, depth: number = 0): ConsoleOutput {
    if (data === undefined || data === null) {
      return { text: '', styles: [] }
    }

    if (data instanceof Error) return this.formatError(data)
    if (data instanceof Date) return this.formatDate(data)
    if (data instanceof RegExp) return this.formatRegExp(data)

    if (typeof data === 'function') return this.formatFunction(data)
    if (typeof data !== 'object') return this.formatPrimitive(data)

    return this.formatObject(data, depth)
  }

  private formatError(error: Error): ConsoleOutput {
    const baseText = `%c${error.name}: %c${error.message}`
    const baseStyles = [
      this.createValueStyle('error'),
      this.createValueStyle('string')
    ]

    if (!error.stack) {
      return { text: baseText, styles: baseStyles }
    }

    const stackLines = error.stack
      .split('\n')
      .slice(1)
      .map((line) => `${' '.repeat(4)}${line.trim()}`)
      .join('\n')

    return {
      text: `${baseText}\n%cStack trace:\n${stackLines}`,
      styles: [...baseStyles, this.createValueStyle('default')]
    }
  }

  private formatDate(date: Date): ConsoleOutput {
    return {
      text: `%c${date.toISOString()}`,
      styles: [this.createValueStyle('date')]
    }
  }

  private formatRegExp(regexp: RegExp): ConsoleOutput {
    return {
      text: `%c${regexp.toString()}`,
      styles: [this.createValueStyle('regexp')]
    }
  }

  private formatFunction(fn: Function): ConsoleOutput {
    const name = fn.name || 'anonymous'

    return {
      text: `%c[Function: ${name}]`,
      styles: [this.createValueStyle('function')]
    }
  }

  private formatPrimitive(data: any): ConsoleOutput {
    const formattedValue = this.formatValue(data)

    return {
      text: `%c${formattedValue}`,
      styles: [this.createValueStyle(this.getValueType(data))]
    }
  }

  private formatObject(data: any, depth: number = 0): ConsoleOutput {
    if (depth > 3) {
      const type = Array.isArray(data) ? 'Array' : 'Object'
      const size = Array.isArray(data) ? data.length : Object.keys(data).length

      return {
        text: `%c[${type}(${size}) - Max depth reached]`,
        styles: [this.createValueStyle('default')]
      }
    }

    const entries: [string, any][] = Array.isArray(data)
      ? data.map((v, i) => [`[${i}]`, v])
      : Object.entries(data)

    if (entries.length === 0) {
      const emptyBracket = Array.isArray(data) ? '[]' : '{}'
      const type = Array.isArray(data) ? 'array' : 'object'

      return {
        text: `%c${emptyBracket}`,
        styles: [this.createValueStyle(type)]
      }
    }

    const maxEntries = 50
    const limitedEntries = entries.slice(0, maxEntries)
    const hasMore = entries.length > maxEntries

    const result = this.formatEntries(limitedEntries, depth)

    if (hasMore) {
      const indent = '  '.repeat(depth + 1)
      result.text += `\n${indent}%c... and ${entries.length - maxEntries} more`
      result.styles.push(this.createValueStyle('default'))
    }

    return result
  }

  private formatEntries(
    entries: [string, any][],
    depth: number
  ): ConsoleOutput {
    const indent = '  '.repeat(depth + 1)

    const segments = entries.map(([key, value]) => {
      const valueResult = this.formatData(value, depth + 1)

      if (valueResult.text) {
        const indentedValue = valueResult.text
          .split('\n')
          .map((line, index) => (index === 0 ? line : `${indent}  ${line}`))
          .join('\n')

        return {
          text: `${indent}%c${key}%c: ${indentedValue}`,
          styles: [
            this.createValueStyle('key'),
            this.createValueStyle('bracket'),
            ...valueResult.styles
          ]
        }
      }
      return {
        text: `${indent}%c${key}%c: %c${this.formatValue(value)}`,
        styles: [
          this.createValueStyle('key'),
          this.createValueStyle('bracket'),
          this.createValueStyle(this.getValueType(value))
        ]
      }
    })

    return {
      text: segments.map((s) => s.text).join('\n'),
      styles: segments.flatMap((s) => s.styles)
    }
  }

  private formatValue(value: any): string {
    if ([null, undefined].includes(value)) return `${value}`

    if (typeof value === 'string') {
      const truncated =
        value.length > 100 ? value.substring(0, 100) + '...' : value

      return truncated.includes('\n')
        ? `"${truncated.replace(/\n/g, `\n${' '.repeat(4)}`)}"`
        : `"${truncated}"`
    }

    if (typeof value === 'function') {
      return `[Function: ${value.name || 'anonymous'}]`
    }

    if (value instanceof Date) return value.toISOString()
    if (value instanceof RegExp) return value.toString()

    if (typeof value === 'object') {
      const size = Array.isArray(value)
        ? value.length
        : Object.keys(value).length
      const type = Array.isArray(value)
        ? 'Array'
        : value.constructor?.name || 'Object'
      return `[${type}(${size})]`
    }

    return String(value)
  }

  private getValueType(value: any): ValueType {
    if ([null, undefined].includes(value)) return `${value}` as ValueType
    if (value instanceof Date) return 'date'
    if (value instanceof RegExp) return 'regexp'
    if (Array.isArray(value)) return 'array'

    const type = typeof value
    return type in TYPE_COLORS ? (type as ValueType) : 'default'
  }
}

export { DebugLogger }
