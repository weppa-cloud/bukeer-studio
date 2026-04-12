/**
 * Structured logging utility for bukeer-studio.
 *
 * - Production: JSON output (parseable by Cloudflare log analytics)
 * - Development: Human-readable colored output
 * - Works on Cloudflare Workers (no Node.js-specific APIs)
 *
 * @see ADR-010 — Observability Strategy
 *
 * @example
 * ```ts
 * import { createLogger } from '@/lib/logger'
 * const log = createLogger('ai.studioChat')
 *
 * log.info('Processing request', { websiteId })
 * log.error('Failed to generate', { error: err.message })
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  module: string
  message: string
  timestamp: string
  data?: Record<string, unknown>
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

function formatEntry(entry: LogEntry): string {
  if (IS_PRODUCTION) {
    return JSON.stringify(entry)
  }

  // Dev: human-readable with module prefix (matches existing convention)
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : ''
  return `[${entry.module}] ${entry.message}${dataStr}`
}

function log(
  level: LogLevel,
  module: string,
  message: string,
  data?: Record<string, unknown>
) {
  const entry: LogEntry = {
    level,
    module,
    message,
    timestamp: new Date().toISOString(),
    ...(data && { data }),
  }

  const formatted = formatEntry(entry)

  switch (level) {
    case 'debug':
      if (!IS_PRODUCTION) console.debug(formatted)
      break
    case 'info':
      console.log(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
      console.error(formatted)
      break
  }
}

export interface Logger {
  debug: (message: string, data?: Record<string, unknown>) => void
  info: (message: string, data?: Record<string, unknown>) => void
  warn: (message: string, data?: Record<string, unknown>) => void
  error: (message: string, data?: Record<string, unknown>) => void
}

/**
 * Create a namespaced logger instance.
 *
 * @param module - Module name, e.g. 'ai.studioChat', 'supabase.getWebsite'
 */
export function createLogger(module: string): Logger {
  return {
    debug: (message, data) => log('debug', module, message, data),
    info: (message, data) => log('info', module, message, data),
    warn: (message, data) => log('warn', module, message, data),
    error: (message, data) => log('error', module, message, data),
  }
}
