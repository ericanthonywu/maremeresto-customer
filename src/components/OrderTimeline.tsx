import React from 'react'
import type { Order } from '../types'

interface OrderTimelineProps {
  status: Order['status']
  orderType: Order['order_type']
  rejectionReason?: string
}

interface Step {
  id: string
  title: string
  desc: string
  icon: string
}

/** The final operational state means the outlet has started the delivery. */
const DELIVERY_STEPS: Step[] = [
  { id: 'accepted', title: 'Belum diantar', desc: 'Pesanan sudah diterima outlet dan menunggu diantar.', icon: 'fa-receipt' },
  { id: 'completed', title: 'Sedang diantar', desc: 'Pesanan sedang diantar. Untuk koordinasi pengantaran, harap hubungi admin outlet melalui WhatsApp.', icon: 'fa-motorcycle' },
]

const PICKUP_STEPS: Step[] = [
  { id: 'accepted', title: 'Pesanan diterima', desc: 'Pesanan Anda sudah diterima outlet.', icon: 'fa-receipt' },
  { id: 'completed', title: 'Selesai', desc: 'Pesanan sudah diambil. Terima kasih!', icon: 'fa-circle-check' },
]

function stepIndex(status: Order['status'], orderType: Order['order_type']): number {
  const isComplete = status === 'completed' || status === 'delivered' || (orderType === 'pickup' && status === 'picked_up')
  return isComplete ? 1 : 0
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ status, orderType, rejectionReason }) => {
  const steps = orderType === 'pickup' ? PICKUP_STEPS : DELIVERY_STEPS
  const isStopped = status === 'cancelled' || status === 'rejected'
  const currentIdx = stepIndex(status, orderType)
  // A completed delivery is the admin signal that the courier has departed,
  // not a claim that the customer has already received the order. Pickup
  // orders keep their conventional completed state.
  const isFinished = orderType === 'pickup' && currentIdx === steps.length - 1 && (status === 'completed' || status === 'picked_up')

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
          {status === 'rejected' && rejectionReason && (
            <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
              Alasan penolakan: {rejectionReason}
            </p>
          )}
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
