import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { customerApi } from '../api/client'
import type { Order } from '../types'

export const OrderSuccessPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderId) {
      customerApi.getOrder(orderId).then((res) => {
        setOrder(res)
        setLoading(false)
      }).catch((err) => {
        console.error('Failed to load order', err)
        setLoading(false)
      })
    }
  }, [orderId])

  const copyOrderNumber = () => {
    if (order?.order_number) {
      navigator.clipboard.writeText(order.order_number)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)

  return (
    <div className="min-h-screen bg-[#fbf9f6] pb-24 pt-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6 text-center">
        {/* Animated Checkmark */}
        <div className="bounce-in w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-4xl mx-auto shadow-md border-4 border-emerald-200">
          <i className="fa-solid fa-check"></i>
        </div>

        <div className="space-y-1">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            Pesanan Berhasil Diterima!
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Terima kasih! Barista Cafe Olga sedang menyiapkan pesanan Anda dengan penuh cinta.
          </p>
        </div>

        {loading ? (
          <div className="py-12">
            <i className="fa-solid fa-circle-notch fa-spin text-2xl text-brand-600"></i>
          </div>
        ) : order ? (
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-lg text-left space-y-4">
            {/* Order Number Box */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                  Nomor Pesanan
                </span>
                <span className="font-mono text-base sm:text-lg font-extrabold text-stone-900">
                  {order.order_number}
                </span>
              </div>
              <button
                onClick={copyOrderNumber}
                className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 flex items-center gap-1.5 shadow-sm transition-all"
              >
                <i className="fa-regular fa-copy text-xs"></i>
                <span>{copied ? 'Tersalin!' : 'Salin'}</span>
              </button>
            </div>

            {/* Branch & Delivery Details */}
            <div className="space-y-2 text-xs text-stone-600 py-1 border-b border-stone-100">
              <div className="flex justify-between">
                <span>Cabang Outlet:</span>
                <span className="font-bold text-stone-900">{order.branch?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Metode:</span>
                <span className="font-bold text-stone-900 capitalize">
                  {order.order_type === 'delivery' ? 'Diantar Kurir' : order.order_type}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Nama Pemesan:</span>
                <span className="font-bold text-stone-900">{order.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Nomor Telepon:</span>
                <span className="font-mono font-bold text-stone-900">{order.customer_phone}</span>
              </div>
            </div>

            {/* Order Items List */}
            <div className="space-y-2 text-xs py-1">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                Item Menu Dipilih
              </span>
              {order.items?.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-stone-800">
                  <span className="truncate">
                    {item.quantity}x {item.item_name}
                  </span>
                  <span className="font-mono font-semibold">{formatRupiah(item.line_total)}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-stone-200 flex justify-between items-center text-sm font-extrabold text-stone-900">
              <span>Total Tagihan:</span>
              <span className="text-brand-700 text-lg font-mono">{formatRupiah(order.grand_total)}</span>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 space-y-2">
              <Link
                to={`/tracking/${order.id}`}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <i className="fa-solid fa-location-crosshairs"></i>
                <span>Lacak Pesanan Secara Live</span>
              </Link>

              <a
                href={`https://wa.me/6281234567890?text=Halo%20Cafe%20Olga,%20saya%20sudah%20membuat%20pesanan%20dengan%20nomor%20${order.order_number}.%20Mohon%20segera%20diproses.`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-2xl text-xs border border-emerald-200 flex items-center justify-center gap-2 transition-all"
              >
                <i className="fa-brands fa-whatsapp text-sm"></i>
                <span>Hubungi Barista Outlet via WhatsApp</span>
              </a>
            </div>
          </div>
        ) : null}

        <div className="pt-2">
          <Link to="/menu" className="text-xs text-brand-700 hover:underline font-bold">
            ← Kembali ke Halaman Utama Menu
          </Link>
        </div>
      </div>
    </div>
  )
}
