import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { customerApi, errorMessage, formatRupiah } from '../api/client'
import type { Order, PaymentStatus } from '../types'

/** How long to keep polling for settlement before offering a manual refresh. */
const POLL_INTERVAL_MS = 4000
const POLL_TIMEOUT_MS = 3 * 60 * 1000

export const OrderSuccessPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()

  const [order, setOrder] = useState<Order | null>(null)
  const [payment, setPayment] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pollingExpired, setPollingExpired] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const startedAt = useRef(Date.now())

  const load = useCallback(async () => {
    if (!orderId) return
    try {
      const fetched = await customerApi.getOrder(orderId)
      setOrder(fetched)
      setError(null)

      try {
        setPayment(await customerApi.getPaymentStatus(orderId))
      } catch {
        // No payment record yet; the order screen handles that case.
        setPayment(null)
      }
    } catch (err) {
      setError(errorMessage(err, 'Pesanan tidak ditemukan atau Anda tidak memiliki akses.'))
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    void load()
  }, [load])

  // Midtrans confirms payment through a server-to-server webhook, so this page
  // polls until the order reflects it rather than assuming success.
  const isAwaitingPayment = payment?.payment_status === 'pending' && order?.status === 'pending'

  useEffect(() => {
    if (!isAwaitingPayment || pollingExpired) return

    const timer = window.setInterval(() => {
      if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) {
        setPollingExpired(true)
        return
      }
      void load()
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [isAwaitingPayment, pollingExpired, load])

  const copyOrderNumber = async () => {
    if (!order?.order_number) return
    try {
      await navigator.clipboard.writeText(order.order_number)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Gagal menyalin. Salin nomor pesanan secara manual.')
    }
  }

  // Reopens the Snap session for an order that has not been paid yet.
  const retryPayment = async () => {
    if (!order) return
    setRetrying(true)
    setError(null)
    try {
      const created = await customerApi.createPayment(order.id, 'snap', `pay-${order.id}`)
      if (created.snap_redirect_url) {
        window.location.assign(created.snap_redirect_url)
        return
      }
      setError('Halaman pembayaran belum tersedia. Silakan coba beberapa saat lagi.')
    } catch (err) {
      setError(errorMessage(err, 'Gagal membuka halaman pembayaran.'))
    } finally {
      setRetrying(false)
    }
  }

  const isPaid = payment?.payment_status === 'settlement' || (order && order.status !== 'pending')

  return (
    <div className="min-h-screen bg-brand-50/40 pb-24 pt-8 px-4 sm:px-6 transition-colors duration-300">
      <div className="max-w-xl mx-auto space-y-6 text-center">
        {loading ? (
          <div className="py-20">
            <i className="fa-solid fa-circle-notch fa-spin text-2xl text-brand-600" aria-hidden="true"></i>
            <span className="sr-only">Memuat pesanan</span>
          </div>
        ) : error && !order ? (
          <div className="bg-white rounded-3xl p-10 border border-stone-200 shadow-sm space-y-3">
            <i className="fa-solid fa-circle-exclamation text-4xl text-amber-500" aria-hidden="true"></i>
            <h1 className="font-serif text-xl font-bold text-stone-900">Pesanan tidak ditemukan</h1>
            <p className="text-xs text-stone-500">{error}</p>
            <Link
              to="/menu"
              className="inline-flex px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold"
            >
              Kembali ke menu
            </Link>
          </div>
        ) : order ? (
          <>
            {/* The headline reflects the real payment state. This page used to
                always claim success, even for an order nobody had paid for. */}
            {isPaid ? (
              <>
                <div
                  className="bounce-in w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-4xl mx-auto shadow-md border-4 border-emerald-200"
                  aria-hidden="true"
                >
                  <i className="fa-solid fa-check"></i>
                </div>
                <div className="space-y-1">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                    Pembayaran diterima!
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-500">
                    Outlet {order.branch?.name} sudah menerima pesanan Anda dan mulai menyiapkannya.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div
                  className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-4xl mx-auto shadow-md border-4 border-amber-200"
                  aria-hidden="true"
                >
                  <i className={`fa-solid ${isAwaitingPayment ? 'fa-hourglass-half' : 'fa-clock'}`}></i>
                </div>
                <div className="space-y-1">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                    Menunggu pembayaran
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-500">
                    Pesanan Anda sudah dibuat, tetapi belum dibayar. Selesaikan pembayaran agar outlet
                    dapat mulai menyiapkannya.
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={retryPayment}
                    disabled={retrying}
                    className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2"
                  >
                    <i
                      className={`fa-solid ${retrying ? 'fa-circle-notch fa-spin' : 'fa-credit-card'}`}
                      aria-hidden="true"
                    ></i>
                    <span>{retrying ? 'Membuka pembayaran...' : 'Lanjutkan pembayaran'}</span>
                  </button>

                  {isAwaitingPayment && !pollingExpired && (
                    <p className="text-[11px] text-stone-400 flex items-center justify-center gap-1.5">
                      <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
                      Memeriksa status pembayaran secara otomatis...
                    </p>
                  )}
                  {pollingExpired && (
                    <button
                      onClick={() => void load()}
                      className="text-[11px] text-brand-600 hover:underline font-bold"
                    >
                      Periksa status pembayaran sekarang
                    </button>
                  )}
                </div>
              </>
            )}

            {error && (
              <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-xl p-2.5" role="alert">
                {error}
              </p>
            )}

            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-lg text-left space-y-4">
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                    Nomor pesanan
                  </span>
                  <span className="font-mono text-base sm:text-lg font-extrabold text-stone-900 break-all">
                    {order.order_number}
                  </span>
                </div>
                <button
                  onClick={copyOrderNumber}
                  className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 flex items-center gap-1.5 shadow-sm transition-all shrink-0"
                >
                  <i className="fa-regular fa-copy text-xs" aria-hidden="true"></i>
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>

              <div className="space-y-2 text-xs text-stone-600 py-1 border-b border-stone-100">
                <div className="flex justify-between gap-3">
                  <span>Outlet</span>
                  <span className="font-bold text-stone-900 text-right">{order.branch?.name}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Metode</span>
                  <span className="font-bold text-stone-900 text-right">
                    {order.order_type === 'delivery'
                      ? 'Diantar kurir'
                      : order.order_type === 'pickup'
                        ? 'Ambil sendiri'
                        : 'Dijadwalkan'}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Pemesan</span>
                  <span className="font-bold text-stone-900 text-right">{order.customer_name}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>WhatsApp</span>
                  <span className="font-mono font-bold text-stone-900 text-right">{order.customer_phone}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs py-1">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Item pesanan
                </span>
                {order.items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-start gap-3 text-stone-800">
                    <span className="min-w-0">
                      {item.quantity}× {item.item_name}
                      {item.notes && <span className="block text-[10px] text-stone-400 italic">{item.notes}</span>}
                    </span>
                    <span className="font-mono font-semibold shrink-0">{formatRupiah(item.line_total)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-between items-center text-sm font-extrabold text-stone-900">
                <span>Total tagihan</span>
                <span className="text-brand-700 text-lg font-mono">{formatRupiah(order.grand_total)}</span>
              </div>

              <div className="pt-3 space-y-2">
                <Link
                  to={`/tracking/${order.id}`}
                  className="w-full py-3.5 bg-stone-900 hover:bg-black text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <i className="fa-solid fa-location-crosshairs" aria-hidden="true"></i>
                  <span>Lacak pesanan</span>
                </Link>

                {/* The outlet's real WhatsApp number, from branch settings. */}
                {order.branch?.whatsapp_number && (
                  <a
                    href={`https://wa.me/${order.branch.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Halo ${order.branch.name}, saya sudah membuat pesanan ${order.order_number}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-2xl text-xs border border-emerald-200 flex items-center justify-center gap-2 transition-all"
                  >
                    <i className="fa-brands fa-whatsapp text-sm" aria-hidden="true"></i>
                    <span>Hubungi {order.branch.name}</span>
                  </a>
                )}
              </div>
            </div>

            <Link to="/menu" className="inline-block text-xs text-brand-700 hover:underline font-bold pt-2">
              ← Kembali ke menu
            </Link>
          </>
        ) : null}
      </div>
    </div>
  )
}
