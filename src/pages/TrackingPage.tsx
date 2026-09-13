import React, { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { customerApi, errorMessage, formatRupiah, isLoggedIn } from '../api/client'
import { useWebSocket, type OrderUpdate } from '../context/WebSocketContext'
import type { Order } from '../types'
import { RouteProgressBanner } from '../components/RouteProgressBanner'
import { OrderTimeline } from '../components/OrderTimeline'
import { OrderFeedbackCard } from '../components/OrderFeedbackCard'

const CANCEL_WINDOW_MS = 5 * 60 * 1000

/** Statuses where nothing further will change, so polling can stop. */
const TERMINAL_STATUSES: Array<Order['status']> = ['completed', 'cancelled', 'rejected', 'delivered']

export const TrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const { subscribeToOrder } = useWebSocket()

  const [order, setOrder] = useState<Order | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const loadOrder = useCallback(async (id: string) => {
    try {
      const fetched = await customerApi.getOrder(id)
      setOrder(fetched)
      setLoadError(null)
    } catch (err) {
      // No invented fallback order: if the real one cannot be read, say so.
      setOrder(null)
      setLoadError(errorMessage(err, 'Pesanan tidak ditemukan atau Anda tidak memiliki akses.'))
    } finally {
      setLoading(false)
    }
  }, [])

  // With no id in the URL, show the customer's own recent orders to pick from.
  const loadRecent = useCallback(async () => {
    if (!isLoggedIn()) {
      setRecentOrders([])
      setLoading(false)
      return
    }
    try {
      const { orders } = await customerApi.getMyOrders(10)
      setRecentOrders(orders)
    } catch (err) {
      setLoadError(errorMessage(err, 'Gagal memuat riwayat pesanan.'))
      setRecentOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    if (orderId) {
      void loadOrder(orderId)
    } else {
      void loadRecent()
    }
  }, [orderId, loadOrder, loadRecent])

  // Live status updates for this one order.
  useEffect(() => {
    if (!orderId) return

    return subscribeToOrder(orderId, (event: string, payload: OrderUpdate) => {
      if (event === 'status_updated' && payload.status) {
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                status: payload.status as Order['status'],
                version: payload.version ?? prev.version,
                rejection_reason: payload.rejection_reason ?? prev.rejection_reason,
              }
            : prev
        )
        if (payload.message) setNotice(payload.message)
      }
    })
  }, [orderId, subscribeToOrder])

  // Safety net: if the socket is down, refresh periodically until the order
  // reaches a state that will not change again.
  useEffect(() => {
    if (!orderId || !order || TERMINAL_STATUSES.includes(order.status)) return

    const timer = window.setInterval(() => void loadOrder(orderId), 45000)
    return () => window.clearInterval(timer)
  }, [orderId, order, loadOrder])

  const handleCancelOrder = async () => {
    if (!order) return
    if (!window.confirm('Batalkan pesanan ini? Tindakan ini tidak dapat dibatalkan.')) return

    setIsCancelling(true)
    try {
      const updated = await customerApi.cancelOrder(order.id)
      setOrder(updated)
      setNotice('Pesanan berhasil dibatalkan.')
    } catch (err) {
      setNotice(errorMessage(err, 'Gagal membatalkan pesanan.'))
    } finally {
      setIsCancelling(false)
    }
  }

  const canSelfCancel =
    order?.status === 'pending' && Date.now() - new Date(order.created_at).getTime() < CANCEL_WINDOW_MS

  const isBeingDelivered = order?.order_type !== 'pickup' && order?.status === 'completed'

  return (
    <div className="min-h-screen bg-brand-50/40 pb-24 lg:pb-16 pt-6 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/menu"
              aria-label="Kembali ke menu"
              className="w-10 h-10 rounded-2xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 flex items-center justify-center shadow-sm shrink-0"
            >
              <i className="fa-solid fa-arrow-left text-sm" aria-hidden="true"></i>
            </Link>
            <div className="min-w-0">
              <h1 className="font-serif text-2xl font-bold text-stone-900">Lacak Status Pesanan 🛵</h1>
              {order && (
                <p className="text-xs text-stone-500 truncate">
                  No. Pesanan: <span className="font-mono font-bold text-stone-800">{order.order_number}</span>
                </p>
              )}
            </div>
          </div>

          {order && !TERMINAL_STATUSES.includes(order.status) && (
            <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true"></span>
              <span className="hidden sm:inline">Status Terkini</span>
            </span>
          )}
        </div>

        {notice && (
          <div className="p-3 bg-stone-100 border border-stone-200 text-stone-800 rounded-2xl text-xs font-semibold flex items-start gap-2">
            <i className="fa-solid fa-circle-info mt-0.5 text-brand-600" aria-hidden="true"></i>
            <span>{notice}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex justify-center">
            <i className="fa-solid fa-circle-notch fa-spin text-3xl text-brand-600" aria-hidden="true"></i>
            <span className="sr-only">Memuat</span>
          </div>
        ) : order ? (
          <div className="space-y-6">
            <RouteProgressBanner
              status={order.status}
              orderType={order.order_type}
              originName={order.branch?.name}
              destination={order.delivery_address}
              distanceKm={order.delivery_distance_km}
              createdAt={order.created_at}
            />

            {order.branch?.whatsapp_number && (
              <section className="rounded-3xl border-2 border-emerald-400 bg-emerald-50 p-4 shadow-md shadow-emerald-100" aria-label="Hubungi admin cabang">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-xl text-white shadow-sm" aria-hidden="true">
                    <i className="fa-brands fa-whatsapp"></i>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-extrabold text-emerald-950">
                      {isBeingDelivered ? 'Pesanan Sedang Dalam Perjalanan 🛵' : 'Ada Pertanyaan / Butuh Bantuan? 🤗'}
                    </h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-emerald-900">
                      {isBeingDelivered
                        ? `Bapak/Ibu bisa menanyakan posisi kurir langsung ke staf cabang ${order.branch.name} lewat WhatsApp ya 😊`
                        : `Jangan ragu untuk menyapa staf cabang ${order.branch.name} jika ada permintaan khusus atau pertanyaan!`}
                    </p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${order.branch.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Halo ${order.branch.name}, saya ingin menanyakan pesanan ${order.order_number}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-md transition-all hover:bg-emerald-700 active:scale-[0.98]"
                >
                  <i className="fa-brands fa-whatsapp text-base" aria-hidden="true"></i>
                  <span>Chat WhatsApp Staf Cabang {order.branch.name}</span>
                </a>
              </section>
            )}

            <OrderTimeline status={order.status} orderType={order.order_type} rejectionReason={order.rejection_reason} />

            {order.status === 'completed' && (
              <OrderFeedbackCard
                order={order}
                onSaved={(feedback) => setOrder((current) => current ? { ...current, feedback } : current)}
              />
            )}

            {canSelfCancel && (
              <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-xs text-stone-900">Pembatalan mandiri</h4>
                  <p className="text-[11px] text-stone-500">
                    Tersedia selama 5 menit pertama, sebelum barista mulai meracik.
                  </p>
                </div>
                <button
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                  className="px-4 py-2 bg-stone-100 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 text-stone-700 font-bold rounded-xl text-xs border border-stone-200 transition-colors shrink-0"
                >
                  {isCancelling ? 'Membatalkan...' : 'Batalkan'}
                </button>
              </div>
            )}

            {/* Itemised receipt from the order actually stored on the server. */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3 text-xs">
              <h4 className="font-serif font-bold text-sm text-stone-900">Rincian Pesanan</h4>

              <div className="space-y-1.5">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3 text-stone-700">
                    <span className="min-w-0">
                      <span className="font-semibold">{item.quantity}×</span> {item.item_name}
                      {item.notes && (
                        <span className="block text-[10px] text-stone-400 italic">{item.notes}</span>
                      )}
                    </span>
                    <span className="font-mono shrink-0">{formatRupiah(item.line_total)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-stone-100 space-y-1.5 text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatRupiah(order.subtotal)}</span>
                </div>
                {order.order_type !== 'pickup' && (
                  <div className="flex justify-between">
                    <span>
                      Ongkir
                      {order.delivery_distance_km > 0 && ` (${order.delivery_distance_km} km)`}
                    </span>
                    <span className="font-mono">{formatRupiah(order.delivery_fee)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Biaya layanan</span>
                  <span className="font-mono">{formatRupiah(order.service_fee)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Diskon{order.promo_code ? ` (${order.promo_code})` : ''}</span>
                    <span className="font-mono">-{formatRupiah(order.discount)}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-stone-200 flex justify-between items-center text-sm font-extrabold text-stone-900">
                <span>Total</span>
                <span className="text-brand-700 font-mono">{formatRupiah(order.grand_total)}</span>
              </div>
            </div>

            {/* Delivery details */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-2 text-xs text-stone-600">
              <h4 className="font-serif font-bold text-sm text-stone-900 pb-1">
                {order.order_type === 'pickup' ? 'Pengambilan' : 'Pengantaran'}
              </h4>
              <div className="flex justify-between gap-4">
                <span className="shrink-0">Outlet</span>
                <span className="font-bold text-stone-900 text-right">{order.branch?.name ?? '-'}</span>
              </div>
              {order.order_type === 'pickup' ? (
                <div className="flex justify-between gap-4">
                  <span className="shrink-0">Ambil di</span>
                  <span className="font-medium text-stone-800 text-right">{order.branch?.address ?? '-'}</span>
                </div>
              ) : (
                <div className="flex justify-between gap-4">
                  <span className="shrink-0">Alamat</span>
                  <span className="font-medium text-stone-800 text-right">{order.delivery_address || '-'}</span>
                </div>
              )}
              {order.delivery_notes && (
                <div className="flex justify-between gap-4">
                  <span className="shrink-0">Catatan</span>
                  <span className="text-stone-700 text-right italic">{order.delivery_notes}</span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="shrink-0">Pemesan</span>
                <span className="font-bold text-stone-900 text-right">{order.customer_name}</span>
              </div>

            </div>
          </div>
        ) : orderId ? (
          /* A specific order was requested but could not be loaded. */
          <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 shadow-sm space-y-3">
            <i className="fa-solid fa-circle-question text-4xl text-stone-300" aria-hidden="true"></i>
            <h3 className="font-bold text-stone-800 text-sm">Pesanan tidak dapat ditampilkan</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">{loadError}</p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                onClick={() => void loadOrder(orderId)}
                className="px-4 py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold"
              >
                Coba lagi
              </button>
              <Link
                to="/tracking"
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold"
              >
                Lihat pesanan saya
              </Link>
            </div>
          </div>
        ) : recentOrders && recentOrders.length > 0 ? (
          /* No id: let the customer choose from their own orders. */
          <div className="space-y-3">
            <h3 className="font-bold text-xs text-stone-500 uppercase tracking-wider">Pesanan Anda</h3>
            {recentOrders.map((o) => (
              <Link
                key={o.id}
                to={`/tracking/${o.id}`}
                className="block bg-white rounded-2xl p-4 border border-stone-200 shadow-sm hover:border-brand-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-xs text-stone-900 block">{o.order_number}</span>
                    <span className="text-[11px] text-stone-500">
                      {o.branch?.name} ·{' '}
                      {new Date(o.created_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-xs text-brand-700 block">
                      {formatRupiah(o.grand_total)}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-stone-400">{o.status}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 shadow-sm space-y-3">
            <i className="fa-solid fa-receipt text-4xl text-stone-300" aria-hidden="true"></i>
            <h3 className="font-bold text-stone-800 text-sm">Belum ada pesanan untuk dilacak</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {isLoggedIn()
                ? 'Pesanan yang Anda buat akan muncul di sini.'
                : 'Buat pesanan terlebih dahulu, lalu lacak statusnya di halaman ini.'}
            </p>
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold shadow-md transition-all"
            >
              <span>Lihat menu</span>
              <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
