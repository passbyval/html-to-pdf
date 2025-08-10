import { css } from './utils/css'

export type LogLevel = 'verbose' | 'debug' | 'info' | 'warn' | 'error'

export type IDebugOptions = LogLevel[] | 'all' | 'none' | false
export type ILoggerEnvironment = 'browser' | 'worker'

export interface ProcessingMetrics {
  stage: string
  duration: number
  timestamp: number
  level: LogLevel
  memory?: number
  [key: string]: any
}

interface LogConfig {
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

const LOG_CONFIGS: Record<LogLevel, LogConfig> = {
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

// Define log level hierarchy for verbose mode
const LOG_LEVEL_HIERARCHY: Record<LogLevel, number> = {
  verbose: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4
} as const

class DebugLogger {
  private readonly enabledModes: Set<LogLevel>
  private readonly startTime = Date.now()
  private readonly metricsData: ProcessingMetrics[] = []
  private readonly maxHistorySize = 1000

  private logCount = 0
  private environment: ILoggerEnvironment = 'browser'

  constructor(
    debugOptions: IDebugOptions = ['warn', 'error'], // Default to warn and error
    environment?: ILoggerEnvironment
  ) {
    this.enabledModes = this.parseDebugOptions(debugOptions)
    this.printWelcomeMessage()

    if (environment) {
      this.environment = environment
    }
  }

  verbose(message: string, data?: any) {
    this.log('verbose', message, data)
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data)
  }

  info(message: string, data?: any) {
    this.log('info', message, data)
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data)
  }

  error(message: string, error?: Error | any) {
    this.log('error', message, error)
  }

  // Enhanced grouping with visual improvements
  group(label: string, level: LogLevel = 'info') {
    if (!this.shouldLog(level)) return
    const config = LOG_CONFIGS[level]
    console.group(
      `%c${this.createGroupBorder('┌')} ${config.emoji} ${label} ${this.createGroupBorder('┐')}`,
      this.createEnhancedHeaderStyle(config)
    )
  }

  groupCollapsed(label: string, level: LogLevel = 'info') {
    if (!this.shouldLog(level)) return
    const config = LOG_CONFIGS[level]
    console.groupCollapsed(
      `%c${config.emoji} ${label}`,
      this.createEnhancedHeaderStyle(config)
    )
  }

  table(data: any[], level: LogLevel = 'info') {
    if (!this.shouldLog(level)) return
    const config = LOG_CONFIGS[level]

    console.log(
      `%c${config.emoji} [${config.prefix}] Table Data (${data.length} rows):`,
      this.createEnhancedHeaderStyle(config)
    )
    console.table(data)
  }

  // Visual separator methods
  separator(label?: string, level: LogLevel = 'info') {
    if (!this.shouldLog(level)) return
    const line = '━'.repeat(50)
    const text = label ? `━━━ ${label} ━━━` : line
    console.log(`%c${text}`, this.createSeparatorStyle())
  }

  banner(text: string, level: LogLevel = 'info') {
    if (!this.shouldLog(level)) return
    const config = LOG_CONFIGS[level]
    const banner = this.createBanner(text, config.emoji)
    console.log(`%c${banner}`, this.createBannerStyle(config))
  }

  progress(
    current: number,
    total: number,
    message?: string,
    level: LogLevel = 'info'
  ) {
    if (!this.shouldLog(level)) return
    const percentage = Math.round((current / total) * 100)
    const progressBar = this.createProgressBar(percentage)
    const text = message
      ? `${message} - ${progressBar} ${percentage}%`
      : `${progressBar} ${percentage}%`
    this.log(level, text, { current, total, percentage })
  }

  time(label: string, level: LogLevel = 'debug') {
    if (!this.shouldLog(level)) return
    const config = LOG_CONFIGS[level]
    console.log(
      `%c${config.emoji} ⏱️  Starting timer: ${label}`,
      this.createEnhancedHeaderStyle(config)
    )
    console.time(`⏱️ ${label}`)
  }

  timeEnd(label: string, level: LogLevel = 'debug') {
    if (!this.shouldLog(level)) return
    const config = LOG_CONFIGS[level]
    console.log(
      `%c${config.emoji} 🏁 Timer finished: ${label}`,
      this.createEnhancedHeaderStyle(config)
    )
    console.timeEnd(`⏱️ ${label}`)
  }

  getAnalytics(): ProcessingMetrics[] {
    return [...this.metricsData]
  }

  getAnalyticsSummary() {
    return this.calculateAnalyticsSummary()
  }

  exportAnalytics(): string {
    const summary = this.calculateAnalyticsSummary()

    return JSON.stringify(
      {
        sessionStart: new Date(this.startTime).toISOString(),
        sessionDuration: Date.now() - this.startTime,
        logCount: this.logCount,
        enabledModes: Array.from(this.enabledModes),
        metrics: this.metricsData,
        summary
      },
      null,
      2
    )
  }

  clearAnalytics() {
    this.metricsData.length = 0
    this.logCount = 0
    Object.assign(this, { startTime: Date.now() })
    this.info('Analytics cleared and session reset')
  }

  systemInfo() {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      memory: this.getMemoryUsage(),
      timestamp: new Date().toISOString(),
      sessionDuration: this.getElapsedTime()
    }
    this.info('System Information', info)
  }

  groupEnd() {
    console.log(
      '%c└────────────────────────────────────────────────┘',
      'color: #666; font-family: monospace;'
    )
    console.groupEnd()
  }

  static create(
    debugOptions: IDebugOptions = ['warn', 'error'],
    environment?: ILoggerEnvironment
  ): DebugLogger {
    return new DebugLogger(debugOptions, environment)
  }

  private printWelcomeMessage() {
    if (this.enabledModes.size === 0) return

    const modes = Array.from(this.enabledModes).join(', ')
    console.log(
      '%c🚀 Debug Logger Initialized\n' +
        `%cEnabled modes: ${modes}\n` +
        `%cSession started: ${new Date().toLocaleTimeString()}`,
      'color: #61dafb; font-size: 14px; font-weight: bold;',
      'color: #98fb98; font-size: 12px;',
      'color: #ddd; font-size: 11px;'
    )
  }

  private createGroupBorder(char: string): string {
    return char.repeat(3)
  }

  private createProgressBar(percentage: number): string {
    const filled = Math.floor(percentage / 5)
    const empty = 20 - filled
    return '█'.repeat(filled) + '░'.repeat(empty)
  }

  private createBanner(text: string, emoji: string): string {
    const line = '═'.repeat(Math.max(20, text.length + 4))
    return `╔${line}╗\n║ ${emoji} ${text.toUpperCase()} ${emoji} ║\n╚${line}╝`
  }

  private estimateFPS(duration: number): string {
    const fps = 1000 / duration
    if (fps >= 60) return '🟢 60+ FPS'
    if (fps >= 30) return '🟡 30-60 FPS'
    return '🔴 <30 FPS'
  }

  private getMemoryUsage(): number {
    // @ts-ignore - performance.memory is not in all browsers
    return performance.memory?.usedJSHeapSize || 0
  }

  private parseDebugOptions(options: IDebugOptions): Set<LogLevel> {
    if (options === false || options === 'none') return new Set()
    if (options === 'all')
      return new Set(Object.keys(LOG_CONFIGS) as LogLevel[])
    return new Set(options)
  }

  private shouldLog(level: LogLevel): boolean {
    // If verbose is enabled, log everything
    if (this.enabledModes.has('verbose')) return true

    // Otherwise check if the specific level is enabled
    return this.enabledModes.has(level)
  }

  private getElapsedTime(): string {
    return ((Date.now() - this.startTime) / 1000).toFixed(2)
  }

  private createEnhancedHeaderStyle(config: LogConfig): string {
    return css`
      color: ${config.color};
      background: linear-gradient(
        135deg,
        ${config.bgColor}22,
        ${config.borderColor}11
      );
      border-left: 4px solid ${config.borderColor};
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

  private createBannerStyle(config: LogConfig): string {
    return css`
      color: ${config.color};
      font-family: monospace;
      font-weight: bold;
      font-size: 12px;
      line-height: 1.2;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
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

  private getConsoleMethod(level: LogLevel) {
    switch (level) {
      case 'error':
        return console.error
      case 'warn':
        return console.warn
      case 'info':
        return console.info
      case 'debug':
      case 'verbose':
      default:
        return console.log
    }
  }

  private log(level: LogLevel, message: string, data?: any) {
    if (!this.shouldLog(level)) return

    this.logCount++
    const config = LOG_CONFIGS[level]
    const timestamp = new Date().toLocaleTimeString()
    const header = `${config.emoji} [${config.prefix}] ${message} (${this.getElapsedTime()}s @ ${timestamp})`
    const consoleMethod = this.getConsoleMethod(level)
    const { text, styles } =
      data !== undefined ? this.formatData(data) : { text: '', styles: [] }

    if (text) {
      // Log header and content separately to avoid style bleeding
      consoleMethod(`%c${header}`, this.createEnhancedHeaderStyle(config))
      consoleMethod(text, ...styles)
    } else {
      consoleMethod(`%c${header}`, this.createEnhancedHeaderStyle(config))
    }
  }

  private formatData(data: any): ConsoleOutput {
    if (data === undefined || data === null) {
      return { text: '', styles: [] }
    }

    if (data instanceof Error) {
      return this.formatError(data)
    }

    if (data instanceof Date) {
      return this.formatDate(data)
    }

    if (data instanceof RegExp) {
      return this.formatRegExp(data)
    }

    if (typeof data === 'function') {
      return this.formatFunction(data)
    }

    if (typeof data !== 'object') {
      return this.formatPrimitive(data)
    }

    return this.formatObject(data)
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
      .map((line) => `    ${line.trim()}`)
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

  private formatObject(data: any): ConsoleOutput {
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

    // Limit entries for large objects
    const maxEntries = 50
    const limitedEntries = entries.slice(0, maxEntries)
    const hasMore = entries.length > maxEntries

    const result = this.formatEntries(limitedEntries)

    if (hasMore) {
      result.text += `\n  %c... and ${entries.length - maxEntries} more`
      result.styles.push(this.createValueStyle('default'))
    }

    return result
  }

  private formatEntries(entries: [string, any][]): ConsoleOutput {
    const segments = entries.map(([key, value]) => ({
      text: `  %c${key}%c: %c${this.formatValue(value)}`,
      styles: [
        this.createValueStyle('key'),
        this.createValueStyle('bracket'),
        this.createValueStyle(this.getValueType(value))
      ]
    }))

    return {
      text: segments.map((s) => s.text).join('\n'),
      styles: segments.flatMap((s) => s.styles)
    }
  }

  private formatValue(value: any): string {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'

    if (typeof value === 'string') {
      const truncated =
        value.length > 100 ? value.substring(0, 100) + '...' : value
      return truncated.includes('\n')
        ? `"${truncated.replace(/\n/g, '\n    ')}"`
        : `"${truncated}"`
    }

    if (typeof value === 'function') {
      return `[Function: ${value.name || 'anonymous'}]`
    }

    if (value instanceof Date) {
      return value.toISOString()
    }

    if (value instanceof RegExp) {
      return value.toString()
    }

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
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (value instanceof Date) return 'date'
    if (value instanceof RegExp) return 'regexp'
    if (Array.isArray(value)) return 'array'

    const type = typeof value
    return type in TYPE_COLORS ? (type as ValueType) : 'default'
  }

  private calculateAnalyticsSummary() {
    if (this.metricsData.length === 0) {
      return {
        totalStages: 0,
        averageDuration: 0,
        errorCount: 0,
        memoryPeak: 0,
        sessionDuration: Date.now() - this.startTime
      }
    }

    const totalDuration = this.metricsData.reduce(
      (sum, m) => sum + m.duration,
      0
    )

    const avgDuration = totalDuration / this.metricsData.length
    const memoryPeak = Math.max(...this.metricsData.map((m) => m.memory ?? 0))

    const errorCount = this.metricsData.filter(
      (m) => m.level === 'error'
    ).length

    return {
      totalStages: this.metricsData.length,
      averageDuration: Math.round(avgDuration * 100) / 100,
      errorCount,
      memoryPeak,
      sessionDuration: Date.now() - this.startTime,
      logCount: this.logCount
    }
  }
}

export { DebugLogger }
