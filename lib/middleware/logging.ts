/**
 * Logging utilities
 */

import { config } from '@/lib/config/env'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (config.isTest) return false
    if (config.isProduction) {
      return level !== 'debug'
    }
    return true
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) return

    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    }

    switch (level) {
      case 'debug':
        console.debug('[DEBUG]', logEntry)
        break
      case 'info':
        console.info('[INFO]', logEntry)
        break
      case 'warn':
        console.warn('[WARN]', logEntry)
        break
      case 'error':
        console.error('[ERROR]', logEntry)
        break
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context)
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    }
    this.log('error', message, errorContext)
  }
}

export const logger = new Logger()

