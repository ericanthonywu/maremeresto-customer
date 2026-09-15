import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useBranch } from '../context/BranchContext'
import { useLocation } from '../context/LocationContext'
import { customerApi, errorMessage, formatRupiah } from '../api/client'
import { CartItemCard } from '../components/CartItemCard'
import { LocationModal } from '../components/LocationModal'
import { useBranchStock } from '../hooks/useBranchStock'

export const CartPage: React.FC = () => {
  const { items, subtotal, discount, setDiscount, appliedPromo, setAppliedPromo, clearPromo, removeFromCart } = useCart()
  const { selectedBranch, quoteFor, refreshQuotes, quotesLoading } = useBranch()
  const { location } = useLocation()
  const navigate = useNavigate()

  const { unavailableItems, stockMap, isAllAvailable } = useBranchStock(items, selectedBranch)

  const [promoInput, setPromoInput] = useState(appliedPromo)
  const [promoMessage, setPromoMessage] = useState<string | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [isValidatingPromo, setIsValidatingPromo] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)

  const quote = selectedBranch ? quoteFor(selectedBranch.id) : null
  const deliveryFee = quote?.delivery_fee ?? 0
  const serviceFee = quote?.service_fee ?? 0
  const grandTotal = Math.max(0, subtotal + deliveryFee + serviceFee - discount)

  // Re-price whenever the basket total changes, so crossing the free-delivery
  // threshold is reflected immediately.
  useEffect(() => {
    if (location && subtotal > 0) void refreshQuotes(subtotal)
  }, [location, subtotal, refreshQuotes])

  const handleApplyPromo = async (codeToUse?: string) => {
    const code = (codeToUse ?? promoInput).trim().toUpperCase()
    if (!code) return

    setIsValidatingPromo(true)
    setPromoError(null)
    setPromoMessage(null)

    try {
      const resp = await customerApi.validatePromo(code, subtotal, deliveryFee)
      setDiscount(resp.discount_amount)
      setAppliedPromo(resp.code)
      setPromoInput(resp.code)
      setPromoMessage(resp.message)
    } catch (err) {
      setPromoError(errorMessage(err, 'Kode promo tidak dapat digunakan.'))
    } finally {
      setIsValidatingPromo(false)
    }
  }

  const handleRemovePromo = () => {
    clearPromo()
    setPromoInput('')
    setPromoMessage(null)
    setPromoError(null)
  }

  const handleRemoveUnavailable = () => {
    const indicesToRemove = items
      .map((item, idx) => (stockMap[item.id]?.available === false ? idx : -1))
      .filter((idx) => idx !== -1)
      .reverse()

    for (const idx of indicesToRemove) {
      removeFromCart(idx)
    }
  }

  const belowMinimum = false

  return (
    <div className="min-h-screen bg-brand-50/40 pb-24 lg:pb-16 pt-6 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/menu"
              aria-label="Kembali ke menu"
              className="w-10 h-10 rounded-2xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 flex items-center justify-center shadow-sm shrink-0"
            >
              <i className="fa-solid fa-arrow-left text-sm" aria-hidden="true"></i>
            </Link>
            <div className="min-w-0">
              <h1 className="font-serif text-2xl font-bold text-stone-900">Keranjang Pesanan 🛒</h1>
              {selectedBranch && (
                <p className="text-xs text-stone-500 truncate">
                  Cabang Pilihan: <span className="font-bold text-stone-800">{selectedBranch.name}</span>
                </p>
              )}
            </div>
          </div>

          <Link to="/branches" className="text-xs text-brand-600 hover:underline font-bold shrink-0">
            Ganti Cabang
          </Link>
        </div>

        {/* Stock warning banner if any item in cart is unavailable at selected branch */}
        {unavailableItems.length > 0 && selectedBranch && (
          <div className="p-4 bg-red-50 border-2 border-red-200 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-red-900 text-xs shadow-sm animate-fade-in">
            <div className="flex items-start gap-3">
              <i className="fa-solid fa-triangle-exclamation text-red-600 mt-0.5 text-base shrink-0" aria-hidden="true"></i>
              <div>
                <span className="font-bold block text-sm">
                  {unavailableItems.length} menu stoknya habis di {selectedBranch.name}
                </span>
                <span className="text-stone-600 block text-[11px] mt-0.5 leading-relaxed">
                  {unavailableItems.map((u) => u.cartItem.name).join(', ')}. Silakan hapus menu tersebut atau pilih outlet lain untuk melanjutkan.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveUnavailable}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold rounded-xl text-xs shrink-0 shadow-sm transition-all whitespace-nowrap"
            >
              Hapus Menu Habis ({unavailableItems.length})
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-sm space-y-4">
            <div
              className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto text-2xl"
              aria-hidden="true"
            >
              <i className="fa-solid fa-cart-shopping"></i>
            </div>
            <h3 className="font-serif font-bold text-lg text-stone-900">Keranjang Masih Kosong 😊</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Yuk lihat-lihat menu hidangan lezat dan minuman segar kami!
            </p>
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold shadow-md transition-all"
            >
              <span>Lihat daftar menu</span>
              <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {items.map((item, index) => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  isUnavailable={stockMap[item.id]?.available === false}
                  unavailableReason={stockMap[item.id]?.reason}
                />
              ))}
            </div>

            <div className="space-y-4">
              {/* Promo. The quick-pick buttons were hardcoded promo codes; the
                  customer now types a code, which the server validates. */}
              <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-xs">
                  <i className="fa-solid fa-ticket text-brand-600" aria-hidden="true"></i>
                  <span>Voucher Diskon / Promo 🎟️</span>
                </div>

                <div className="flex gap-2">
                  <label htmlFor="promo-code" className="sr-only">
                    Kode promo
                  </label>
                  <input
                    id="promo-code"
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void handleApplyPromo()
                      }
                    }}
                    disabled={Boolean(appliedPromo)}
                    maxLength={50}
                    placeholder="Masukkan kode"
                    className="flex-1 min-w-0 px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl uppercase font-bold text-stone-900 focus:outline-none focus:border-brand-500 disabled:opacity-60"
                  />
                  {appliedPromo ? (
                    <button
                      onClick={handleRemovePromo}
                      className="px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold rounded-xl shrink-0"
                    >
                      Hapus
                    </button>
                  ) : (
                    <button
                      onClick={() => void handleApplyPromo()}
                      disabled={isValidatingPromo || !promoInput.trim()}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm shrink-0"
                    >
                      {isValidatingPromo ? '...' : 'Pakai'}
                    </button>
                  )}
                </div>

                {promoMessage && <p className="text-xs text-emerald-600 font-semibold">{promoMessage}</p>}
                {promoError && <p className="text-xs text-red-600 font-semibold">{promoError}</p>}
              </div>

              {/* Price breakdown */}
              <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3 text-xs">
                <h4 className="font-serif font-bold text-sm text-stone-900 pb-2 border-b border-stone-100">
                  Rincian biaya
                </h4>

                <div className="flex justify-between text-stone-600">
                  <span>Subtotal ({items.length} item)</span>
                  <span className="font-bold text-stone-900">{formatRupiah(subtotal)}</span>
                </div>

                {location && quote ? (
                  <>
                    <div className="flex justify-between text-stone-600">
                      <span>Biaya Pengiriman ({quote.distance_km} km)</span>
                      <span className="font-bold text-stone-900">
                        {quotesLoading ? '…' : deliveryFee === 0 ? 'Gratis Kirim' : formatRupiah(deliveryFee)}
                      </span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Biaya Layanan Aplikasi</span>
                      <span className="font-bold text-stone-900">{formatRupiah(serviceFee)}</span>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setLocationOpen(true)}
                    className="w-full text-left p-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 hover:bg-stone-100 transition-colors flex items-center gap-2"
                  >
                    <i className="fa-solid fa-location-crosshairs text-brand-600 shrink-0" aria-hidden="true"></i>
                    <span className="text-[11px] text-stone-600 font-semibold">
                      Pilih alamat rumah untuk melihat biaya pengiriman
                    </span>
                  </button>
                )}

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Diskon ({appliedPromo})</span>
                    <span>-{formatRupiah(discount)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-stone-200 flex justify-between items-center text-sm font-extrabold text-stone-900">
                  <span>{location && quote ? 'Total' : 'Total sementara'}</span>
                  <span className="text-brand-700 text-base">{formatRupiah(grandTotal)}</span>
                </div>

                {selectedBranch && !selectedBranch.is_open_now && (
                  <div className="p-3 mt-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
                    <i className="fa-solid fa-store-slash mt-0.5 shrink-0 text-sm" aria-hidden="true"></i>
                    <div>
                      <p className="font-bold">{selectedBranch.name} sedang tutup saat ini.</p>
                      <p className="font-normal text-[11px] text-red-600 mt-0.5">
                        Silakan ganti cabang yang sedang buka di menu atas untuk memesan.
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => navigate('/checkout')}
                  disabled={belowMinimum || !isAllAvailable || Boolean(selectedBranch && !selectedBranch.is_open_now)}
                  className={`w-full py-3.5 mt-3 font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-xs ${
                    selectedBranch && !selectedBranch.is_open_now
                      ? 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none'
                      : 'bg-brand-600 hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white'
                  }`}
                >
                  <span>
                    {selectedBranch && !selectedBranch.is_open_now
                      ? 'Cabang Sedang Tutup 😴'
                      : !isAllAvailable
                        ? 'Ada menu yang stoknya habis ⚠️'
                        : 'Lanjut Bayar Pesanan ➔'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <LocationModal isOpen={locationOpen} onClose={() => setLocationOpen(false)} />
    </div>
  )
}
