import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useBranch } from '../context/BranchContext'
import { useLocation } from '../context/LocationContext'
import { customerApi, errorMessage, formatRupiah, normalizePhone, USER_KEY } from '../api/client'
import { LocationModal } from '../components/LocationModal'
import { useBranchStock } from '../hooks/useBranchStock'
import type { Branch, BranchDeliveryQuote } from '../types'

type OrderType = 'delivery' | 'pickup' | 'scheduled'

/** Reads the remembered customer profile, so returning users skip retyping. */
function storedProfile(): { name: string; phone: string } {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return { name: '', phone: '' }
    const parsed = JSON.parse(raw)
    return { name: parsed?.name ?? '', phone: parsed?.phone ?? '' }
  } catch {
    return { name: '', phone: '' }
  }
}

/** Builds an ISO timestamp for today (or tomorrow) at the chosen HH:MM. */
function scheduledTimestamp(time: string): string | null {
  const [hours, minutes] = time.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null

  const target = new Date()
  target.setSeconds(0, 0)
  target.setHours(hours, minutes)

  // A time already past today clearly means tomorrow.
  if (target.getTime() < Date.now()) target.setDate(target.getDate() + 1)

  return target.toISOString()
}

export const CheckoutPage: React.FC = () => {
  const { items, subtotal, discount, setDiscount, appliedPromo, clearCart } = useCart()
  const { branches, selectedBranch, setSelectedBranch, nearestBranch, quoteFor, refreshQuotes, quotesLoading, quotesError } =
    useBranch()
  const { location } = useLocation()
  const navigate = useNavigate()

  const profile = useMemo(() => storedProfile(), [])

  const [orderType, setOrderType] = useState<OrderType>('delivery')
  const [name, setName] = useState(profile.name)
  const [nameError, setNameError] = useState<string | null>(null)
  const [phone, setPhone] = useState(profile.phone)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  // Required house/landmark detail; the main address comes from the selected map location.
  const [addressDetail, setAddressDetail] = useState('')
  const [addressDetailError, setAddressDetailError] = useState<string | null>(null)
  const [scheduledTime, setScheduledTime] = useState('')
  const [scheduledTimeError, setScheduledTimeError] = useState<string | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  const scheduledTimeRef = useRef<HTMLInputElement>(null)
  const locationBtnRef = useRef<HTMLButtonElement>(null)
  const addressDetailRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)

  const focusField = useCallback((el: HTMLElement | null) => {
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.focus({ preventScroll: true })
    window.setTimeout(() => {
      el.focus({ preventScroll: true })
    }, 300)
  }, [])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStage, setSubmitStage] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [locationOpen, setLocationOpen] = useState(false)
  // State controls the visual disabled state; the ref closes the tiny window
  // before React rerenders if a customer taps the payment CTA repeatedly.
  const submitInFlightRef = useRef(false)

  const isDelivery = orderType === 'delivery' || orderType === 'scheduled'

  // Clear location error once location is selected
  useEffect(() => {
    if (location) setLocationError(null)
  }, [location])

  // Auto-select the nearest outlet that can serve this basket.
  const activeBranch: Branch | null = selectedBranch ?? nearestBranch ?? branches[0] ?? null
  useEffect(() => {
    if (!selectedBranch && nearestBranch) setSelectedBranch(nearestBranch)
  }, [selectedBranch, nearestBranch, setSelectedBranch])

  // Validate stock in real-time for the active branch
  const { unavailableItems, stockMap } = useBranchStock(items, activeBranch)

  useEffect(() => {
    if (location && subtotal > 0) void refreshQuotes(subtotal)
  }, [location, subtotal, refreshQuotes])

  const quote: BranchDeliveryQuote | null = activeBranch ? quoteFor(activeBranch.id) : null

  const isOutOfRange = Boolean(isDelivery && quote && !quote.within_radius)
  const isOutsideSolo = Boolean(isDelivery && quote && quote.within_solo === false)

  const deliveryFee = isDelivery && quote && quote.within_radius ? quote.delivery_fee : 0
  const serviceFee = quote?.service_fee ?? activeBranch?.service_fee ?? 2000

  // Re-validate applied promo when switching between delivery/pickup or when deliveryFee changes
  // so free_delivery promos do not subtract from food subtotal on pickup orders.
  useEffect(() => {
    if (!appliedPromo || subtotal <= 0) return
    let cancelled = false
    customerApi
      .validatePromo(appliedPromo, subtotal, deliveryFee)
      .then((res) => {
        if (!cancelled) setDiscount(res.discount_amount)
      })
      .catch(() => {
        if (!cancelled) setDiscount(0)
      })
    return () => {
      cancelled = true
    }
  }, [appliedPromo, subtotal, deliveryFee, setDiscount])

  const grandTotal = Math.max(0, subtotal + deliveryFee + serviceFee - discount)

  const isStoreClosed = !activeBranch || !activeBranch.is_open_now

  /** Hard non-input blockers that disable ordering altogether. */
  const hardBlocker = useMemo<string | null>(() => {
    if (items.length === 0) return 'Keranjang pesanan masih kosong.'
    if (!activeBranch) return 'Pilih cabang terlebih dahulu.'
    if (!activeBranch.is_open_now) return `${activeBranch.name} sedang tutup saat ini. Silakan pilih cabang lain.`
    if (unavailableItems.length > 0) {
      return `Stok menu ${unavailableItems[0].cartItem.name} sedang habis di ${activeBranch.name}. Silakan pilih cabang lain atau hapus menu ini.`
    }
    if (isDelivery && quote && !quote.within_radius) {
      if (quote.within_solo === false) {
        return 'Lokasi Anda berada di luar wilayah layanan Kota Surakarta / Solo Raya. Layanan pesan antar hanya tersedia untuk area Solo Raya (maks. 10 km dari cabang). Anda tetap dapat memilih opsi Ambil di Cabang.'
      }
      return `Alamat Anda (${quote.distance_km} km) berada di luar jangkauan pengiriman cabang ${activeBranch.name} (maksimal ${quote.max_radius_km} km). Anda bisa memilih cabang lain yang lebih dekat atau memilih opsi Ambil di Cabang.`
    }
    return null
  }, [items, activeBranch, unavailableItems, isDelivery, quote])

  /** Everything that must be true before the order is sent to the API. */
  const blocker = useMemo<string | null>(() => {
    if (hardBlocker) return hardBlocker
    if (isDelivery && !location) return 'Pilih atau atur alamat pengiriman terlebih dahulu.'
    if (isDelivery && !quote) return 'Biaya pengiriman belum dapat dihitung. Silakan atur kembali alamat Anda.'
    if (orderType === 'scheduled' && !scheduledTime) return 'Pilih jam pengiriman pesanan.'
    if (isDelivery && !addressDetail.trim()) return 'Detail alamat & patokan rumah wajib diisi.'
    return null
  }, [hardBlocker, isDelivery, location, quote, orderType, scheduledTime, addressDetail])

  /** Fields the customer can complete directly before tapping the payment CTA. */
  const incompleteFields = useMemo(() => {
    const fields: Array<{ label: string; focus: () => void }> = []
    if (orderType === 'scheduled' && !scheduledTime) {
      fields.push({ label: 'Jam pengiriman', focus: () => focusField(scheduledTimeRef.current) })
    }
    if (isDelivery && !location) {
      fields.push({
        label: 'Alamat lokasi pengiriman',
        focus: () => {
          focusField(locationBtnRef.current)
          setLocationOpen(true)
        },
      })
    }
    if (isDelivery && !addressDetail.trim()) {
      fields.push({ label: 'Detail alamat & patokan rumah', focus: () => focusField(addressDetailRef.current) })
    }
    if (!name.trim() || name.trim().length < 2) {
      fields.push({ label: 'Nama pemesan', focus: () => focusField(nameRef.current) })
    }
    if (!normalizePhone(phone).valid) {
      fields.push({ label: 'Nomor WhatsApp yang benar', focus: () => focusField(phoneRef.current) })
    }
    return fields
  }, [name, phone, isDelivery, location, addressDetail, orderType, scheduledTime, focusField])

  const handlePhoneBlur = () => {
    if (!phone.trim()) return
    const res = normalizePhone(phone)
    if (res.valid) {
      setPhone(res.normalized)
      setPhoneError(null)
    } else {
      setPhoneError(res.error ?? 'Format WhatsApp tidak valid')
    }
  }

  const handleSubmitOrder = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (submitInFlightRef.current) return
      setErrorMsg(null)

      if (hardBlocker) {
        setErrorMsg(hardBlocker)
        return
      }

      if (orderType === 'scheduled' && !scheduledTime) {
        const msg = 'Pilih jam pengantaran pesanan terlebih dahulu.'
        setScheduledTimeError(msg)
        setErrorMsg(msg)
        focusField(scheduledTimeRef.current)
        return
      }

      if (isDelivery && !location) {
        const msg = 'Silakan pilih alamat lokasi pengiriman terlebih dahulu.'
        setLocationError(msg)
        setErrorMsg(msg)
        focusField(locationBtnRef.current)
        setLocationOpen(true)
        return
      }

      if (isDelivery && !addressDetail.trim()) {
        const msg = 'Detail alamat & patokan rumah wajib diisi agar kurir mudah menemukan lokasi Anda.'
        setAddressDetailError(msg)
        setErrorMsg(msg)
        focusField(addressDetailRef.current)
        return
      }

      if (!name.trim() || name.trim().length < 2) {
        const msg = 'Silakan isi nama pemesan (minimal 2 karakter).'
        setNameError(msg)
        setErrorMsg(msg)
        focusField(nameRef.current)
        return
      }

      const phoneCheck = normalizePhone(phone)
      if (!phoneCheck.valid) {
        const msg = phoneCheck.error ?? 'Format nomor WhatsApp tidak valid'
        setPhoneError(msg)
        setErrorMsg(msg)
        focusField(phoneRef.current)
        return
      }

      if (blocker) {
        setErrorMsg(blocker)
        return
      }
      if (!activeBranch) return

      submitInFlightRef.current = true
      setIsSubmitting(true)
      try {
        // 1. Establish a session so the order belongs to this customer and can
        //    be tracked and cancelled later.
        setSubmitStage('Memverifikasi nomor Anda...')
        await customerApi.login(phoneCheck.normalized, name.trim())

        // Full delivery address combines the location point with the required detail.
        const fullDeliveryAddress = isDelivery && location
          ? (addressDetail.trim() ? `${location.address} (${addressDetail.trim()})` : location.address)
          : ''

        // 2. Create the order. The server re-prices everything from the
        //    database, so these figures are confirmed rather than trusted.
        setSubmitStage('Membuat pesanan...')
        const createdOrder = await customerApi.createOrder({
          branch_id: activeBranch.id,
          order_type: orderType,
          customer_name: name.trim(),
          customer_phone: phoneCheck.normalized,
          delivery_address: fullDeliveryAddress,
          // Address detail doubles as the required courier note in the API.
          delivery_notes: isDelivery ? addressDetail.trim() : '',
          delivery_lat: isDelivery && location ? location.lat : null,
          delivery_lon: isDelivery && location ? location.lon : null,
          promo_code: appliedPromo,
          scheduled_at: orderType === 'scheduled' ? scheduledTimestamp(scheduledTime) : null,
          items: items.map((item) => ({
            menu_item_id: stockMap[item.id]?.targetMenuItemId || item.menu_item_id,
            quantity: item.quantity,
            notes: item.notes ?? '',
          })),
        })

        // Persist order id in local storage so customer can always track even as guest
        try {
          const raw = localStorage.getItem('mareme_recent_orders')
          const existing = raw ? JSON.parse(raw) : []
          const updated = [createdOrder.id, ...existing.filter((id: string) => id !== createdOrder.id)].slice(0, 30)
          localStorage.setItem('mareme_recent_orders', JSON.stringify(updated))
        } catch {}

        // 3. Open a Midtrans Snap session.
        setSubmitStage('Menyiapkan pembayaran...')
        const idempotencyKey = `pay-${createdOrder.id}`
        const payment = await customerApi.createPayment(createdOrder.id, 'snap', idempotencyKey)

        if (!payment.snap_redirect_url) {
          // Without a payment page there is nothing for the customer to do.
          // Send them to the order screen, which offers a retry, instead of
          // showing a success page for an unpaid order.
          navigate(`/order-success/${createdOrder.id}`)
          return
        }

        // The basket is only cleared once a real payment page exists.
        clearCart()

        // 4. Hand the customer to Midtrans. This step was missing entirely:
        //    the old flow created a transaction, discarded the redirect URL
        //    and declared the order successful without collecting any money.
        setSubmitStage('Mengalihkan ke halaman pembayaran...')
        window.location.assign(payment.snap_redirect_url)
      } catch (err) {
        setErrorMsg(errorMessage(err, 'Gagal membuat pesanan. Periksa koneksi dan coba lagi.'))
      } finally {
        submitInFlightRef.current = false
        setIsSubmitting(false)
        setSubmitStage('')
      }
    },
    [
      phone, name, isDelivery, addressDetail, hardBlocker, blocker, activeBranch, orderType,
      location, appliedPromo, scheduledTime, items, stockMap, clearCart, navigate, focusField,
    ]
  )

  return (
    <div className="min-h-screen bg-brand-50/40 pb-24 lg:pb-16 pt-6 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            to="/cart"
            aria-label="Kembali ke keranjang"
            className="w-10 h-10 rounded-2xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 flex items-center justify-center shadow-sm shrink-0"
          >
            <i className="fa-solid fa-arrow-left text-sm" aria-hidden="true"></i>
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-bold text-stone-900">Penyelesaian Pesanan 💳</h1>
            <p className="text-xs text-stone-500">Mohon periksa cabang pilihan, alamat pengiriman, dan rincian pesanan Anda 😊</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-sm space-y-3">
            <i className="fa-solid fa-cart-shopping text-3xl text-stone-300" aria-hidden="true"></i>
            <h3 className="font-bold text-stone-800 text-sm">Keranjang Anda kosong</h3>
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold shadow-md"
            >
              Lihat menu
            </Link>
          </div>
        ) : (
          <form noValidate onSubmit={handleSubmitOrder} className="space-y-5">
            {/* ---- Order type ---- */}
            <fieldset className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
              <legend className="font-serif font-bold text-sm text-stone-900">Cara Penerimaan Pesanan 🛵</legend>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'delivery', label: 'Diantar ke Rumah 🛵', icon: 'fa-motorcycle' },
                  { id: 'pickup', label: 'Ambil di Cabang 🚶', icon: 'fa-person-walking' },
                  { id: 'scheduled', label: 'Jadwalkan Jam ⏰', icon: 'fa-clock' },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={orderType === opt.id}
                    onClick={() => setOrderType(opt.id)}
                    className={`py-3 px-2 rounded-2xl border text-center transition-all ${
                      orderType === opt.id
                        ? 'bg-brand-50 border-brand-500 text-brand-800 font-bold shadow-sm'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <i className={`fa-solid ${opt.icon} text-base block mb-1`} aria-hidden="true"></i>
                    <span className="text-xs">{opt.label}</span>
                  </button>
                ))}
              </div>

              {orderType === 'scheduled' && (
                <div className="pt-2 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label htmlFor="scheduled-time" className="text-xs text-stone-600 font-medium">
                      Jam pengantaran <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={scheduledTimeRef}
                      id="scheduled-time"
                      type="time"
                      required
                      value={scheduledTime}
                      onChange={(e) => {
                        setScheduledTime(e.target.value)
                        if (e.target.value) {
                          setScheduledTimeError(null)
                          setErrorMsg(null)
                        }
                      }}
                      aria-invalid={Boolean(scheduledTimeError)}
                      aria-describedby={scheduledTimeError ? 'scheduled-time-error' : undefined}
                      className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all focus:outline-none ${
                        scheduledTimeError
                          ? 'bg-red-50/40 border-2 border-red-500 text-red-800 ring-2 ring-red-500/20'
                          : 'bg-stone-50 border border-stone-300 focus:border-brand-500'
                      }`}
                    />
                    {scheduledTime && (
                      <span className="text-[11px] text-stone-500">
                        {new Date(scheduledTimestamp(scheduledTime) ?? '').toLocaleString('id-ID', {
                          weekday: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                  {scheduledTimeError && (
                    <p id="scheduled-time-error" className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                      <i className="fa-solid fa-circle-exclamation text-[10px]" aria-hidden="true"></i>
                      {scheduledTimeError}
                    </p>
                  )}
                </div>
              )}
            </fieldset>

            {/* ---- Pickup branch info ---- */}
            {orderType === 'pickup' && activeBranch && (
              <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-serif font-bold text-sm text-stone-900">Lokasi Pengambilan Pesanan 🏪</h3>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Bebas Ongkir
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                  <i className="fa-solid fa-store text-brand-600 mt-0.5 text-sm shrink-0" aria-hidden="true"></i>
                  <div className="min-w-0 text-xs space-y-0.5">
                    <span className="block font-bold text-stone-900">{activeBranch.name}</span>
                    <span className="block text-stone-600 break-words">{activeBranch.address}</span>
                    {activeBranch.today_hours && (
                      <span className="block text-[11px] text-stone-500">
                        Jam operasional hari ini: {activeBranch.today_hours}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-stone-500">
                  Pesanan Anda akan disiapkan di cabang pilihan di bawah ini untuk diambil langsung tanpa biaya pengantaran.
                </p>
              </div>
            )}

            {/* ---- Delivery address ---- */}
            {isDelivery && (
              <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif font-bold text-sm text-stone-900">Alamat Pengiriman Rumah 🏠</h3>
                  <button
                    type="button"
                    onClick={() => setLocationOpen(true)}
                    className="text-xs text-brand-600 hover:underline font-bold shrink-0"
                  >
                    {location ? 'Ubah Alamat 📍' : 'Pilih Alamat 📍'}
                  </button>
                </div>

                {location ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setLocationOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setLocationOpen(true)
                      }
                    }}
                    className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-2.5 cursor-pointer hover:bg-stone-100 hover:border-brand-300 transition-colors group"
                    title="Klik untuk mengubah alamat pengiriman"
                  >
                    <i className="fa-solid fa-location-dot text-brand-600 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" aria-hidden="true"></i>
                    <div className="min-w-0 flex-1 text-xs">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 group-hover:text-brand-600 transition-colors">
                        Lokasi Pengiriman
                        {location.source === 'gps' ? ' · Lokasi Otomatis' : ' · Hasil Pencarian'}
                      </span>
                      <span className="block text-stone-800 font-medium break-words">{location.address}</span>
                    </div>
                    <i className="fa-solid fa-chevron-right text-stone-400 self-center text-[10px] shrink-0 group-hover:text-brand-600 transition-colors" aria-hidden="true"></i>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <button
                      ref={locationBtnRef}
                      type="button"
                      onClick={() => setLocationOpen(true)}
                      className={`w-full p-4 rounded-2xl border border-dashed transition-colors text-left flex items-center gap-3 ${
                        locationError
                          ? 'border-red-500 bg-red-50/50 ring-2 ring-red-500/20'
                          : 'border-brand-300 bg-brand-50/50 hover:bg-brand-50'
                      }`}
                    >
                      <i className="fa-solid fa-location-crosshairs text-brand-600 text-lg shrink-0" aria-hidden="true"></i>
                      <span className="text-xs">
                        <span className="block font-bold text-stone-900">Pilih Alamat Pengiriman Anda</span>
                        <span className="block text-stone-500 text-[11px]">
                          Biaya pengiriman dihitung berdasarkan jarak cabang ke alamat Anda
                        </span>
                      </span>
                    </button>
                    {locationError && (
                      <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                        <i className="fa-solid fa-circle-exclamation text-[10px]" aria-hidden="true"></i>
                        {locationError}
                      </p>
                    )}
                  </div>
                )}

                {isOutOfRange && quote && activeBranch && (
                  <div
                    className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs space-y-2"
                    role="alert"
                  >
                    <div className="flex items-start gap-2.5">
                      <i className="fa-solid fa-ban text-red-600 mt-0.5 text-sm shrink-0" aria-hidden="true"></i>
                      <div className="space-y-0.5">
                        <p className="font-bold text-red-900">
                          {isOutsideSolo
                            ? 'Lokasi Di Luar Wilayah Surakarta / Solo Raya'
                            : `Jarak Pengiriman Terlalu Jauh (${quote.distance_km} km)`}
                        </p>
                        <p className="text-[11px] text-red-700 leading-relaxed">
                          {isOutsideSolo
                            ? 'Maaf, layanan pesan antar hanya tersedia untuk wilayah Kota Surakarta / Solo Raya (maksimal 10 km dari cabang). Pemesanan & pembayaran pesan antar tidak dapat dilanjutkan untuk lokasi ini.'
                            : `Alamat Anda berjarak ${quote.distance_km} km dari ${activeBranch.name}, melebihi batas maksimal pengantaran (${quote.max_radius_km} km). Silakan pilih cabang lain yang lebih dekat, ubah alamat, atau gunakan Ambil di Cabang.`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1 pl-6">
                      <button
                        type="button"
                        onClick={() => setLocationOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] transition-colors"
                      >
                        Ubah Alamat 📍
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderType('pickup')}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] transition-colors"
                      >
                        Beralih ke Ambil di Cabang 🚶
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="address-detail" className="block text-xs font-semibold text-stone-700 mb-1">
                    Detail Alamat & Patokan Rumah <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={addressDetailRef}
                    id="address-detail"
                    type="text"
                    required
                    maxLength={300}
                    value={addressDetail}
                    onChange={(e) => {
                      setAddressDetail(e.target.value)
                      if (e.target.value.trim()) {
                        setAddressDetailError(null)
                        setErrorMsg(null)
                      }
                    }}
                    aria-invalid={Boolean(addressDetailError)}
                    aria-describedby={addressDetailError ? 'address-detail-error' : undefined}
                    placeholder="Contoh: Rumah pagar hitam, no. 14A, depan masjid"
                    className={`w-full px-4 py-2.5 text-xs border rounded-xl focus:outline-none focus:bg-white transition-all ${
                      addressDetailError
                        ? 'bg-red-50/40 border-red-500 text-red-900 ring-2 ring-red-500/20 focus:border-red-500'
                        : 'bg-stone-50 border-stone-300 focus:border-brand-500 text-stone-900'
                    }`}
                  />
                  {addressDetailError && (
                    <p id="address-detail-error" className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                      <i className="fa-solid fa-circle-exclamation text-[10px]" aria-hidden="true"></i>
                      {addressDetailError}
                    </p>
                  )}
                  <p className="text-[10px] text-stone-500 mt-1">
                    Isi nomor rumah atau patokan penting agar kurir dapat menghantarkan pesanan Anda dengan tepat dan mudah.
                  </p>
                </div>
              </div>
            )}

            {/* ---- Outlet selection, priced per outlet ---- */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif font-bold text-sm text-stone-900">Outlet</h3>
                  <p className="text-[11px] text-stone-500">
                    {orderType === 'pickup'
                      ? 'Pilih cabang tempat Anda akan mengambil pesanan'
                      : location
                        ? 'Jarak dan ongkir dihitung oleh server dari lokasi Anda'
                        : 'Tentukan lokasi untuk melihat jarak dan ongkir'}
                  </p>
                </div>
                {quotesLoading && (
                  <i className="fa-solid fa-circle-notch fa-spin text-brand-600 text-sm mt-1" aria-hidden="true"></i>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {branches.map((b) => {
                  const info = quoteFor(b.id)
                  const isSelected = activeBranch?.id === b.id
                  const unavailable = !b.is_open_now
                  const branchOutOfRange = isDelivery && info && !info.within_radius

                  return (
                    <button
                      key={b.id}
                      type="button"
                      aria-pressed={isSelected}
                      disabled={unavailable}
                      onClick={() => setSelectedBranch(b)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                        unavailable
                          ? 'bg-stone-100 border-stone-200 opacity-60 cursor-not-allowed'
                          : isSelected
                            ? branchOutOfRange
                              ? 'bg-red-50/70 border-red-400 shadow-md ring-2 ring-red-400/30'
                              : 'bg-amber-50/70 border-brand-500 shadow-md ring-2 ring-brand-500/30'
                            : 'bg-stone-50/80 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs text-stone-900 truncate">{b.name}</span>
                          {info?.is_nearest && info.within_radius && (
                            <span className="text-[9px] font-extrabold uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                              Terdekat
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-500 line-clamp-1">{b.address}</p>
                        {unavailable && (
                          <p className="text-[10px] text-red-600 font-bold mt-0.5">Tutup</p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-brand-700 flex items-center gap-1">
                          <i className={`fa-solid ${orderType === 'pickup' ? 'fa-store' : 'fa-route'} text-[10px]`} aria-hidden="true"></i>
                          {info ? `${info.distance_km} km` : orderType === 'pickup' ? 'Ambil' : '—'}
                        </span>
                        {orderType === 'pickup' ? (
                          <span className="font-bold text-emerald-700">Bebas Ongkir</span>
                        ) : branchOutOfRange ? (
                          <span className="font-bold text-red-600 text-[10px]">Di luar jangkauan</span>
                        ) : (
                          <span className="font-bold text-stone-800">
                            {info ? (info.delivery_fee === 0 ? 'Gratis' : formatRupiah(info.delivery_fee)) : '—'}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {quotesError && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                  {quotesError}
                </p>
              )}
            </div>

            {/* ---- Order items preview & stock status ---- */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-sm text-stone-900">
                  Ringkasan pesanan ({items.length} menu)
                </h3>
                <Link to="/cart" className="text-xs text-brand-600 hover:underline font-bold">
                  Ubah
                </Link>
              </div>

              {unavailableItems.length > 0 && activeBranch && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-red-900 text-xs">
                  <i className="fa-solid fa-triangle-exclamation text-red-600 mt-0.5 text-sm shrink-0" aria-hidden="true"></i>
                  <div>
                    <span className="font-bold block">Ada menu yang habis di {activeBranch.name}</span>
                    <span className="text-[11px] text-stone-600 block mt-0.5">
                      {unavailableItems.map((u) => u.cartItem.name).join(', ')}. Silakan kembali ke keranjang untuk menghapus menu tersebut atau pilih outlet lain.
                    </span>
                  </div>
                </div>
              )}

              <div className="divide-y divide-stone-100">
                {items.map((it) => {
                  const isUnavail = stockMap[it.id]?.available === false
                  return (
                    <div key={it.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">{it.quantity}x</span>
                          <span className="text-stone-800 font-medium truncate">{it.name}</span>
                        </div>
                        {isUnavail && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                            <i className="fa-solid fa-triangle-exclamation text-red-600 text-[9px]"></i>
                            Stok habis di outlet ini
                          </span>
                        )}
                        {it.notes && <p className="text-[11px] text-stone-400 italic">"{it.notes}"</p>}
                      </div>
                      <span className="font-bold text-stone-900 shrink-0">{formatRupiah(it.price * it.quantity)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ---- Customer details ---- */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-sm text-stone-900">Data Pemesan 👤</h3>

              <div>
                <label htmlFor="cust-name" className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Pemesan / Panggilan *
                </label>
                <input
                  ref={nameRef}
                  id="cust-name"
                  type="text"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (e.target.value.trim().length >= 2) {
                      setNameError(null)
                      setErrorMsg(null)
                    }
                  }}
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={nameError ? 'name-error' : undefined}
                  placeholder="Contoh: Pak Budi / Bu Siti"
                  className={`w-full px-4 py-2.5 text-xs border rounded-xl focus:outline-none focus:bg-white transition-all ${
                    nameError
                      ? 'bg-red-50/40 border-red-500 text-red-900 ring-2 ring-red-500/20 focus:border-red-500'
                      : 'bg-stone-50 border-stone-300 focus:border-brand-500 text-stone-900'
                  }`}
                />
                {nameError && (
                  <p id="name-error" className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                    <i className="fa-solid fa-circle-exclamation text-[10px]" aria-hidden="true"></i>
                    {nameError}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <label htmlFor="cust-phone" className="block text-xs font-semibold text-stone-700">
                    Nomor WhatsApp Active *
                  </label>
                  <span className="text-[10px] text-stone-400 font-mono">08... atau +628...</span>
                </div>
                <div className="relative">
                  <i
                    className="fa-brands fa-whatsapp absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 text-sm"
                    aria-hidden="true"
                  ></i>
                  <input
                    ref={phoneRef}
                    id="cust-phone"
                    type="tel"
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      if (phoneError) setPhoneError(null)
                      if (errorMsg) setErrorMsg(null)
                    }}
                    onBlur={handlePhoneBlur}
                    aria-invalid={Boolean(phoneError)}
                    aria-describedby={phoneError ? 'phone-error' : undefined}
                    placeholder="081234567890"
                    className={`w-full pl-9 pr-4 py-2.5 text-xs border rounded-xl font-mono focus:outline-none focus:bg-white transition-all ${
                      phoneError
                        ? 'bg-red-50/40 border-red-500 text-red-700 ring-2 ring-red-500/20 focus:border-red-500'
                        : 'bg-stone-50 border-stone-300 focus:border-brand-500 text-stone-900'
                    }`}
                  />
                </div>
                {phoneError && (
                  <p id="phone-error" className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                    <i className="fa-solid fa-circle-exclamation text-[10px]" aria-hidden="true"></i>
                    {phoneError}
                  </p>
                )}
                <p className="text-[10px] text-stone-400 mt-1">
                  Nomor ini dipakai untuk melacak pesanan dan dihubungi kurir.
                </p>
              </div>
            </div>

            {/* ---- Summary & submit ---- */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3 text-xs">
              <h4 className="font-serif font-bold text-sm text-stone-900">Rincian pembayaran</h4>

              <div className="space-y-1.5 text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal ({items.length} menu)</span>
                  <span className="font-bold text-stone-900">{formatRupiah(subtotal)}</span>
                </div>

                {isDelivery ? (
                  <div className="flex justify-between">
                    <span>Biaya Pengiriman{quote ? ` (${quote.distance_km} km)` : ''}</span>
                    {isOutOfRange ? (
                      <span className="font-bold text-red-600">Di luar jangkauan</span>
                    ) : (
                      <span className="font-bold text-stone-900">
                        {quote ? (deliveryFee === 0 ? 'Gratis Kirim' : formatRupiah(deliveryFee)) : 'Belum dihitung'}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span>Biaya Pengiriman (Ambil di Cabang)</span>
                    <span className="font-bold text-emerald-600">Gratis</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Biaya Layanan Aplikasi</span>
                  <span className="font-bold text-stone-900">{formatRupiah(serviceFee)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Potongan Harga / Promo ({appliedPromo})</span>
                    <span>-{formatRupiah(discount)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-sm font-extrabold text-stone-900 pt-3 border-t border-stone-100">
                <span>Total tagihan</span>
                <span className="text-brand-700 text-lg font-mono">{formatRupiah(grandTotal)}</span>
              </div>

              {incompleteFields.length > 0 && !errorMsg && !isOutOfRange && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                  <p className="flex items-center gap-2">
                    <i className="fa-solid fa-circle-exclamation shrink-0" aria-hidden="true"></i>
                    Lengkapi sebelum membayar (ketuk untuk mengisi):
                  </p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-6 font-medium">
                    {incompleteFields.map((field) => (
                      <li key={field.label}>
                        <button
                          type="button"
                          onClick={field.focus}
                          className="underline hover:text-amber-950 text-left font-semibold"
                        >
                          {field.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(errorMsg || isOutOfRange || (blocker && incompleteFields.length === 0)) && (
                <div
                  className={`p-3 rounded-2xl text-xs font-semibold flex items-start gap-2 ${
                    errorMsg || isOutOfRange
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : 'bg-amber-50 border border-amber-200 text-amber-800'
                  }`}
                  role={errorMsg || isOutOfRange ? 'alert' : undefined}
                >
                  <i
                    className="fa-solid fa-circle-exclamation mt-0.5 shrink-0"
                    aria-hidden="true"
                  ></i>
                  <span>{errorMsg ?? blocker}</span>
                </div>
              )}

              {isStoreClosed && (
                <div
                  className="p-3.5 rounded-2xl text-xs font-semibold bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5"
                  role="alert"
                >
                  <i className="fa-solid fa-store-slash mt-0.5 shrink-0 text-sm" aria-hidden="true"></i>
                  <div>
                    <p className="font-bold">{activeBranch?.name ?? 'Cabang ini'} sedang tutup saat ini.</p>
                    <p className="font-normal text-[11px] text-red-600 mt-0.5">
                      Tombol bayar dinonaktifkan. Silakan pilih cabang lain yang sedang buka di bagian atas untuk melanjutkan pemesanan.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isStoreClosed || isOutOfRange || Boolean(hardBlocker)}
                aria-disabled={isSubmitting || isStoreClosed || isOutOfRange || Boolean(hardBlocker)}
                className={`w-full py-4 font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm tracking-wide ${
                  isStoreClosed || isOutOfRange || Boolean(hardBlocker)
                    ? 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none border border-stone-300'
                    : 'bg-brand-600 hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-base" aria-hidden="true"></i>
                    <span>{submitStage || 'Memproses...'}</span>
                  </>
                ) : isStoreClosed ? (
                  <>
                    <i className="fa-solid fa-door-closed text-sm" aria-hidden="true"></i>
                    <span>Toko Sedang Tutup ({activeBranch?.name ?? 'Cabang'}) 😴</span>
                  </>
                ) : isOutOfRange ? (
                  <>
                    <i className="fa-solid fa-ban text-sm" aria-hidden="true"></i>
                    <span>Lokasi Di Luar Jangkauan Pengiriman 🚫</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-lock text-xs" aria-hidden="true"></i>
                    <span>Lanjut Bayar {formatRupiah(grandTotal)} 💳</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <LocationModal
        isOpen={locationOpen}
        onClose={() => setLocationOpen(false)}
        reason="Ongkos kirim dihitung dari jarak sebenarnya antara alamat ini dan outlet."
      />
    </div>
  )
}
