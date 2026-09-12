import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
  const { items, subtotal, discount, appliedPromo, clearCart } = useCart()
  const { branches, selectedBranch, setSelectedBranch, nearestBranch, quoteFor, refreshQuotes, quotesLoading, quotesError } =
    useBranch()
  const { location } = useLocation()
  const navigate = useNavigate()

  const profile = useMemo(storedProfile, [])

  const [orderType, setOrderType] = useState<OrderType>('delivery')
  const [name, setName] = useState(profile.name)
  const [phone, setPhone] = useState(profile.phone)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  // Optional address detail (house/floor/gate note); main address comes directly from location preview
  const [addressDetail, setAddressDetail] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStage, setSubmitStage] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [locationOpen, setLocationOpen] = useState(false)

  const isDelivery = orderType === 'delivery' || orderType === 'scheduled'

  // Auto-select the nearest outlet that can serve this basket.
  const activeBranch: Branch | null = selectedBranch ?? nearestBranch ?? branches[0] ?? null
  useEffect(() => {
    if (!selectedBranch && nearestBranch) setSelectedBranch(nearestBranch)
  }, [selectedBranch, nearestBranch, setSelectedBranch])

  // Validate stock in real-time for the active branch
  const { unavailableItems, stockMap, isAllAvailable } = useBranchStock(items, activeBranch)

  useEffect(() => {
    if (location && subtotal > 0) void refreshQuotes(subtotal)
  }, [location, subtotal, refreshQuotes])

  const quote: BranchDeliveryQuote | null = activeBranch ? quoteFor(activeBranch.id) : null

  const deliveryFee = isDelivery ? (quote?.delivery_fee ?? 0) : 0
  const serviceFee = quote?.service_fee ?? 0
  const grandTotal = Math.max(0, subtotal + deliveryFee + serviceFee - discount)

  /** Everything that must be true before the pay button does anything. */
  const blocker = useMemo<string | null>(() => {
    if (items.length === 0) return 'Keranjang pesanan kosong.'
    if (!activeBranch) return 'Pilih outlet terlebih dahulu.'
    if (!activeBranch.is_open_now) return `${activeBranch.name} sedang tutup. Pilih outlet lain.`
    if (unavailableItems.length > 0) {
      return `${unavailableItems[0].cartItem.name} stoknya habis di ${activeBranch.name}. Silakan ganti outlet atau hapus dari keranjang.`
    }
    if (isDelivery && !location) return 'Tentukan alamat pengantaran terlebih dahulu.'
    if (isDelivery && !quote) return 'Ongkos kirim belum dapat dihitung. Coba tentukan ulang alamat Anda.'
    if (isDelivery && quote && !quote.within_radius) {
      return `Alamat Anda ${quote.distance_km} km dari ${activeBranch.name}, di luar jangkauan ${quote.max_radius_km} km. Pilih outlet lain atau ambil sendiri.`
    }
    if (orderType === 'scheduled' && !scheduledTime) return 'Pilih jam pengantaran.'
	if (isDelivery && !deliveryNotes.trim()) return 'Catatan untuk kurir wajib diisi.'
    return null
  }, [items.length, activeBranch, unavailableItems, isDelivery, location, quote, orderType, scheduledTime, deliveryNotes])

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
      setErrorMsg(null)

      const phoneCheck = normalizePhone(phone)
      if (!phoneCheck.valid) {
        setPhoneError(phoneCheck.error ?? 'Format WhatsApp tidak valid')
        return
      }
      if (!name.trim()) {
        setErrorMsg('Silakan isi nama pemesan.')
        return
      }
      if (isDelivery && !location) {
        setErrorMsg('Silakan tentukan alamat pengantaran.')
        return
      }
	  if (isDelivery && !deliveryNotes.trim()) {
		setErrorMsg('Catatan untuk kurir wajib diisi.')
		return
	  }
      if (blocker) {
        setErrorMsg(blocker)
        return
      }
      if (!activeBranch) return

      setIsSubmitting(true)
      try {
        // 1. Establish a session so the order belongs to this customer and can
        //    be tracked and cancelled later.
        setSubmitStage('Memverifikasi nomor Anda...')
        await customerApi.login(phoneCheck.normalized, name.trim())

        // Full delivery address combines resolved location point with optional user detail
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
          delivery_notes: isDelivery ? deliveryNotes.trim() : '',
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
        setIsSubmitting(false)
        setSubmitStage('')
      }
    },
    [
      phone, name, isDelivery, addressDetail, blocker, activeBranch, orderType, deliveryNotes,
      location, appliedPromo, scheduledTime, items, stockMap, clearCart, navigate,
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
            <h1 className="font-serif text-2xl font-bold text-stone-900">Kasir & Pembayaran</h1>
            <p className="text-xs text-stone-500">Periksa outlet, alamat, dan rincian biaya Anda</p>
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
          <form onSubmit={handleSubmitOrder} className="space-y-5">
            {/* ---- Order type ---- */}
            <fieldset className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
              <legend className="font-serif font-bold text-sm text-stone-900">Metode penerimaan</legend>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'delivery', label: 'Diantar', icon: 'fa-motorcycle' },
                  { id: 'pickup', label: 'Ambil sendiri', icon: 'fa-person-walking' },
                  { id: 'scheduled', label: 'Jadwalkan', icon: 'fa-clock' },
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
                <div className="pt-2 flex items-center gap-2 flex-wrap">
                  <label htmlFor="scheduled-time" className="text-xs text-stone-600 font-medium">
                    Jam pengantaran
                  </label>
                  <input
                    id="scheduled-time"
                    type="time"
                    required
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-xl font-bold"
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
              )}
            </fieldset>

            {/* ---- Delivery address ---- */}
            {isDelivery && (
              <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif font-bold text-sm text-stone-900">Alamat pengantaran</h3>
                  <button
                    type="button"
                    onClick={() => setLocationOpen(true)}
                    className="text-xs text-brand-600 hover:underline font-bold shrink-0"
                  >
                    {location ? 'Ubah lokasi' : 'Tentukan lokasi'}
                  </button>
                </div>

                {location ? (
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-2.5">
                    <i className="fa-solid fa-location-dot text-brand-600 mt-0.5 shrink-0" aria-hidden="true"></i>
                    <div className="min-w-0 text-xs">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Titik pengantaran
                        {location.source === 'gps' ? ' · GPS' : ' · pencarian alamat'}
                      </span>
                      <span className="block text-stone-800 font-medium break-words">{location.address}</span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setLocationOpen(true)}
                    className="w-full p-4 rounded-2xl border border-dashed border-brand-300 bg-brand-50/50 hover:bg-brand-50 transition-colors text-left flex items-center gap-3"
                  >
                    <i className="fa-solid fa-location-crosshairs text-brand-600 text-lg shrink-0" aria-hidden="true"></i>
                    <span className="text-xs">
                      <span className="block font-bold text-stone-900">Tentukan lokasi Anda</span>
                      <span className="block text-stone-500 text-[11px]">
                        Ongkos kirim dihitung dari jarak sebenarnya
                      </span>
                    </span>
                  </button>
                )}

                <div>
                  <label htmlFor="address-detail" className="block text-xs font-semibold text-stone-700 mb-1">
                    Detail alamat & patokan <span className="text-stone-400 font-normal">(opsional)</span>
                  </label>
                  <input
                    id="address-detail"
                    type="text"
                    maxLength={300}
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    placeholder="Contoh: ketuk 3x, nomor 14a"
                    className="w-full px-4 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">
                    Alamat pengantaran utama sudah menggunakan titik lokasi di atas. Tambahkan detail seperti nomor rumah atau patokan jika perlu.
                  </p>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-xs font-semibold text-stone-700 mb-1">
                    Catatan untuk kurir <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="notes"
                    type="text"
				required
                    maxLength={300}
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Contoh: pagar hitam, titip ke sekuriti"
                    className="w-full px-4 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            {/* ---- Outlet selection, priced per outlet ---- */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif font-bold text-sm text-stone-900">Outlet</h3>
                  <p className="text-[11px] text-stone-500">
                    {location
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
                            ? 'bg-amber-50/70 border-brand-500 shadow-md ring-2 ring-brand-500/30'
                            : 'bg-stone-50/80 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs text-stone-900 truncate">{b.name}</span>
                          {info?.is_nearest && (
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
                          <i className="fa-solid fa-route text-[10px]" aria-hidden="true"></i>
                          {info ? `${info.distance_km} km` : '—'}
                        </span>
                        <span className="font-bold text-stone-800">
                          {info ? (info.delivery_fee === 0 ? 'Gratis' : formatRupiah(info.delivery_fee)) : '—'}
                        </span>
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
              <h3 className="font-serif font-bold text-sm text-stone-900">Informasi pemesan</h3>

              <div>
                <label htmlFor="cust-name" className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama pemesan *
                </label>
                <input
                  id="cust-name"
                  type="text"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap Anda"
                  className="w-full px-4 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <label htmlFor="cust-phone" className="block text-xs font-semibold text-stone-700">
                    WhatsApp *
                  </label>
                  <span className="text-[10px] text-stone-400 font-mono">08... atau +628...</span>
                </div>
                <div className="relative">
                  <i
                    className="fa-brands fa-whatsapp absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 text-sm"
                    aria-hidden="true"
                  ></i>
                  <input
                    id="cust-phone"
                    type="tel"
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={handlePhoneBlur}
                    aria-invalid={Boolean(phoneError)}
                    aria-describedby={phoneError ? 'phone-error' : undefined}
                    placeholder="081234567890"
                    className={`w-full pl-9 pr-4 py-2.5 text-xs bg-stone-50 border rounded-xl font-mono focus:outline-none focus:bg-white transition-all ${
                      phoneError ? 'border-red-500 text-red-700' : 'border-stone-300 focus:border-brand-500 text-stone-900'
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
                  <span>Subtotal ({items.length} item)</span>
                  <span className="font-bold text-stone-900">{formatRupiah(subtotal)}</span>
                </div>

                {isDelivery && (
                  <div className="flex justify-between">
                    <span>Ongkir{quote ? ` (${quote.distance_km} km)` : ''}</span>
                    <span className="font-bold text-stone-900">
                      {quote ? (deliveryFee === 0 ? 'Gratis' : formatRupiah(deliveryFee)) : 'Belum dihitung'}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Biaya layanan</span>
                  <span className="font-bold text-stone-900">{formatRupiah(serviceFee)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Diskon ({appliedPromo})</span>
                    <span>-{formatRupiah(discount)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-sm font-extrabold text-stone-900 pt-3 border-t border-stone-100">
                <span>Total tagihan</span>
                <span className="text-brand-700 text-lg font-mono">{formatRupiah(grandTotal)}</span>
              </div>

              {(errorMsg || blocker) && (
                <div
                  className={`p-3 rounded-2xl text-xs font-semibold flex items-start gap-2 ${
                    errorMsg
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : 'bg-amber-50 border border-amber-200 text-amber-800'
                  }`}
                  role={errorMsg ? 'alert' : undefined}
                >
                  <i
                    className="fa-solid fa-circle-exclamation mt-0.5 shrink-0"
                    aria-hidden="true"
                  ></i>
                  <span>{errorMsg ?? blocker}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || Boolean(blocker) || !isAllAvailable}
                className="w-full py-4 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm tracking-wide"
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-base" aria-hidden="true"></i>
                    <span>{submitStage || 'Memproses...'}</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-lock text-xs" aria-hidden="true"></i>
                    <span>{!isAllAvailable ? 'Ada menu yang stoknya habis' : `Bayar ${formatRupiah(grandTotal)}`}</span>
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
