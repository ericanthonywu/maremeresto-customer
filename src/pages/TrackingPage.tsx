import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { customerApi, errorMessage, formatRupiah, isLoggedIn } from '../api/client'
import { useWebSocket, type OrderUpdate } from '../context/WebSocketContext'
import { useCustomerAuth } from '../context/CustomerAuthContext'
import type { Order } from '../types'
import { RouteProgressBanner } from '../components/RouteProgressBanner'
import { OrderTimeline } from '../components/OrderTimeline'
import { OrderFeedbackCard } from '../components/OrderFeedbackCard'
import { OrderTrackingSkeleton, RecentOrdersSkeleton } from '../components/Skeleton'

const CANCEL_WINDOW_MS = 5 * 60 * 1000

/** Statuses where nothing further will change, so polling can stop. */
const TERMINAL_STATUSES: Array<Order['status']> = ['completed', 'cancelled', 'rejected', 'delivered']

export const TrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { subscribeToOrder } = useWebSocket()
  const { openAuthModal } = useCustomerAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [navigatingOrderId, setNavigatingOrderId] = useState<string | null>(null)
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null)
  const [orderSearchQuery, setOrderSearchQuery] = useState('')

  // Rating reminder modal state
  const [showRatingReminder, setShowRatingReminder] = useState(false)
  const [ratingDismissed, setRatingDismissed] = useState(false)

  // Tab filter when on the orders list page (/tracking)
  const currentTab = searchParams.get('tab') || 'all'
  const setTab = (tab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (tab === 'all') next.delete('tab')
      else next.set('tab', tab)
      return next
    })
  }

  const loadOrder = useCallback(async (id: string) => {
    setLoading(true)
    setLoadError(null)
    try {
      const fetched = await customerApi.getOrder(id)
      setOrder(fetched)
      setLoadError(null)

      // Persist to local storage so customer can track on this device anytime
      try {
        const raw = localStorage.getItem('mareme_recent_orders')
        const existing: string[] = raw ? JSON.parse(raw) : []
        const updated = [id, ...existing.filter((item) => item !== id)].slice(0, 30)
        localStorage.setItem('mareme_recent_orders', JSON.stringify(updated))
      } catch {}
    } catch (err) {
      setOrder(null)
      setLoadError(errorMessage(err, 'Pesanan tidak ditemukan atau Anda tidak memiliki akses.'))
    } finally {
      setLoading(false)
      setNavigatingOrderId(null)
    }
  }, [])

  // With no id in the URL, show the customer's own orders grouped and categorized.
  const loadRecent = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      let list: Order[] = []
      if (isLoggedIn()) {
        const { orders } = await customerApi.getMyOrders(30)
        list = orders || []
      }

      // Check localStorage for any recent orders placed on this device (guest orders or session changes)
      try {
        const raw = localStorage.getItem('mareme_recent_orders')
        if (raw) {
          const ids: string[] = JSON.parse(raw)
          const missingIds = ids.filter((id) => !list.some((o) => o.id === id)).slice(0, 10)
          if (missingIds.length > 0) {
            const fetched = await Promise.allSettled(missingIds.map((id) => customerApi.getOrder(id)))
            for (const item of fetched) {
              if (item.status === 'fulfilled' && item.value) {
                list.push(item.value)
              }
            }
          }
        }
      } catch {}

      // Sort newest to oldest
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setRecentOrders(list)
    } catch (err) {
      setLoadError(errorMessage(err, 'Gagal memuat riwayat pesanan.'))
      setRecentOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    if (orderId) {
      if (order?.id !== orderId) {
        setOrder(null)
      }
      void loadOrder(orderId)
    } else {
      setOrder(null)
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

  // Periodic polling fallback
  useEffect(() => {
    if (!orderId || !order || TERMINAL_STATUSES.includes(order.status)) return

    const timer = window.setInterval(() => void loadOrder(orderId), 45000)
    return () => window.clearInterval(timer)
  }, [orderId, order, loadOrder])

  // Pay pending order via Midtrans Snap
  const handlePayOrder = async (id: string) => {
    setPayingOrderId(id)
    setActionError(null)
    try {
      const idempotencyKey = `pay-${id}-${Date.now()}`
      const payment = await customerApi.createPayment(id, 'snap', idempotencyKey)
      if (payment.snap_redirect_url) {
        window.location.assign(payment.snap_redirect_url)
        return
      }
      setActionError('Halaman pembayaran belum siap. Silakan coba kembali sesaat lagi.')
    } catch (err) {
      setActionError(errorMessage(err, 'Gagal membuka halaman pembayaran Midtrans.'))
    } finally {
      setPayingOrderId(null)
    }
  }

  // Cancel order handler
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

  const handleCancelOrderById = async (id: string) => {
    if (!window.confirm('Batalkan pesanan ini? Tindakan ini tidak dapat dibatalkan.')) return
    setActionError(null)
    try {
      await customerApi.cancelOrder(id)
      setNotice('Pesanan berhasil dibatalkan.')
      await loadRecent()
    } catch (err) {
      setActionError(errorMessage(err, 'Gagal membatalkan pesanan.'))
    }
  }

  // Back button handler with gentle rating reminder if unrated
  const handleBackNavigation = () => {
    if (orderId) {
      // If completed order without feedback, gently remind once
      if (order?.status === 'completed' && !order.feedback && !ratingDismissed) {
        setShowRatingReminder(true)
        return
      }
      navigate('/tracking')
    } else {
      navigate('/menu')
    }
  }

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (order?.status !== 'pending') return
    const interval = window.setInterval(() => setNow(Date.now()), 5000)
    return () => window.clearInterval(interval)
  }, [order?.status])

  const canSelfCancel =
    order?.status === 'pending' && now - new Date(order.created_at).getTime() < CANCEL_WINDOW_MS

  const isBeingDelivered = order?.order_type !== 'pickup' && order?.status === 'completed'

  const isOrderLoading = Boolean(orderId) && (loading || (!order || order.id !== orderId)) && !loadError
  const isRecentLoading = !orderId && (loading || recentOrders === null) && !loadError

  // Categorize orders for the list view
  const pendingOrders = useMemo(() => (recentOrders || []).filter((o) => o.status === 'pending'), [recentOrders])
  const activeOrders = useMemo(
    () =>
      (recentOrders || []).filter((o) =>
        ['accepted', 'preparing', 'ready', 'on_the_way', 'picked_up'].includes(o.status)
      ),
    [recentOrders]
  )
  const historyOrders = useMemo(
    () =>
      (recentOrders || []).filter((o) =>
        ['completed', 'cancelled', 'rejected', 'refunded', 'delivered'].includes(o.status)
      ),
    [recentOrders]
  )

  // Filtered orders based on selected tab & search
  const displayedOrders = useMemo(() => {
    let list: Order[] = []
    if (currentTab === 'pending') list = pendingOrders
    else if (currentTab === 'active') list = activeOrders
    else if (currentTab === 'history') list = historyOrders
    else list = recentOrders || []

    const q = orderSearchQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        (o.branch?.name && o.branch.name.toLowerCase().includes(q))
    )
  }, [currentTab, pendingOrders, activeOrders, historyOrders, recentOrders, orderSearchQuery])

  const formatOrderTimestamp = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Menunggu Pembayaran',
          color: 'bg-amber-100 text-amber-900 border-amber-300',
          dot: 'bg-amber-500 animate-pulse',
        }
      case 'accepted':
        return {
          label: 'Diterima Resto',
          color: 'bg-blue-100 text-blue-900 border-blue-300',
          dot: 'bg-blue-500',
        }
      case 'preparing':
        return {
          label: 'Sedang Disiapkan 🍳',
          color: 'bg-orange-100 text-orange-900 border-orange-300',
          dot: 'bg-orange-500 animate-pulse',
        }
      case 'ready':
        return {
          label: 'Siap Diambil / Diantar 📦',
          color: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          dot: 'bg-emerald-500',
        }
      case 'on_the_way':
        return {
          label: 'Kurir Mengantar 🛵',
          color: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          dot: 'bg-emerald-500 animate-ping',
        }
      case 'completed':
      case 'delivered':
        return {
          label: 'Selesai ✅',
          color: 'bg-stone-100 text-stone-700 border-stone-200',
          dot: 'bg-stone-400',
        }
      case 'cancelled':
        return {
          label: 'Dibatalkan',
          color: 'bg-red-50 text-red-700 border-red-200',
          dot: 'bg-red-500',
        }
      case 'rejected':
        return {
          label: 'Ditolak Resto',
          color: 'bg-red-100 text-red-800 border-red-300',
          dot: 'bg-red-500',
        }
      case 'refunded':
        return {
          label: 'Dana Dikembalikan',
          color: 'bg-purple-100 text-purple-800 border-purple-300',
          dot: 'bg-purple-500',
        }
      default:
        return {
          label: status,
          color: 'bg-stone-100 text-stone-600 border-stone-200',
          dot: 'bg-stone-400',
        }
    }
  }

  return (
    <div className="min-h-screen bg-brand-50/40 pb-24 lg:pb-16 pt-6 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header bar: Back button navigates to /tracking when viewing order detail, or to /menu when on orders list */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleBackNavigation}
              aria-label={orderId ? 'Kembali ke daftar pesanan' : 'Kembali ke menu'}
              title={orderId ? 'Kembali ke daftar pesanan' : 'Kembali ke menu'}
              className="w-10 h-10 rounded-2xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 flex items-center justify-center shadow-sm shrink-0 transition-colors"
            >
              <i className="fa-solid fa-arrow-left text-sm" aria-hidden="true"></i>
            </button>
            <div className="min-w-0">
              <h1 className="font-serif text-2xl font-bold text-stone-900">
                {orderId ? 'Lacak Status Pesanan 🛵' : 'Pesanan Saya 📋'}
              </h1>
              {order ? (
                <p className="text-xs text-stone-500 truncate">
                  No. Pesanan: <span className="font-mono font-bold text-stone-800">{order.order_number}</span>
                </p>
              ) : !orderId ? (
                <p className="text-xs text-stone-500 truncate">
                  Pantau pesanan aktif, selesaikan pembayaran, dan cek riwayat pesanan Anda.
                </p>
              ) : null}
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

        {actionError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold flex items-start gap-2">
            <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0" aria-hidden="true"></i>
            <span>{actionError}</span>
          </div>
        )}

        {isOrderLoading ? (
          <OrderTrackingSkeleton />
        ) : isRecentLoading ? (
          <RecentOrdersSkeleton />
        ) : order ? (
          /* ========================================================================= */
          /* SINGLE ORDER DETAIL VIEW (/tracking/:orderId)                             */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Pending payment alert card with Pay Now button */}
            {order.status === 'pending' && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 shadow-sm space-y-3 animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-lg shrink-0 shadow-sm">
                    <i className="fa-solid fa-credit-card" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-amber-950">Menunggu Pembayaran ⏳</h3>
                    <p className="text-xs text-amber-900/80 mt-0.5 leading-relaxed">
                      Pesanan Anda belum dibayar. Mohon segera selesaikan pembayaran agar restoran dapat segera memproses dan menyiapkan pesanan Anda.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void handlePayOrder(order.id)}
                    disabled={payingOrderId === order.id}
                    className="w-full sm:w-auto flex-1 py-3 px-5 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {payingOrderId === order.id ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                        <span>Membuka Pembayaran...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-lock text-xs" />
                        <span>Bayar Sekarang ({formatRupiah(order.grand_total)})</span>
                      </>
                    )}
                  </button>
                  {canSelfCancel && (
                    <button
                      type="button"
                      onClick={handleCancelOrder}
                      disabled={isCancelling}
                      className="w-full sm:w-auto px-4 py-3 bg-white hover:bg-red-50 text-stone-600 hover:text-red-700 text-xs font-semibold rounded-xl border border-stone-200 transition-colors"
                    >
                      {isCancelling ? 'Membatalkan...' : 'Batalkan'}
                    </button>
                  )}
                </div>
              </div>
            )}

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

            {canSelfCancel && order.status !== 'pending' && (
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

            {/* Itemised receipt */}
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
                {order.order_type === 'pickup' ? 'Pengambilan di Cabang' : 'Pengantaran'}
              </h4>
              <div className="flex justify-between gap-4">
                <span className="shrink-0">Outlet</span>
                <span className="font-bold text-stone-900 text-right">{order.branch?.name ?? '-'}</span>
              </div>
              {order.order_type === 'scheduled' && order.scheduled_at && (
                <div className="flex justify-between gap-4">
                  <span className="shrink-0">Jadwal Antar</span>
                  <span className="font-bold text-amber-700 text-right">
                    {new Date(order.scheduled_at).toLocaleString('id-ID', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
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

            {/* Footer actions for single order view */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <Link
                to="/menu"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white rounded-2xl text-xs font-bold shadow-md transition-all"
              >
                <i className="fa-solid fa-utensils text-xs" aria-hidden="true" />
                <span>Pesan Menu Baru</span>
              </Link>
              <Link
                to="/tracking"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-xs font-bold transition-colors"
              >
                <i className="fa-solid fa-receipt text-xs text-brand-600" aria-hidden="true" />
                <span>Semua Pesanan Saya</span>
              </Link>
              <button
                type="button"
                onClick={() => orderId && void loadOrder(orderId)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-3 text-stone-400 hover:text-stone-700 text-xs font-semibold transition-colors"
              >
                <i className="fa-solid fa-rotate-right text-[11px]" aria-hidden="true" />
                <span>Muat Ulang</span>
              </button>
            </div>
          </div>
        ) : orderId && loadError ? (
          /* Error view for specific order */
          <div className="bg-white rounded-3xl p-8 sm:p-10 text-center border border-amber-200/80 shadow-sm space-y-5 animate-fadeIn max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-3xl mx-auto shadow-xs border border-amber-200/60">
              <i className="fa-solid fa-receipt" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
                Pesanan Tidak Ditemukan
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
                {loadError}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <Link
                to="/menu"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white rounded-2xl text-xs font-bold shadow-md transition-all"
              >
                Kembali ke Menu
              </Link>
              <Link
                to="/tracking"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-xs font-bold transition-colors"
              >
                Lihat Pesanan Saya
              </Link>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* COMPREHENSIVE ORDERS DASHBOARD (/tracking): Pending, Active, History      */
          /* ========================================================================= */
          <div className="space-y-5">
            {/* Guest prompt banner if not logged in */}
            {!isLoggedIn() && (
              <div className="p-4 rounded-3xl bg-white border border-stone-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                    <i className="fa-brands fa-whatsapp text-lg" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">Punya pesanan di perangkat lain?</h4>
                    <p className="text-[11px] text-stone-500">
                      Masuk dengan nomor WhatsApp untuk melihat seluruh riwayat transaksi Anda.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0"
                >
                  Masuk Akun
                </button>
              </div>
            )}

            {/* Quick Pending Alert if there are unpaid orders */}
            {pendingOrders.length > 0 && currentTab !== 'pending' && (
              <div className="p-4 rounded-3xl bg-amber-500/15 border-2 border-amber-400 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <i className="fa-solid fa-credit-card text-sm" />
                  </div>
                  <div>
                    <span className="font-bold text-xs block">
                      Ada {pendingOrders.length} pesanan belum dibayar! 💳
                    </span>
                    <span className="text-[11px] text-stone-700">
                      Segera selesaikan pembayaran agar resto dapat menyiapkan hidangan Anda.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('pending')}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0"
                >
                  Lihat &amp; Bayar ({pendingOrders.length})
                </button>
              </div>
            )}

            {/* Filter Tabs & Search */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
                <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setTab('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      currentTab === 'all'
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Semua ({recentOrders?.length || 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => setTab('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      currentTab === 'pending'
                        ? 'bg-white text-amber-900 shadow-sm'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <span>Perlu Dibayar</span>
                    {pendingOrders.length > 0 && (
                      <span className="px-1.5 py-0.2 text-[10px] font-black bg-amber-500 text-white rounded-full">
                        {pendingOrders.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTab('active')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      currentTab === 'active'
                        ? 'bg-white text-emerald-900 shadow-sm'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <span>Sedang Diproses</span>
                    {activeOrders.length > 0 && (
                      <span className="px-1.5 py-0.2 text-[10px] font-black bg-emerald-600 text-white rounded-full">
                        {activeOrders.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTab('history')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      currentTab === 'history'
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Riwayat Selesai ({historyOrders.length})
                  </button>
                </div>
              </div>

              {/* Order number search input */}
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs" />
                <input
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder="Cari nomor pesanan atau nama outlet..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-2xl text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-brand-500 transition-all shadow-xs"
                />
                {orderSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setOrderSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                )}
              </div>
            </div>

            {/* Orders List */}
            {displayedOrders.length > 0 ? (
              <div className="space-y-3.5">
                {displayedOrders.map((o) => {
                  const badge = getStatusBadge(o.status)
                  const isPending = o.status === 'pending'
                  const isActive = ['accepted', 'preparing', 'ready', 'on_the_way', 'picked_up'].includes(o.status)
                  const isCompleted = o.status === 'completed' || o.status === 'delivered'

                  return (
                    <div
                      key={o.id}
                      className={`bg-white rounded-3xl p-5 border transition-all shadow-sm hover:shadow-md ${
                        isPending
                          ? 'border-amber-300 ring-2 ring-amber-400/20'
                          : isActive
                            ? 'border-emerald-300 ring-2 ring-emerald-400/20'
                            : 'border-stone-200 hover:border-brand-300'
                      }`}
                    >
                      {/* Top Row: Order Number, Outlet, Status Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-stone-900">{o.order_number}</span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              <span>{badge.label}</span>
                            </span>
                          </div>
                          <span className="text-[11px] text-stone-500 block mt-0.5">
                            {o.branch?.name} · {formatOrderTimestamp(o.created_at)}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-sm text-brand-700 block">
                            {formatRupiah(o.grand_total)}
                          </span>
                          <span className="text-[10px] text-stone-400 font-medium">
                            {o.order_type === 'pickup'
                              ? 'Ambil di outlet'
                              : o.order_type === 'scheduled' && o.scheduled_at
                                ? `Jadwal: ${formatOrderTimestamp(o.scheduled_at)}`
                                : 'Pengantaran kurir'}
                          </span>
                        </div>
                      </div>

                      {/* Items Summary Snippet */}
                      {o.items && o.items.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-stone-100 text-xs text-stone-600">
                          <span className="line-clamp-1 font-medium text-stone-700">
                            {o.items.map((it) => `${it.quantity}× ${it.item_name}`).join(', ')}
                          </span>
                        </div>
                      )}

                      {/* Action Buttons Row */}
                      <div className="mt-3.5 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                        {isPending ? (
                          <>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void handleCancelOrderById(o.id)}
                                className="px-3 py-1.5 bg-stone-100 hover:bg-red-50 hover:text-red-700 text-stone-600 rounded-xl text-xs font-semibold transition-colors"
                              >
                                Batalkan
                              </button>
                              <Link
                                to={`/tracking/${o.id}`}
                                className="px-3 py-1.5 text-stone-500 hover:text-stone-800 text-xs font-semibold"
                              >
                                Detail
                              </Link>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handlePayOrder(o.id)}
                              disabled={payingOrderId === o.id}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 ml-auto"
                            >
                              {payingOrderId === o.id ? (
                                <>
                                  <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                                  <span>Membuka Snap...</span>
                                </>
                              ) : (
                                <>
                                  <i className="fa-solid fa-credit-card text-xs" />
                                  <span>Bayar Sekarang 💳</span>
                                </>
                              )}
                            </button>
                          </>
                        ) : isActive ? (
                          <>
                            <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Pesanan sedang diproses</span>
                            </span>
                            <div className="flex items-center gap-2 ml-auto">
                              {o.branch?.whatsapp_number && (
                                <a
                                  href={`https://wa.me/${o.branch.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(
                                    `Halo ${o.branch.name}, saya ingin menanyakan pesanan ${o.order_number}.`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                                >
                                  <i className="fa-brands fa-whatsapp" />
                                  <span>WA Cabang</span>
                                </a>
                              )}
                              <Link
                                to={`/tracking/${o.id}`}
                                onClick={() => setNavigatingOrderId(o.id)}
                                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                              >
                                {navigatingOrderId === o.id ? (
                                  <>
                                    <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                                    <span>Membuka...</span>
                                  </>
                                ) : (
                                  <span>Lacak Pesanan 🛵</span>
                                )}
                              </Link>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              {isCompleted && !o.feedback && (
                                <Link
                                  to={`/tracking/${o.id}#rating-section`}
                                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                                >
                                  <i className="fa-solid fa-star text-amber-500 text-[10px]" />
                                  <span>Beri Rating ⭐</span>
                                </Link>
                              )}
                              <Link
                                to={`/menu${o.branch?.slug ? `?branch=${o.branch.slug}` : ''}`}
                                className="px-3 py-1.5 bg-stone-100 hover:bg-brand-50 hover:text-brand-700 text-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                              >
                                <i className="fa-solid fa-rotate-right text-[10px]" />
                                <span>Pesan Lagi</span>
                              </Link>
                            </div>
                            <Link
                              to={`/tracking/${o.id}`}
                              className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors ml-auto"
                            >
                              <span>Lihat Struk</span>
                              <i className="fa-solid fa-arrow-right text-[9px]" />
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Empty state */
              <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 shadow-sm space-y-3">
                <i className="fa-solid fa-receipt text-4xl text-stone-300" aria-hidden="true"></i>
                <h3 className="font-bold text-stone-800 text-sm">
                  {currentTab === 'pending'
                    ? 'Tidak ada pesanan menunggu pembayaran'
                    : currentTab === 'active'
                      ? 'Tidak ada pesanan aktif saat ini'
                      : currentTab === 'history'
                        ? 'Belum ada riwayat pesanan selesai'
                        : 'Belum ada pesanan'}
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  {currentTab === 'pending'
                    ? 'Semua pesanan Anda sudah dibayar atau diselesaikan.'
                    : currentTab === 'active'
                      ? 'Pesanan yang sedang dimasak atau diantar akan muncul di sini.'
                      : 'Pilih makanan lezat dari menu Maremè sekarang.'}
                </p>
                <div className="pt-2">
                  <Link
                    to="/menu"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold shadow-md transition-all"
                  >
                    <span>Lihat Menu Maremè</span>
                    <i className="fa-solid fa-arrow-right text-xs"></i>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gentle Rating Reminder Modal when leaving single order page */}
      {showRatingReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-stone-200 shadow-2xl text-center space-y-4 animate-scaleUp">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl mx-auto shadow-xs">
              <i className="fa-solid fa-star" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-serif font-bold text-lg text-stone-900">
                Sebelum Kembali, Jangan Lupa Rating Ya! ⭐
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Bagaimana rasa makanan dan pelayanan Maremè hari ini? Berikan ulasan singkat 10 detik agar koki kami bisa terus menyajikan yang terbaik untukmu 😊
              </p>
              <p className="text-[11px] text-stone-400">
                (Santai saja, ini tidak wajib kok dan bisa kamu lewati jika sedang terburu-buru)
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRatingReminder(false)
                  document.getElementById('rating-section')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-star text-amber-300 text-xs" />
                <span>Beri Rating Sekarang ⭐</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRatingReminder(false)
                  setRatingDismissed(true)
                  navigate('/tracking')
                }}
                className="w-full py-2.5 text-stone-500 hover:text-stone-800 text-xs font-semibold rounded-xl hover:bg-stone-100 transition-colors"
              >
                Lewati &amp; Kembali ke Daftar Pesanan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
