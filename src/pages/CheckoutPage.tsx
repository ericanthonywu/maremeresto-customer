import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useBranch } from '../context/BranchContext'
import { customerApi, normalizePhone } from '../api/client'
import type { Branch } from '../types'

export const CheckoutPage: React.FC = () => {
  const { items, subtotal, serviceFee, discount, appliedPromo, clearCart } = useCart()
  const { branches, selectedBranch, setSelectedBranch, nearestBranch, userLocation, getBranchDistanceInfo } = useBranch()
  const navigate = useNavigate()

  // Branch Selection in Checkout (Auto-selected to nearest branch!)
  const [activeBranch, setActiveBranch] = useState<Branch | null>(selectedBranch || nearestBranch || null)

  useEffect(() => {
    if (!activeBranch && (nearestBranch || selectedBranch || branches[0])) {
      const b = nearestBranch || selectedBranch || branches[0]
      setActiveBranch(b)
      setSelectedBranch(b)
    }
  }, [nearestBranch, selectedBranch, branches, activeBranch, setSelectedBranch])

  // Current distance info and dynamic delivery fee based on chosen branch
  const activeDistanceInfo = activeBranch
    ? getBranchDistanceInfo(activeBranch, subtotal)
    : { distanceKm: 2.5, distanceMeters: 2500, estimatedMinutes: 20, deliveryFee: 8000, isNearest: false }

  const currentDeliveryFee = activeDistanceInfo.deliveryFee
  const dynamicGrandTotal = Math.max(0, subtotal + currentDeliveryFee + serviceFee - discount)

  // Form states
  const [orderType, setOrderType] = useState<'delivery' | 'pickup' | 'scheduled'>('delivery')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [address, setAddress] = useState(userLocation?.address || 'Jl. Slamet Riyadi No. 120, Surakarta')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [scheduledTime, setScheduledTime] = useState('14:30')

  // Payment Method: Strictly QRIS & E-Money only, completely hidden VA & COD as requested
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'gopay' | 'shopeepay'>('qris')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)

  const handlePhoneBlur = () => {
    if (!phone) return
    const res = normalizePhone(phone)
    if (!res.valid) {
      setPhoneError(res.error || 'Format nomor telepon tidak valid')
    } else {
      setPhoneError(null)
      setPhone(res.normalized)
    }
  }

  const handleBranchSelect = (branch: Branch) => {
    setActiveBranch(branch)
    setSelectedBranch(branch)
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    // Validate phone number strictly (+628...)
    const phoneCheck = normalizePhone(phone)
    if (!phoneCheck.valid) {
      setPhoneError(phoneCheck.error || 'Format nomor telepon tidak valid')
      return
    }

    if (!name.trim()) {
      setErrorMessage('Silakan isi nama pemesan')
      return
    }

    if (items.length === 0) {
      setErrorMessage('Keranjang pesanan kosong')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Auto-login or register customer by phone
      await customerApi.login(phoneCheck.normalized, name.trim())

      // 2. Create Order with branch and coordinates
      const branchToUse = activeBranch || selectedBranch || branches[0]
      const payload = {
        branch_id: branchToUse.id,
        order_type: orderType,
        customer_name: name.trim(),
        customer_phone: phoneCheck.normalized,
        delivery_address: orderType === 'delivery' || orderType === 'scheduled' ? address : '',
        delivery_notes: deliveryNotes,
        delivery_lat: userLocation?.lat || -7.5532,
        delivery_lon: userLocation?.lon || 110.8061,
        promo_code: appliedPromo || '',
        scheduled_at: orderType === 'scheduled' ? new Date().toISOString() : null,
        items: items.map((item) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          notes: item.notes || '',
        })),
      }

      const createdOrder = await customerApi.createOrder(payload)

      // 3. Initiate Midtrans Payment
      const idempotencyKey = `pay-${createdOrder.id}-${Date.now()}`
      await customerApi.createPayment(createdOrder.id, paymentMethod, idempotencyKey)

      // Clear cart & route to success
      clearCart()
      navigate(`/order-success/${createdOrder.id}`)
    } catch (err: any) {
      console.error('Order submission failed', err)
      setErrorMessage(
        err.response?.data?.error || 'Gagal membuat pesanan. Silakan periksa koneksi dan coba lagi.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fbf9f6] pb-24 lg:pb-16 pt-6">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            to="/cart"
            className="w-10 h-10 rounded-2xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 flex items-center justify-center shadow-sm"
          >
            <i className="fa-solid fa-arrow-left text-sm"></i>
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-bold text-stone-900">Kasir & Pembayaran</h1>
            <p className="text-xs text-stone-500">
              Pilih outlet, periksa jarak pengantaran, dan konfirmasi pesanan Anda
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitOrder} className="space-y-5">
          {/* Outlet Selection Card (Auto-Select Nearest + Distance Calculation) */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-sm text-stone-900">
                  Pilih Cabang Outlet Pengiriman
                </h3>
                <p className="text-[11px] text-stone-500">
                  Sistem otomatis memilih cabang terdekat ke lokasi Anda
                </p>
              </div>
              <span className="text-[10px] font-extrabold uppercase text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                Auto-Select Aktif
              </span>
            </div>

            {/* Branch Radio Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {branches.map((b) => {
                const info = getBranchDistanceInfo(b, subtotal)
                const isSelected = activeBranch?.id === b.id

                return (
                  <div
                    key={b.id}
                    onClick={() => handleBranchSelect(b)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-50/70 border-brand-500 shadow-md ring-2 ring-brand-500/30'
                        : 'bg-stone-50/80 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs text-stone-900 truncate">
                          {b.name}
                        </span>
                        {info.isNearest && (
                          <span className="text-[9px] font-extrabold uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                            Terdekat
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-stone-500 line-clamp-1">{b.address}</p>
                    </div>

                    <div className="pt-2 mt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold text-brand-700 flex items-center gap-1">
                        <i className="fa-solid fa-route text-[10px]"></i>
                        {info.distanceKm} km
                      </span>
                      <span className="font-bold text-stone-800">
                        {formatRupiah(info.deliveryFee)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Distance Summary Banner */}
            {activeBranch && (
              <div className="mt-2 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-location-dot text-brand-600"></i>
                  <span className="text-stone-700">
                    Jarak ke <strong>{activeBranch.name}</strong>: <strong className="text-brand-700 font-mono">{activeDistanceInfo.distanceKm} km</strong> ({activeDistanceInfo.distanceMeters.toLocaleString('id-ID')} meter)
                  </span>
                </div>
                <span className="text-stone-500 font-semibold text-[11px]">
                  Est. tiba ~{activeDistanceInfo.estimatedMinutes} mnt
                </span>
              </div>
            )}
          </div>

          {/* Order Type Selector */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
            <h3 className="font-serif font-bold text-sm text-stone-900">Metode Penerimaan</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setOrderType('delivery')}
                className={`py-3 px-2 rounded-2xl border text-center transition-all ${
                  orderType === 'delivery'
                    ? 'bg-brand-50 border-brand-500 text-brand-800 font-bold shadow-sm'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <i className="fa-solid fa-motorcycle text-base block mb-1"></i>
                <span className="text-xs">Diantar Kurir</span>
              </button>

              <button
                type="button"
                onClick={() => setOrderType('pickup')}
                className={`py-3 px-2 rounded-2xl border text-center transition-all ${
                  orderType === 'pickup'
                    ? 'bg-brand-50 border-brand-500 text-brand-800 font-bold shadow-sm'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <i className="fa-solid fa-person-walking text-base block mb-1"></i>
                <span className="text-xs">Ambil Sendiri</span>
              </button>

              <button
                type="button"
                onClick={() => setOrderType('scheduled')}
                className={`py-3 px-2 rounded-2xl border text-center transition-all ${
                  orderType === 'scheduled'
                    ? 'bg-brand-50 border-brand-500 text-brand-800 font-bold shadow-sm'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <i className="fa-solid fa-clock text-base block mb-1"></i>
                <span className="text-xs">Jadwalkan</span>
              </button>
            </div>

            {orderType === 'scheduled' && (
              <div className="pt-2 flex items-center gap-2">
                <label className="text-xs text-stone-600 font-medium">Jam Pengantaran:</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-xl font-bold"
                />
              </div>
            )}
          </div>

          {/* Customer Information (Strict Phone Only, No Password) */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-sm text-stone-900">Informasi Pemesan</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Pemesan *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-4 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    Nomor WhatsApp / HP *
                  </label>
                  <span className="text-[10px] text-stone-400 font-mono">Format: +628...</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-stone-400">
                    <i className="fa-brands fa-whatsapp text-emerald-600 mr-1"></i>
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={handlePhoneBlur}
                    placeholder="Contoh: 081234567890 atau +6281234567890"
                    className={`w-full pl-9 pr-4 py-2.5 text-xs bg-stone-50 border rounded-xl font-mono focus:outline-none focus:bg-white transition-all ${
                      phoneError
                        ? 'border-red-500 text-red-700'
                        : 'border-stone-300 focus:border-brand-500 text-stone-900'
                    }`}
                  />
                </div>
                {phoneError && (
                  <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                    <i className="fa-solid fa-circle-exclamation text-[10px]"></i>
                    {phoneError}
                  </p>
                )}
              </div>

              {/* Delivery Address (only for delivery/scheduled) */}
              {(orderType === 'delivery' || orderType === 'scheduled') && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Alamat Pengantaran Lengkap *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Nama jalan, nomor rumah/gedung, patokan di Solo..."
                      className="w-full px-4 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Catatan Patokan Driver (Opsional)
                    </label>
                    <input
                      type="text"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="mis. Pagar hitam samping masjid, titip sekuriti"
                      className="w-full px-4 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment Method Selector (Strictly QRIS & E-Money only, VA & COD completely hidden) */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-sm text-stone-900">Metode Pembayaran Instan</h3>
              <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                Midtrans Gateway
              </span>
            </div>

            <div className="space-y-2">
              {/* QRIS */}
              <label
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'qris'
                    ? 'bg-amber-50/70 border-brand-500 shadow-sm'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="qris"
                    checked={paymentMethod === 'qris'}
                    onChange={() => setPaymentMethod('qris')}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center font-extrabold text-xs text-stone-900 shadow-sm">
                    <i className="fa-solid fa-qrcode text-lg text-stone-800"></i>
                  </div>
                  <div>
                    <span className="font-bold text-xs text-stone-900 block">QRIS (BCA, Mandiri, BRI, BNI, GoPay, Dana)</span>
                    <span className="text-[10px] text-stone-500">Scan barcode instan dari semua m-banking & e-wallet</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Rekomendasi
                </span>
              </label>

              {/* GoPay */}
              <label
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'gopay'
                    ? 'bg-amber-50/70 border-brand-500 shadow-sm'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="gopay"
                    checked={paymentMethod === 'gopay'}
                    onChange={() => setPaymentMethod('gopay')}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-extrabold text-xs shadow-sm">
                    <i className="fa-solid fa-wallet"></i>
                  </div>
                  <div>
                    <span className="font-bold text-xs text-stone-900 block">GoPay E-Money</span>
                    <span className="text-[10px] text-stone-500">Bayar otomatis via aplikasi GoPay atau Gojek</span>
                  </div>
                </div>
              </label>

              {/* ShopeePay */}
              <label
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'shopeepay'
                    ? 'bg-amber-50/70 border-brand-500 shadow-sm'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="shopeepay"
                    checked={paymentMethod === 'shopeepay'}
                    onChange={() => setPaymentMethod('shopeepay')}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-extrabold text-xs shadow-sm">
                    <i className="fa-solid fa-bag-shopping"></i>
                  </div>
                  <div>
                    <span className="font-bold text-xs text-stone-900 block">ShopeePay</span>
                    <span className="text-[10px] text-stone-500">Bayar cepat dengan saldo ShopeePay</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Error display */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-bold flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation text-red-500"></i>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Order Summary & Submit Button */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3 text-xs">
            <h4 className="font-serif font-bold text-sm text-stone-900">Rincian Pembayaran Akhir</h4>

            <div className="space-y-1.5 text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal Menu ({items.length} item)</span>
                <span className="font-bold text-stone-900">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  Ongkir ({orderType === 'pickup' ? 'Ambil Sendiri' : `${activeDistanceInfo.distanceKm} km`})
                </span>
                <span className="font-bold text-stone-900">
                  {orderType === 'pickup' ? 'Rp 0' : formatRupiah(currentDeliveryFee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Biaya Layanan</span>
                <span className="font-bold text-stone-900">{formatRupiah(serviceFee)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Diskon Promo ({appliedPromo})</span>
                  <span>-{formatRupiah(discount)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-sm font-extrabold text-stone-900 pt-3 border-t border-stone-100">
              <span>Total Tagihan</span>
              <span className="text-brand-700 text-lg font-mono">
                {formatRupiah(orderType === 'pickup' ? dynamicGrandTotal - currentDeliveryFee : dynamicGrandTotal)}
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm tracking-wide"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-base"></i>
                  <span>Memproses Pembayaran...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-lock text-xs"></i>
                  <span>
                    Bayar Sekarang ({formatRupiah(orderType === 'pickup' ? dynamicGrandTotal - currentDeliveryFee : dynamicGrandTotal)})
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
