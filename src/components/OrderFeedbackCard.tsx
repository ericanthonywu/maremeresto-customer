import React, { useMemo, useRef, useState } from 'react'
import { customerApi, errorMessage } from '../api/client'
import type { Order, OrderFeedback, OrderItemFeedback } from '../types'
import { FeedbackReasonInput } from './FeedbackReasonInput'

interface OrderFeedbackCardProps {
  order: Order
  onSaved: (feedback: OrderFeedback) => void
}

// Suggestions for restaurant rating reasons
const RESTO_POSITIVE_SUGGESTIONS = [
  'Makanan sangat lezat dan pas',
  'Porsi pas dan mengenyangkan',
  'Kemasan rapi dan higienis',
  'Makanan masih hangat sampai tujuan',
  'Bumbu meresap sempurna',
  'Pelayanan resto cepat dan ramah',
  'Kualitas bahan segar',
  'Sesuai catatan pesanan',
]

const RESTO_CONSTRUCTIVE_SUGGESTIONS = [
  'Rasa makanan kurang bumbu',
  'Porsi terlalu sedikit',
  'Kemasan bocor atau rusak',
  'Makanan sudah dingin saat sampai',
  'Waktu penyiapan terlalu lama',
  'Pesanan tidak sesuai catatan',
  'Terlalu berminyak atau asin',
  'Kurang higienis',
]

const RESTO_ALL_SUGGESTIONS = [
  ...RESTO_POSITIVE_SUGGESTIONS,
  ...RESTO_CONSTRUCTIVE_SUGGESTIONS,
]

// Suggestions for ordered menu items
const ITEM_POSITIVE_SUGGESTIONS = [
  'Enak banget, rasa otentik',
  'Porsi mantap & kenyang',
  'Bumbu meresap & gurih',
  'Pedasnya pas & mantap',
  'Daging empuk & lembut',
  'Bahan segar & wangi',
  'Pasti pesan lagi!',
]

const ITEM_CONSTRUCTIVE_SUGGESTIONS = [
  'Kurang berasa bumbunya',
  'Porsi agak sedikit',
  'Terlalu asin atau manis',
  'Tekstur agak alot / keras',
  'Kurang pedas',
  'Suhu kurang hangat',
  'Beda dengan foto menu',
]

const ITEM_ALL_SUGGESTIONS = [
  ...ITEM_POSITIVE_SUGGESTIONS,
  ...ITEM_CONSTRUCTIVE_SUGGESTIONS,
]

// Suggestions for application experience
const APP_POSITIVE_SUGGESTIONS = [
  'Aplikasi sangat cepat dan responsif',
  'Navigasi mudah dan jelas',
  'Proses pemesanan sangat praktis',
  'Pelacakan order realtime & akurat',
  'Pembayaran QRIS lancar',
  'Tampilan UI bersih dan modern',
]

const APP_CONSTRUCTIVE_SUGGESTIONS = [
  'Aplikasi terasa agak lambat',
  'Peta lokasi pengiriman sulit diatur',
  'Proses pembayaran sempat kendala',
  'Notifikasi status lambat terupdate',
  'Tampilan kurang pas di layar HP',
  'Menu loading agak lama',
]

const APP_ALL_SUGGESTIONS = [
  ...APP_POSITIVE_SUGGESTIONS,
  ...APP_CONSTRUCTIVE_SUGGESTIONS,
]

export const OrderFeedbackCard: React.FC<OrderFeedbackCardProps> = ({ order, onSaved }) => {
  const existingFeedback = order.feedback
  const cardRef = useRef<HTMLElement>(null)

  // Initialize rating state
  const [restoRating, setRestoRating] = useState<number>(
    existingFeedback?.resto_rating ?? existingFeedback?.rating ?? 0
  )
  const [restoReason, setRestoReason] = useState<string>(existingFeedback?.resto_reason ?? '')

  const [appRating, setAppRating] = useState<number>(existingFeedback?.app_rating ?? 0)
  const [appReason, setAppReason] = useState<string>(existingFeedback?.app_reason ?? '')

  const [comment, setComment] = useState<string>(existingFeedback?.comment ?? '')

  // Item ratings state: record of order_item_id -> { rating, reason }
  const [itemFeedbacks, setItemFeedbacks] = useState<
    Record<string, { rating: number; reason: string }>
  >(() => {
    const map: Record<string, { rating: number; reason: string }> = {}
    const existingItems = existingFeedback?.items_feedback ?? []

    order.items?.forEach((item) => {
      const match = existingItems.find(
        (it) => it.order_item_id === item.id || it.item_name === item.item_name
      )
      map[item.id] = {
        rating: match?.rating ?? item.rating ?? 0,
        reason: match?.reason ?? item.review_reason ?? '',
      }
    })
    return map
  })

  // Eligibility for app rating:
  // Rating aplikasi HANYA muncul untuk user yang belum pernah order / belum pernah rating aplikasi.
  // Rating menu muncul selalu setiap order.
  const isEligibleForAppRating = useMemo(() => {
    // If order already has an app rating, allow viewing/editing it
    if (existingFeedback?.app_rating) return true

    // If local storage marks this customer as having already rated the app on a previous order, skip app rating
    if (order.customer_phone && localStorage.getItem(`mareme_app_rated_${order.customer_phone}`)) {
      return false
    }

    // If backend explicitly flags that this is not first order and customer already ordered before
    if (order.is_first_order === false) {
      return false
    }

    return true
  }, [existingFeedback?.app_rating, order.customer_phone, order.is_first_order])

  // Step state: 'menu' (Langkah 1: Rating Menu) -> 'app' (Langkah 2: Rating Aplikasi)
  const [step, setStep] = useState<'menu' | 'app'>('menu')

  const [isEditing, setIsEditing] = useState<boolean>(!existingFeedback)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${order.branch?.name ?? 'Mareme Group'} ${order.branch?.address ?? ''}`
  )}`

  const handleItemRatingChange = (itemId: string, rating: number) => {
    setItemFeedbacks((prev) => ({
      ...prev,
      [itemId]: {
        rating,
        reason: prev[itemId]?.reason ?? '',
      },
    }))
    setError(null)
  }

  const handleItemReasonChange = (itemId: string, reason: string) => {
    setItemFeedbacks((prev) => ({
      ...prev,
      [itemId]: {
        rating: prev[itemId]?.rating ?? 0,
        reason,
      },
    }))
  }

  // Check if user has selected any rating for menu or resto
  const hasAnyItemRating = Object.values(itemFeedbacks).some((it) => it.rating > 0)
  const hasMenuOrFoodRating = hasAnyItemRating || restoRating > 0

  // --- LANGKAH 1: SIMPAN RATING MENU & RESTO ---
  const handleSaveMenuStep = async () => {
    if (!hasMenuOrFoodRating) {
      setError('Silakan beri bintang minimal untuk salah satu menu atau resto terlebih dahulu.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const itemsPayload: OrderItemFeedback[] = (order.items ?? [])
        .map((item) => {
          const fb = itemFeedbacks[item.id]
          if (!fb || fb.rating <= 0) return null
          return {
            order_item_id: item.id,
            menu_item_id: item.menu_item_id,
            item_name: item.item_name,
            rating: fb.rating,
            reason: fb.reason.trim(),
          }
        })
        .filter(Boolean) as OrderItemFeedback[]

      const payload = {
        rating: (itemsPayload[0]?.rating ?? restoRating) || 5,
        resto_rating: restoRating || undefined,
        resto_reason: restoReason.trim(),
        items_feedback: itemsPayload,
        // Preserve any existing app rating & comment
        app_rating: appRating || undefined,
        app_reason: appReason.trim() || undefined,
        comment: comment.trim() || undefined,
      }

      const result = await customerApi.submitFeedback(order.id, payload)
      onSaved(result)

      if (isEligibleForAppRating) {
        // Ganti tampilan ke Langkah 2: Rating Aplikasi (secara bertahap)
        setStep('app')
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        // User lama yang sudah pernah order: Cukup rating menu, proses langsung selesai
        setIsEditing(false)
        setSuccessMsg('Terima kasih! Penilaian menu Anda telah berhasil disimpan.')
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } catch (err) {
      setError(errorMessage(err, 'Gagal menyimpan penilaian menu.'))
    } finally {
      setSaving(false)
    }
  }

  // --- LANGKAH 2: SIMPAN RATING APLIKASI ---
  const handleSaveAppStep = async () => {
    if (appRating <= 0) {
      setError('Silakan pilih rating bintang aplikasi (1-5), atau klik "Lewati" jika tidak ingin menilai aplikasi.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const itemsPayload: OrderItemFeedback[] = (order.items ?? [])
        .map((item) => {
          const fb = itemFeedbacks[item.id]
          if (!fb || fb.rating <= 0) return null
          return {
            order_item_id: item.id,
            menu_item_id: item.menu_item_id,
            item_name: item.item_name,
            rating: fb.rating,
            reason: fb.reason.trim(),
          }
        })
        .filter(Boolean) as OrderItemFeedback[]

      const payload = {
        rating: restoRating || appRating || (itemsPayload[0]?.rating ?? 5),
        resto_rating: restoRating || undefined,
        resto_reason: restoReason.trim(),
        app_rating: appRating,
        app_reason: appReason.trim(),
        comment: comment.trim(),
        items_feedback: itemsPayload,
      }

      const result = await customerApi.submitFeedback(order.id, payload)
      if (order.customer_phone) {
        localStorage.setItem(`mareme_app_rated_${order.customer_phone}`, '1')
      }
      onSaved(result)
      setIsEditing(false)
      setSuccessMsg('Terima kasih banyak! Penilaian lengkap Anda telah berhasil disimpan.')
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (err) {
      setError(errorMessage(err, 'Gagal menyimpan penilaian aplikasi.'))
    } finally {
      setSaving(false)
    }
  }

  // Lewati rating aplikasi
  const handleSkipAppStep = () => {
    if (order.customer_phone) {
      localStorage.setItem(`mareme_app_rated_${order.customer_phone}`, '1')
    }
    setIsEditing(false)
    setSuccessMsg('Terima kasih! Penilaian menu Anda telah berhasil disimpan.')
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Label helper for star ratings
  const getRatingLabel = (val: number, type: 'resto' | 'app' | 'item') => {
    if (val === 0) return 'Belum dinilai'
    if (type === 'app') {
      switch (val) {
        case 5:
          return 'Sangat Cepat & Praktis 🚀'
        case 4:
          return 'Bagus & Lancar 👍'
        case 3:
          return 'Cukup Baik 🙂'
        case 2:
          return 'Agak Kurang Nyaman 😐'
        case 1:
          return 'Sering Kendala / Lambat 😞'
      }
    }
    if (type === 'item') {
      switch (val) {
        case 5:
          return 'Sangat Enak! ⭐'
        case 4:
          return 'Enak & Puas 👍'
        case 3:
          return 'Cukup Enak 🙂'
        case 2:
          return 'Biasa Saja 😐'
        case 1:
          return 'Kurang Cocok 😞'
      }
    }
    switch (val) {
      case 5:
        return 'Luar Biasa Enak! 🌟'
      case 4:
        return 'Puas & Enak 👍'
      case 3:
        return 'Cukup Baik 🙂'
      case 2:
        return 'Kurang Puas 😐'
      case 1:
        return 'Mengecewakan 😞'
    }
  }

  // Render Star Buttons
  const renderStarButtons = (
    currentRating: number,
    onSelect: (val: number) => void,
    type: 'resto' | 'app' | 'item',
    size: 'sm' | 'md' = 'md'
  ) => {
    const isSmall = size === 'sm'
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex gap-1" role="group" aria-label="Bintang Penilaian">
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              key={val}
              type="button"
              aria-label={`${val} bintang`}
              aria-pressed={currentRating === val}
              onClick={() => onSelect(val)}
              className={`${
                isSmall ? 'w-8 h-8 text-sm' : 'w-9 h-9 text-base'
              } rounded-xl transition-all flex items-center justify-center ${
                val <= currentRating
                  ? 'bg-amber-100 text-amber-500 scale-105 shadow-xs'
                  : 'bg-stone-100 text-stone-300 hover:text-amber-400 hover:bg-stone-200/70'
              }`}
            >
              <i className="fa-solid fa-star" aria-hidden="true" />
            </button>
          ))}
        </div>
        {currentRating > 0 && (
          <span
            className={`font-bold ${
              isSmall ? 'text-[11px]' : 'text-xs'
            } text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60`}
          >
            {getRatingLabel(currentRating, type)}
          </span>
        )}
      </div>
    )
  }

  // --- READ-ONLY SUMMARY VIEW (SETELAH SUBMIT LENGKAP) ---
  if (!isEditing && existingFeedback) {
    const ratedItems = existingFeedback.items_feedback ?? []
    return (
      <section
        ref={cardRef}
        className="bg-white rounded-3xl p-5 sm:p-6 border border-amber-200/90 shadow-sm space-y-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg">
              <i className="fa-solid fa-circle-check" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-stone-900">Ulasan Anda Tersimpan</h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Terima kasih atas penilaian Anda untuk {order.branch?.name ?? 'outlet'}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsEditing(true)
              setStep('menu')
              setError(null)
            }}
            className="px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-[11px] font-bold text-stone-700 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <i className="fa-solid fa-pencil text-[10px] text-stone-500" aria-hidden="true" />
            Ubah
          </button>
        </div>

        {successMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <i className="fa-solid fa-check" aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Rating Breakdown */}
        <div className="space-y-3">
          {/* Menu Items Rated */}
          {ratedItems.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
              <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-utensils text-amber-500" aria-hidden="true" />
                Menu yang Dinilai:
              </span>
              <div className="space-y-2 divide-y divide-stone-200/60">
                {ratedItems.map((item) => (
                  <div key={item.order_item_id || item.item_name} className="pt-2 first:pt-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-800">{item.item_name}</span>
                      <span className="text-amber-600 font-bold flex items-center gap-1 text-[11px]">
                        <i className="fa-solid fa-star" aria-hidden="true" />
                        {item.rating} / 5
                      </span>
                    </div>
                    {item.reason && (
                      <p className="text-[11px] text-stone-500 italic mt-0.5">
                        &ldquo;{item.reason}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resto */}
          {existingFeedback.resto_rating ? (
            <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-store text-brand-600 text-[11px]" aria-hidden="true" />
                  Restoran ({order.branch?.name ?? 'Resto'})
                </span>
                <span className="text-amber-600 flex items-center gap-1 font-mono font-extrabold">
                  <i className="fa-solid fa-star text-xs" aria-hidden="true" />
                  {existingFeedback.resto_rating} / 5
                </span>
              </div>
              {existingFeedback.resto_reason && (
                <p className="text-xs text-stone-600 italic pl-5">
                  &ldquo;{existingFeedback.resto_reason}&rdquo;
                </p>
              )}
            </div>
          ) : null}

          {/* App (Hanya jika pernah dinilai) */}
          {existingFeedback.app_rating ? (
            <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-200/70 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-mobile-screen-button text-indigo-600 text-[11px]" aria-hidden="true" />
                  Pengalaman Aplikasi Mareme
                </span>
                <span className="text-indigo-600 flex items-center gap-1 font-mono font-extrabold">
                  <i className="fa-solid fa-star text-xs" aria-hidden="true" />
                  {existingFeedback.app_rating} / 5
                </span>
              </div>
              {existingFeedback.app_reason && (
                <p className="text-xs text-stone-600 italic pl-5">
                  &ldquo;{existingFeedback.app_reason}&rdquo;
                </p>
              )}
            </div>
          ) : null}

          {/* Additional Comment */}
          {existingFeedback.comment && (
            <div className="text-xs text-stone-600 bg-stone-50 rounded-xl p-3 border border-stone-200/80">
              <span className="font-bold text-stone-700 block mb-0.5">Catatan Tambahan:</span>
              &ldquo;{existingFeedback.comment}&rdquo;
            </div>
          )}
        </div>

        {/* Google Maps link */}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-3.5 py-3 text-xs font-bold text-stone-700 hover:bg-stone-100 transition-colors shadow-xs"
        >
          <i className="fa-brands fa-google text-red-500" aria-hidden="true" />
          Senang dengan pesanan ini? Beri ulasan di Google Maps
        </a>
      </section>
    )
  }

  // --- LANGKAH 1: RATING MENU (Tampil Selalu Setiap Order) ---
  if (step === 'menu') {
    return (
      <section
        ref={cardRef}
        className="bg-white rounded-3xl p-5 sm:p-6 border border-amber-200/90 shadow-sm space-y-5"
      >
        {/* Header Langkah 1 */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-lg">
            <i className="fa-solid fa-utensils" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Langkah 1
              </span>
            </div>
            <h3 className="font-serif font-bold text-sm text-stone-900 mt-1">
              Bagaimana Rasa Menu Pesanan Anda?
            </h3>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Beri rating bintang untuk menu yang dinikmati, lalu klik tombol Simpan di bawah.
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-start gap-2"
          >
            <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* List Menu yang Dipesan */}
          {order.items && order.items.length > 0 && (
            <div className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200 space-y-4">
              <div>
                <h4 className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                  <i className="fa-solid fa-bowl-food text-amber-600 text-xs" aria-hidden="true" />
                  Menu yang Dipesan ({order.items.length} menu)
                </h4>
                <p className="text-[11px] text-stone-500">
                  Beri rating & ulasan untuk masing-masing menu yang Anda pesan
                </p>
              </div>

              <div className="space-y-3 divide-y divide-stone-200/70">
                {order.items.map((item) => {
                  const currentItem = itemFeedbacks[item.id] || { rating: 0, reason: '' }
                  return (
                    <div key={item.id} className="pt-3 first:pt-0 space-y-2.5">
                      {/* Info Item */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-stone-200/70 text-stone-600 text-xs flex items-center justify-center shrink-0">
                            <i className={`fa-solid ${item.item_icon || 'fa-bowl-food'}`} aria-hidden="true" />
                          </span>
                          <span className="font-bold text-xs text-stone-800 truncate">
                            {item.item_name}
                          </span>
                          <span className="text-[10px] text-stone-500 font-semibold bg-stone-200/60 px-1.5 py-0.5 rounded">
                            x{item.quantity}
                          </span>
                        </div>
                      </div>

                      {/* Star Rating Menu */}
                      {renderStarButtons(
                        currentItem.rating,
                        (val) => handleItemRatingChange(item.id, val),
                        'item',
                        'sm'
                      )}

                      {/* Alasan Review Menu */}
                      {currentItem.rating > 0 && (
                        <FeedbackReasonInput
                          label={`Alasan untuk ${item.item_name}:`}
                          value={currentItem.reason}
                          onChange={(reason) => handleItemReasonChange(item.id, reason)}
                          placeholder={`Komentar untuk ${item.item_name}...`}
                          suggestions={ITEM_ALL_SUGGESTIONS}
                          chips={
                            currentItem.rating >= 4
                              ? ITEM_POSITIVE_SUGGESTIONS.slice(0, 4)
                              : ITEM_CONSTRUCTIVE_SUGGESTIONS.slice(0, 4)
                          }
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Rating Keseluruhan Restoran */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-3">
            <div>
              <h4 className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                <i className="fa-solid fa-store text-brand-600 text-xs" aria-hidden="true" />
                Rating Resto ({order.branch?.name ?? 'Outlet'})
              </h4>
              <p className="text-[11px] text-stone-500">Kualitas makanan & pelayanan resto</p>
            </div>

            {renderStarButtons(restoRating, (val) => setRestoRating(val), 'resto', 'md')}

            {restoRating > 0 && (
              <FeedbackReasonInput
                label="Alasan penilaian resto:"
                value={restoReason}
                onChange={setRestoReason}
                placeholder="Ketik alasan atau pilih saran cepat..."
                suggestions={RESTO_ALL_SUGGESTIONS}
                chips={
                  restoRating >= 4
                    ? RESTO_POSITIVE_SUGGESTIONS.slice(0, 5)
                    : RESTO_CONSTRUCTIVE_SUGGESTIONS.slice(0, 5)
                }
              />
            )}
          </div>

          {/* Catatan Tambahan (Opsional) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-stone-600">
              Catatan Tambahan untuk Kami (Opsional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Tuliskan pesan, kritik rasa, atau saran lainnya..."
              className="w-full px-3 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white text-stone-800 placeholder:text-stone-400 transition-colors"
            />
          </div>

          {/* Reminder visual bahwa setelah rating harus klik submit */}
          {hasMenuOrFoodRating && (
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 text-xs font-semibold shadow-xs">
              <i className="fa-solid fa-circle-check text-amber-600 text-sm shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <span className="font-bold block text-stone-900">Rating sudah Anda pilih!</span>
                <span className="text-[11px] text-stone-600">
                  Klik tombol <strong>&quot;{isEligibleForAppRating ? 'Kirim & Lanjut ke Rating Aplikasi' : 'Kirim Penilaian Menu'}&quot;</strong> di bawah untuk menyimpan.
                </span>
              </div>
            </div>
          )}

          {/* Submit Button Langkah 1 */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => void handleSaveMenuStep()}
              disabled={saving || !hasMenuOrFoodRating}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2.5 shadow-md"
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-sm" aria-hidden="true" />
                  <span>Menyimpan Rating Menu...</span>
                </>
              ) : isEligibleForAppRating ? (
                <>
                  <span>Kirim &amp; Lanjut ke Rating Aplikasi</span>
                  <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true" />
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane text-xs" aria-hidden="true" />
                  <span>{existingFeedback ? 'Perbarui Penilaian Menu' : 'Kirim Penilaian Menu'}</span>
                </>
              )}
            </button>

            {existingFeedback && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setError(null)
                }}
                disabled={saving}
                className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Batal Ubah
              </button>
            )}
          </div>
        </div>
      </section>
    )
  }

  // --- LANGKAH 2: RATING APLIKASI (Hanya Muncul untuk User yang Belum Pernah Order) ---
  return (
    <section
      ref={cardRef}
      className="bg-white rounded-3xl p-5 sm:p-6 border border-indigo-200/90 shadow-sm space-y-5"
    >
      {/* Header Langkah 2 */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg">
          <i className="fa-solid fa-mobile-screen-button" aria-hidden="true" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              ✓ Menu Tersimpan
            </span>
            <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
              Langkah 2
            </span>
          </div>
          <h3 className="font-serif font-bold text-sm text-stone-900 mt-1">
            Bagaimana Pengalaman Menggunakan Aplikasi?
          </h3>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Rating menu sudah tersimpan! Mohon beri nilai untuk kemudahan dan kecepatan aplikasi Mareme.
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-start gap-2"
        >
          <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Rating Kemudahan Aplikasi */}
        <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/70 space-y-3">
          <div>
            <h4 className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
              <i className="fa-solid fa-mobile-screen text-indigo-600 text-xs" aria-hidden="true" />
              Rating Kemudahan Aplikasi Mareme
            </h4>
            <p className="text-[11px] text-stone-500">
              Kemudahan pemesanan, kecepatan aplikasi, dan proses pembayaran
            </p>
          </div>

          {renderStarButtons(appRating, (val) => setAppRating(val), 'app', 'md')}

          {appRating > 0 && (
            <FeedbackReasonInput
              label="Alasan penilaian aplikasi:"
              value={appReason}
              onChange={setAppReason}
              placeholder="Ketik saran aplikasi atau pilih pilihan cepat..."
              suggestions={APP_ALL_SUGGESTIONS}
              chips={
                appRating >= 4
                  ? APP_POSITIVE_SUGGESTIONS.slice(0, 5)
                  : APP_CONSTRUCTIVE_SUGGESTIONS.slice(0, 5)
              }
            />
          )}
        </div>

        {/* Catatan Masukan Aplikasi */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-stone-600">
            Saran atau Masukan Tambahan untuk Aplikasi (Opsional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Tuliskan kritik, masukan fitur, atau pesan tambahan untuk kami..."
            className="w-full px-3 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white text-stone-800 placeholder:text-stone-400 transition-colors"
          />
        </div>

        {appRating > 0 && (
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-950 text-xs font-semibold shadow-xs">
            <i className="fa-solid fa-circle-check text-indigo-600 text-sm shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <span className="font-bold block">Rating aplikasi siap dikirim!</span>
              <span className="text-[11px] text-stone-600">
                Klik tombol &quot;Kirim Penilaian Aplikasi&quot; di bawah untuk menyelesaikan.
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons Langkah 2 */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => void handleSaveAppStep()}
            disabled={saving || appRating === 0}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2.5 shadow-md"
          >
            {saving ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin text-sm" aria-hidden="true" />
                <span>Menyimpan Feedback Aplikasi...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-paper-plane text-xs" aria-hidden="true" />
                <span>Kirim Penilaian Aplikasi</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSkipAppStep}
            disabled={saving}
            className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Lewati &amp; Selesai</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStep('menu')
              setError(null)
            }}
            disabled={saving}
            className="w-full py-1.5 text-stone-500 hover:text-stone-700 text-[11px] font-medium transition-colors flex items-center justify-center gap-1"
          >
            <i className="fa-solid fa-chevron-left text-[9px]" aria-hidden="true" />
            <span>Kembali ke Rating Menu</span>
          </button>
        </div>
      </div>
    </section>
  )
}
