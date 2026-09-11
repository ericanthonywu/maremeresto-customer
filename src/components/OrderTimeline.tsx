import React from 'react'

interface OrderTimelineProps {
  status: string
}

interface Step {
  id: string
  title: string
  desc: string
  icon: string
}

const STEPS: Step[] = [
  { id: 'pending', title: 'Pesanan Diterima', desc: 'Barista telah memverifikasi antrean pesanan Anda', icon: 'fa-receipt' },
  { id: 'preparing', title: 'Sedang Disiapkan', desc: 'Kopi sedang di-brew & pastry sedang dihangatkan', icon: 'fa-fire-burner' },
  { id: 'on_the_way', title: 'Dalam Perjalanan', desc: 'Driver membawa pesanan menuju alamat Anda', icon: 'fa-motorcycle' },
  { id: 'delivered', title: 'Pesanan Tiba', desc: 'Selamat menikmati sajian hangat dari Cafe Olga!', icon: 'fa-house-circle-check' },
]

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ status }) => {
  const getStepIndex = (st: string) => {
    switch (st) {
      case 'pending':
        return 0
      case 'accepted':
      case 'preparing':
        return 1
      case 'ready':
      case 'on_the_way':
        return 2
      case 'delivered':
      case 'completed':
        return 3
      default:
        return 0
    }
  }

  const currentIdx = getStepIndex(status)

  return (
    <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-md space-y-6">
      <h3 className="font-serif font-bold text-base text-stone-900">Status Pemesanan</h3>

      <div className="space-y-6 relative pl-3">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentIdx
          const isCurrent = idx === currentIdx
          const isUpcoming = idx > currentIdx

          return (
            <div key={step.id} className="flex items-start gap-4 relative">
              {/* Vertical line connector */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`absolute left-4 top-8 -bottom-6 w-0.5 ${
                    isDone ? 'bg-emerald-500' : 'bg-stone-200'
                  }`}
                ></div>
              )}

              {/* Node Icon */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 z-10 font-bold transition-all ${
                  isDone
                    ? 'bg-emerald-500 text-white shadow'
                    : isCurrent
                    ? 'bg-brand-600 text-white shadow-lg ring-4 ring-brand-100 animate-pulse'
                    : 'bg-stone-100 text-stone-400 border border-stone-200'
                }`}
              >
                {isDone ? (
                  <i className="fa-solid fa-check"></i>
                ) : (
                  <i className={`fa-solid ${step.icon}`}></i>
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between">
                  <h4
                    className={`text-xs sm:text-sm font-bold ${
                      isCurrent
                        ? 'text-brand-700'
                        : isDone
                        ? 'text-stone-900'
                        : 'text-stone-400'
                    }`}
                  >
                    {step.title}
                  </h4>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200 animate-pulse">
                      Sedang Diproses
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs mt-0.5 leading-relaxed ${
                    isUpcoming ? 'text-stone-300' : 'text-stone-500'
                  }`}
                >
                  {step.desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
