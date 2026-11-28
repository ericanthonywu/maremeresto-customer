import { lazy, type ComponentType } from 'react'
import { reportClientLog } from './logger'

const CHUNK_RELOAD_KEY = 'mareme_chunk_reload_at'
const RELOAD_COOLDOWN_MS = 15_000

const CHUNK_ERROR_PATTERNS = [
  'failed to fetch dynamically imported module',
  'importing a module script failed',
  'failed to load module script',
  'error loading dynamically imported module',
  'unable to preload css',
  'load failed',
  'chunkloaderror',
  'loading chunk',
]

export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : ''
  const lower = message.toLowerCase()
  return CHUNK_ERROR_PATTERNS.some((pattern) => lower.includes(pattern))
}

export function tryReloadOnceForChunkError(): boolean {
  try {
    const now = Date.now()
    const lastReloadRaw = sessionStorage.getItem(CHUNK_RELOAD_KEY)
    const lastReload = lastReloadRaw ? Number(lastReloadRaw) : 0
    if (!Number.isFinite(lastReload) || now - lastReload > RELOAD_COOLDOWN_MS) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now))
      window.location.reload()
      return true
    }
  } catch {
    // Ignore storage errors (e.g. private browsing restrictions)
  }
  return false
}

export function registerPreloadErrorHandler(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('vite:preloadError', (event) => {
    const reloaded = tryReloadOnceForChunkError()
    reportClientLog({
      level: reloaded ? 'warn' : 'error',
      category: 'chunk_error',
      message: reloaded
        ? 'vite:preloadError triggered clean page reload'
        : 'vite:preloadError persisted after reload cooldown',
    })
    if (reloaded) {
      event.preventDefault()
    }
  })
}

/**
 * Wraps React.lazy so a stale hashed chunk after a frontend rebuild
 * triggers a single clean reload instead of crashing to a blank screen.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await importer()
    } catch (error) {
      if (isChunkLoadError(error)) {
        // Brief retry in case an atomic dist swap just finished
        await new Promise((resolve) => setTimeout(resolve, 250))
        try {
          return await importer()
        } catch (retryError) {
          if (tryReloadOnceForChunkError()) {
            // Keep Suspense fallback visible while browser reloads
            return new Promise<{ default: T }>(() => {})
          }
          throw retryError
        }
      }
      throw error
    }
  })
}
