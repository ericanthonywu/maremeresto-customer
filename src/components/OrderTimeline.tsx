import React from 'react'
import type { Order } from '../types'

interface OrderTimelineProps {
  status: Order['status']
  orderType: Order['order_type']
}

interface Step {
  id: string
  title: string
  desc: string
  icon: string
}

/** Delivery has a courier leg; pickup ends at the counter. */
const DELIVERY_STEPS: Step[] = [
  { id: 'pending', title: 'Pesanan diterima', desc: 'Outlet memverifikasi antrean pesanan Anda', icon: 'fa-receipt' },
  { id: 'preparing', title: 'Sedang disiapkan', desc: 'Dapur dan barista menyiapkan pesanan', icon: 'fa-fire-burner' },
  { id: 'on_the_way', title: 'Dalam perjalanan', desc: 'Kurir membawa pesanan ke alamat Anda', icon: 'fa-motorcycle' },
  { id: 'delivered', title: 'Pesanan tiba', desc: 'Selamat menikmati!', icon: 'fa-house-circle-check' },
]

const PICKUP_STEPS: Step[] = [
  { id: 'pending', title: 'Pesanan diterima', desc: 'Outlet memverifikasi antrean pesanan Anda', icon: 'fa-receipt' },
  { id: 'preparing', title: 'Sedang disiapkan', desc: 'Dapur dan barista menyiapkan pesanan', icon: 'fa-fire-burner' },
  { id: 'ready', title: 'Siap diambil', desc: 'Pesanan menunggu Anda di outlet', icon: 'fa-bag-shopping' },
  { id: 'completed', title: 'Selesai', desc: 'Pesanan sudah diambil. Terima kasih!', icon: 'fa-circle-check' },
]

function stepIndex(status: Order['status'], orderType: Order['order_type']): number {
  if (orderType === 'pickup') {
    switch (status) {
      case 'pending':
      case 'accepted':
        return 0
      case 'preparing':
        return 1
      case 'ready':
        return 2
      case 'picked_up' as Order['status']:
      case 'completed':
        return 3
      default:
        return 0
    }
  }

  switch (status) {
    case 'pending':
      return 0
    case 'accepted':
    case 'preparing':
    case 'ready':
      return 1
    case 'on_the_way':
      return 2
    case 'delivered':
    case 'completed':
      return 3
    default:
      return 0
  }
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ status, orderType }) => {
  const steps = orderType === 'pickup' ? PICKUP_STEPS : DELIVERY_STEPS
  const isStopped = status === 'cancelled' || status === 'rejected'
  const currentIdx = stepIndex(status, orderType)
  const isFinished = currentIdx === steps.length - 1 && (status === 'completed' || status === 'delivered')

  if (isStopped) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-red-200 shadow-md flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
          <i className="fa-solid fa-circle-xmark" aria-hidden="true"></i>
        </div>
        <div>
          <h3 className="font-serif font-bold text-base text-stone-900">
            {status === 'cancelled' ? 'Pesanan dibatalkan' : 'Pesanan ditolak outlet'}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {status === 'cancelled'
              ? 'Pesanan ini tidak dilanjutkan. Jika Anda sudah membayar, hubungi outlet untuk pengembalian dana.'
              : 'Outlet tidak dapat memproses pesanan ini. Silakan hubungi outlet untuk informasi lebih lanjut.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-md space-y-6">
      <h3 className="font-serif font-bold text-base text-stone-900">Status Pemesanan</h3>

      <ol className="space-y-6 relative pl-3">
        {steps.map((step, idx) => {
          const isDone = idx < currentIdx || (idx === currentIdx && isFinished)
          const isCurrent = idx === currentIdx && !isFinished
          const isUpcoming = idx > currentIdx

          return (
            <li key={step.id} className="flex items-start gap-4 relative">
              {idx < steps.length - 1 && (
                <div
                  className={`absolute left-4 top-8 -bottom-6 w-0.5 ${isDone ? 'bg-emerald-500' : 'bg-stone-200'}`}
                  aria-hidden="true"
                ></div>
              )}

              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 z-10 font-bold transition-all ${
                  isDone
                    ? 'bg-emerald-500 text-white shadow'
                    : isCurrent
                      ? 'bg-brand-600 text-white shadow-lg ring-4 ring-brand-100'
                      : 'bg-stone-100 text-stone-400 border border-stone-200'
                }`}
                aria-hidden="true"
              >
                <i className={`fa-solid ${isDone ? 'fa-check' : step.icon}`}></i>
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className={`text-xs sm:text-sm font-bold ${
                      isCurrent ? 'text-brand-700' : isDone ? 'text-stone-900' : 'text-stone-400'
                    }`}
                  >
                    {step.title}
                  </h4>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200 shrink-0">
                      Sedang berjalan
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 leading-relaxed ${isUpcoming ? 'text-stone-300' : 'text-stone-500'}`}>
                  {step.desc}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
