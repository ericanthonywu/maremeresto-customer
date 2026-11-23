import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { customerApi, isLoggedIn } from '../api/client'
import type { Order } from '../types'

interface RatingReminderModalProps {
  suppressed?: boolean
}

const STORAGE_KEY = 'mareme_dashboard_rating_dismissed'

export const RatingReminderModal: React.FC<RatingReminderModalProps> = ({ suppressed = false }) => {
  const navigate = useNavigate()
  const [unratedOrder, setUnratedOrder] = useState<Order | null>(null)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (dismissed) return

    let cancelled = false
    const checkUnrated = async () => {
      try {
        let orders: Order[] = []
        if (isLoggedIn()) {
          const res = await customerApi.getMyOrders(5)
          orders = res.orders || []
        } else {
          try {
            const raw = localStorage.getItem('mareme_recent_orders')
            if (raw) {
              const ids: string[] = JSON.parse(raw).slice(0, 3)
              const results = await Promise.allSettled(ids.map((id) => customerApi.getOrder(id)))
              orders = results
                .filter((r): r is PromiseFulfilledResult<Order> => r.status === 'fulfilled')
                .map((r) => r.value)
            }
          } catch {}
        }

        if (cancelled) return
        const found = orders.find((o) => o.status === 'completed' && !o.feedback)
        if (found) setUnratedOrder(found)
      } catch {}
    }

    void checkUnrated()
    return () => {
      cancelled = true
    }
  }, [dismissed])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true')
    } catch {}
  }

  const handleRateNow = () => {
    if (!unratedOrder) return
    handleDismiss()
    navigate(`/tracking/${unratedOrder.id}#rating-section`)
  }

  if (suppressed || dismissed || !unratedOrder) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-rating-modal-title"
      onClick={handleDismiss}
    >
      <div
        className="relative bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-amber-200/80 shadow-2xl text-center space-y-4 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center transition-colors"
          aria-label="Tutup pengingat rating"
        >
          <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl mx-auto shadow-xs">
          <i className="fa-solid fa-star" aria-hidden="true" />
        </div>

        <div className="space-y-1.5">
          <h3 id="dashboard-rating-modal-title" className="font-serif font-bold text-lg text-stone-900 leading-snug">
            Sebelum Lanjut ke Halaman Lain, Jangan Lupa Rating Ya! ⭐
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Bagaimana rasa hidangan Maremè kamu tadi? Yuk luangkan 10 detik untuk beri rating singkat. Masukanmu sangat berarti bagi barista &amp; koki kami 😊
          </p>
          <p className="text-[11px] text-stone-400">
            (Santai saja, tidak wajib kok dan bisa kamu lewati kapan saja)
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleRateNow}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-star text-amber-300 text-xs" aria-hidden="true" />
            <span>Beri Rating Sekarang ⭐</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2.5 text-stone-500 hover:text-stone-800 text-xs font-semibold rounded-xl hover:bg-stone-100 transition-colors"
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  )
}
