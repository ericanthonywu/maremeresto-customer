import React, { useState } from 'react'
import { customerApi, errorMessage } from '../api/client'
import type { Order } from '../types'

interface OrderFeedbackCardProps {
  order: Order
  onSaved: (feedback: NonNullable<Order['feedback']>) => void
}

export const OrderFeedbackCard: React.FC<OrderFeedbackCardProps> = ({ order, onSaved }) => {
  const [rating, setRating] = useState(order.feedback?.rating ?? 0)
  const [comment, setComment] = useState(order.feedback?.comment ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${order.branch?.name ?? 'Mareme Group'} ${order.branch?.address ?? ''}`
  )}`

  const save = async () => {
    if (!rating) {
      setError('Pilih rating terlebih dahulu.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      onSaved(await customerApi.submitFeedback(order.id, rating, comment.trim()))
    } catch (err) {
      setError(errorMessage(err, 'Gagal mengirim feedback.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white rounded-3xl p-5 border border-amber-200 shadow-sm space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
          <i className="fa-solid fa-star" aria-hidden="true"></i>
        </div>
        <div>
          <h3 className="font-serif font-bold text-sm text-stone-900">Bagaimana pesanan Anda?</h3>
          <p className="text-[11px] text-stone-500 mt-0.5">Feedback Anda membantu {order.branch?.name ?? 'outlet'} menjadi lebih baik.</p>
        </div>
      </div>

      <div className="flex gap-1" aria-label="Rating pesanan">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value} bintang`}
            aria-pressed={rating === value}
            onClick={() => { setRating(value); setError(null) }}
            className={`w-10 h-10 rounded-xl transition-colors ${value <= rating ? 'bg-amber-100 text-amber-500' : 'bg-stone-100 text-stone-300 hover:text-amber-400'}`}
          >
            <i className="fa-solid fa-star" aria-hidden="true"></i>
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Tambahkan saran untuk kami (opsional)"
        className="w-full px-3 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white"
      />

      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || !rating}
        className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold"
      >
        {saving ? 'Mengirim...' : order.feedback ? 'Perbarui feedback' : 'Kirim feedback'}
      </button>

      {order.feedback && (
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-100"
        >
          <i className="fa-brands fa-google text-red-500" aria-hidden="true"></i>
          Senang dengan pesanan ini? Beri ulasan di Google Maps
        </a>
      )}
    </section>
  )
}
