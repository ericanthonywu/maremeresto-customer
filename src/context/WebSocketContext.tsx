import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'

interface WebSocketMessage {
  room?: string
  event: string
  payload: any
}

interface WebSocketContextType {
  isConnected: boolean
  isReconnecting: boolean
  subscribeToOrder: (orderId: string, onUpdate: (payload: any) => void) => () => void
  reconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const listenersRef = useRef<Map<string, Set<(payload: any) => void>>>(new Map())
  const reconnectTimeoutRef = useRef<any>(null)

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return
    }

    setIsReconnecting(true)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.port === '5173' ? 'localhost:8080' : window.location.host
    const url = `${protocol}//${host}/api/v1/ws`

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        setIsReconnecting(false)
        console.log('✓ Customer WebSocket connected')
      }

      ws.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data)
          if (msg.event) {
            const listeners = listenersRef.current.get(msg.event)
            if (listeners) {
              listeners.forEach((callback) => callback(msg.payload))
            }
          }
        } catch (e) {
          console.warn('WebSocket message parse error', e)
        }
      }

      ws.onclose = () => {
        setIsConnected(false)
        setIsReconnecting(false)
        console.warn('WebSocket disconnected. Will retry in 4s...')
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = setTimeout(connect, 4000)
      }

      ws.onerror = (err) => {
        console.error('WebSocket error encountered', err)
        ws.close()
      }
    } catch (err) {
      console.error('Failed to construct WebSocket', err)
      setIsConnected(false)
      setIsReconnecting(false)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  const subscribeToOrder = useCallback((orderId: string, onUpdate: (payload: any) => void) => {
    // Send join room request
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'join', room: `order:${orderId}` }))
    }

    const eventName = 'status_updated'
    if (!listenersRef.current.has(eventName)) {
      listenersRef.current.set(eventName, new Set())
    }
    listenersRef.current.get(eventName)!.add(onUpdate)

    return () => {
      listenersRef.current.get(eventName)?.delete(onUpdate)
    }
  }, [])

  const handleManualReconnect = () => {
    window.location.reload()
  }

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        isReconnecting,
        subscribeToOrder,
        reconnect: connect,
      }}
    >
      {/* Alert banner if WebSocket is disconnected */}
      {!isConnected && (
        <div className="fixed top-0 inset-x-0 z-50 bg-red-600 text-white px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-lg animate-pulse">
          <div className="flex items-center gap-2 max-w-2xl mx-auto w-full justify-between">
            <span className="flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-amber-300 text-sm"></i>
              Koneksi terputus! Pembaruan status pesanan mungkin tertunda.
            </span>
            <button
              onClick={handleManualReconnect}
              className="px-3 py-1 bg-white text-red-700 font-bold rounded-lg hover:bg-stone-100 active:scale-95 transition-all text-xs shrink-0 shadow-sm"
            >
              <i className="fa-solid fa-arrows-rotate mr-1"></i> Segarkan Halaman
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
