export type ClientLogLevel = 'error' | 'warn'

export interface ClientLogPayload {
  level?: ClientLogLevel
  category: string
  message: string
  stack?: string
  route?: string
  endpoint?: string
  http_status?: number
  trace_id?: string
}

const APP_NAME = 'customer'
const LOG_ENDPOINT = '/api/v1/client-logs'
const DEDUPE_WINDOW_MS = 15_000
const MAX_LOGS_PER_MIN = 20

const recentLogs = new Map<string, number>()
const sentTimestamps: number[] = []
const LOGGED_SYMBOL = Symbol('mareme_logged')
let handlersInstalled = false

export function createTraceId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `fe-${crypto.randomUUID()}`
    }
  } catch {
    // Fallback below
  }
  return `fe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function markErrorLogged(err: unknown): void {
  if (err && typeof err === 'object') {
    try {
      ;(err as Record<symbol, boolean>)[LOGGED_SYMBOL] = true
    } catch {
      // Ignore frozen objects
    }
  }
}

export function isErrorLogged(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && (err as Record<symbol, boolean>)[LOGGED_SYMBOL])
}

function clip(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}...`
}

function formatErrorMessage(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) {
    return {
      message: err.message || err.name || 'Error',
      stack: err.stack,
    }
  }
  if (typeof err === 'string') {
    return { message: err }
  }
  try {
    return { message: JSON.stringify(err) }
  } catch {
    return { message: String(err) }
  }
}

export function reportClientLog(payload: ClientLogPayload): void {
  try {
    if (typeof window === 'undefined') return
    const message = clip(payload.message, 1000)
    if (!message) return

    // Never recurse on the telemetry endpoint itself.
    if (payload.endpoint?.includes('/client-logs') || message.includes('/client-logs')) {
      return
    }

    const level: ClientLogLevel = payload.level ?? 'error'
    const category = clip(payload.category, 64) || 'runtime'
    const endpoint = clip(payload.endpoint, 250)
    const dedupeKey = `${level}|${category}|${endpoint ?? ''}|${payload.http_status ?? ''}|${message}`

    const now = Date.now()
    const lastSent = recentLogs.get(dedupeKey)
    if (lastSent && now - lastSent < DEDUPE_WINDOW_MS) {
      return
    }
    recentLogs.set(dedupeKey, now)
    if (recentLogs.size > 100) {
      for (const [k, ts] of recentLogs) {
        if (now - ts > DEDUPE_WINDOW_MS) recentLogs.delete(k)
      }
    }

    while (sentTimestamps.length > 0 && now - sentTimestamps[0] > 60_000) {
      sentTimestamps.shift()
    }
    if (sentTimestamps.length >= MAX_LOGS_PER_MIN) {
      return
    }
    sentTimestamps.push(now)

    const traceId = clip(payload.trace_id, 64) || createTraceId()
    const route = clip(payload.route ?? `${window.location.pathname}${window.location.search}`, 500)
    const body = JSON.stringify({
      app: APP_NAME,
      level,
      category,
      message,
      stack: clip(payload.stack, 4000),
      route,
      endpoint,
      http_status: payload.http_status,
      trace_id: traceId,
    })

    if (level === 'warn') {
      console.warn(`[${APP_NAME}:${category}]`, message, { traceId, endpoint, status: payload.http_status })
    } else {
      console.error(`[${APP_NAME}:${category}]`, message, { traceId, endpoint, status: payload.http_status })
    }

    void fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trace-Id': traceId,
        'X-Client-App': APP_NAME,
      },
      body,
      keepalive: true,
    }).catch(() => {
      // Telemetry must never surface a secondary error to the user.
    })
  } catch {
    // Ignore logging failures
  }
}

export function installGlobalErrorHandlers(): void {
  if (typeof window === 'undefined' || handlersInstalled) return
  handlersInstalled = true

  window.addEventListener('error', (event: ErrorEvent) => {
    const msg = event.message || ''
    if (msg.includes('ResizeObserver loop')) return

    // Cross-origin third-party scripts (e.g. payment widget / browser extensions)
    // emit opaque 'Script error.' without details; log at warn to avoid noise.
    const isOpaqueThirdParty = msg === 'Script error.' && !event.filename
    const details = event.error ? formatErrorMessage(event.error) : { message: msg || 'Uncaught window error' }
    const loc = event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined

    reportClientLog({
      level: isOpaqueThirdParty ? 'warn' : 'error',
      category: 'runtime',
      message: details.message,
      stack: details.stack || loc,
    })
  })

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    if (isErrorLogged(event.reason)) return
    const reason = event.reason as { __CANCEL__?: boolean; code?: string } | undefined
    if (reason?.__CANCEL__ || reason?.code === 'ERR_CANCELED') return

    const details = formatErrorMessage(event.reason)
    reportClientLog({
      level: 'error',
      category: 'unhandled_rejection',
      message: details.message,
      stack: details.stack,
    })
  })
}
