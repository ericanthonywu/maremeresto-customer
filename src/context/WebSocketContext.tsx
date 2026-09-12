import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { TOKEN_KEY } from '../api/client'

interface WebSocketMessage {
  room?: string
  event: string
  payload?: any
}

export type OrderUpdate = {
  order_id: string
  order_number?: string
  status?: string
  version?: number
  message?: string
  rejection_reason?: string
}

interface WebSocketContextType {
  isConnected: boolean
  /** True only after a drop, so the first connect does not flash a warning. */
  hasDropped: boolean
  subscribeToOrder: (orderId: string, onUpdate: (event: string, payload: OrderUpdate) => void) => () => void
  reconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

const MAX_RECONNECT_DELAY = 30000
const BASE_RECONNECT_DELAY = 1000

function socketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  // In dev the Vite server proxies /api to the backend, so the page's own host
  // is always correct; hardcoding localhost:8080 broke every non-local device.
  const url = new URL(`${protocol}//${window.location.host}/api/v1/ws`)

  const token = localStorage.getItem(TOKEN_KEY)
  if (token) url.searchParams.set('token', token)

  return url.toString()
}

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [hasDropped, setHasDropped] = useState(false)
  // Number of orders currently being tracked. Held in state (not just the ref)
  // because the reconnect banner renders from it.
  const [trackedCount, setTrackedCount] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | undefined>(undefined)
  const attemptRef = useRef(0)
  const closedByUsRef = useRef(false)

  // orderId -> set of listeners. Kept in a ref so reconnects can rejoin the
  // rooms without re-running the effect.
  const listenersRef = useRef<Map<string, Set<(event: string, payload: OrderUpdate) => void>>>(new Map())

  const send = useCallback((data: unknown) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
      return true
    }
    return false
  }, [])

  // connect and the reconnect scheduler refer to each other. Routing one call
  // through a ref keeps them from forming a circular useCallback dependency
  // (which would silently capture a stale connect).
  const connectRef = useRef<() => void>(() => {})

  const scheduleReconnect = useCallback(() => {
    window.clearTimeout(reconnectTimerRef.current)
    const attempt = attemptRef.current++
    const delay = Math.min(BASE_RECONNECT_DELAY * 2 ** attempt, MAX_RECONNECT_DELAY)
    const jitter = Math.random() * 0.3 * delay
    reconnectTimerRef.current = window.setTimeout(() => connectRef.current(), delay + jitter)
  }, [])

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return
    }

    closedByUsRef.current = false

    let ws: WebSocket
    try {
      ws = new WebSocket(socketUrl())
    } catch {
      scheduleReconnect()
      return
    }
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      attemptRef.current = 0
      // Re-join every room after a reconnect: the server keeps no memory of
      // subscriptions across connections, so updates were silently lost.
      for (const orderId of listenersRef.current.keys()) {
        send({ action: 'join', room: `order:${orderId}` })
      }
    }

    ws.onmessage = (event) => {
      let msg: WebSocketMessage
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }
      if (!msg.event) return

      const payload = msg.payload as OrderUpdate | undefined
      // Deliver only to the order the message is about. Previously every
      // listener fired on any status_updated event, so one order's update
      // overwrote another order's screen.
      const orderId = payload?.order_id ?? msg.room?.replace(/^order:/, '')
      if (!orderId) return

      listenersRef.current.get(orderId)?.forEach((cb) => {
        try {
          cb(msg.event, payload ?? ({ order_id: orderId } as OrderUpdate))
        } catch {
          /* a failing listener must not break the others */
        }
      })
    }

    ws.onclose = () => {
      setIsConnected(false)
      if (!closedByUsRef.current) {
        setHasDropped(true)
        scheduleReconnect()
      }
    }

    ws.onerror = () => ws.close()
  }, [send, scheduleReconnect])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    connect()

    // A PWA resumed from the background often has a socket the OS already
    // killed; reconnect as soon as the tab is visible again.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && wsRef.current?.readyState !== WebSocket.OPEN) {
        attemptRef.current = 0
        connect()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
      window.clearTimeout(reconnectTimerRef.current)
      closedByUsRef.current = true
      wsRef.current?.close()
    }
  }, [connect])

  const subscribeToOrder = useCallback(
    (orderId: string, onUpdate: (event: string, payload: OrderUpdate) => void) => {
      let set = listenersRef.current.get(orderId)
      if (!set) {
        set = new Set()
        listenersRef.current.set(orderId, set)
      }
      set.add(onUpdate)
      setTrackedCount(listenersRef.current.size)

      send({ action: 'join', room: `order:${orderId}` })

      return () => {
        const current = listenersRef.current.get(orderId)
        current?.delete(onUpdate)
        if (current && current.size === 0) listenersRef.current.delete(orderId)
        setTrackedCount(listenersRef.current.size)
      }
    },
    [send]
  )

  const value = useMemo(
    () => ({
      isConnected,
      hasDropped,
      subscribeToOrder,
      reconnect: () => {
        attemptRef.current = 0
        connect()
      },
    }),
    [isConnected, hasDropped, subscribeToOrder, connect]
  )

  return (
    <WebSocketContext.Provider value={value}>
      {/*
        Only warn once the connection has actually dropped, and only while
        something is being tracked. The old banner showed a full-width red
        alert on first paint for every visitor, including people just
        browsing the menu.
      */}
      {!isConnected && hasDropped && trackedCount > 0 && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-stone-950 px-4 py-2 text-xs font-semibold shadow-lg">
          <div className="max-w-2xl mx-auto w-full flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation"></i>
              Koneksi real-time terputus. Menyambungkan ulang...
            </span>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-stone-950 text-white font-bold rounded-lg hover:bg-stone-800 active:scale-95 transition-all text-xs shrink-0"
            >
              Muat ulang
            </button>
          </div>
        </div>
      )}
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) throw new Error('useWebSocket must be used within a WebSocketProvider')
  return context
}
