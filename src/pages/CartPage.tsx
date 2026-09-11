import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useBranch } from '../context/BranchContext'
import { customerApi } from '../api/client'
import { CartItemCard } from '../components/CartItemCard'

export const CartPage: React.FC = () => {
  const {
    items,
    subtotal,
    deliveryFee,
    serviceFee,
    discount,
    setDiscount,
    grandTotal,
    appliedPromo,
    setAppliedPromo,
  } = useCart()
  const { selectedBranch } = useBranch()
  const navigate = useNavigate()

  const [promoInput, setPromoInput] = useState(appliedPromo)
  const [promoMessage, setPromoMessage] = useState<string | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [isValidatingPromo, setIsValidatingPromo] = useState(false)

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)

  const handleApplyPromo = async (codeToUse?: string) => {
    const code = (codeToUse || promoInput).trim().toUpperCase()
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
    } catch (err: any) {
      setPromoError(err.response?.data?.error || 'Kode promo tidak valid atau syarat minimal belum terpenuhi.')
    } finally {
      setIsValidatingPromo(false)
    }
  }

  const handleRemovePromo = () => {
    setDiscount(0)
    setAppliedPromo('')
    setPromoInput('')
    setPromoMessage(null)
    setPromoError(null)
  }

  return (
    <div className="min-h-screen bg-[#fbf9f6] pb-24 lg:pb-16 pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Back Link & Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/menu"
              className="w-10 h-10 rounded-2xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 flex items-center justify-center shadow-sm"
            >
              <i className="fa-solid fa-arrow-left text-sm"></i>
            </Link>
            <div>
              <h1 className="font-serif text-2xl font-bold text-stone-900">Keranjang Pesanan</h1>
              <p className="text-xs text-stone-500">
                Outlet: <span className="font-bold text-stone-800">{selectedBranch?.name}</span>
              </p>
            </div>
          </div>

          <Link
            to="/branches"
            className="text-xs text-brand-600 hover:underline font-bold"
          >
            Ganti Outlet
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto text-2xl">
              <i className="fa-solid fa-cart-shopping"></i>
            </div>
            <h3 className="font-serif font-bold text-lg text-stone-900">Keranjang Anda Masih Kosong</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Yuk jelajahi racikan kopi segar dan hidangan istimewa kami di menu!
            </p>
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold shadow-md transition-all"
            >
              <span>Lihat Daftar Menu</span>
              <i className="fa-solid fa-arrow-right text-xs"></i>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Items List */}
            <div className="lg:col-span-2 space-y-3">
              {items.map((item, index) => (
                <CartItemCard key={item.id} item={item} index={index} />
              ))}
            </div>

            {/* Right: Voucher & Summary */}
            <div className="space-y-4">
              {/* Promo Code Card */}
              <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-xs">
                  <i className="fa-solid fa-ticket text-brand-600"></i>
                  <span>Gunakan Voucher Promo</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="Ketik kode promo"
                    className="flex-1 px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl uppercase font-bold text-stone-900 focus:outline-none focus:border-brand-500"
                  />
                  {appliedPromo ? (
                    <button
                      onClick={handleRemovePromo}
                      className="px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold rounded-xl"
                    >
                      Batal
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApplyPromo()}
                      disabled={isValidatingPromo}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm"
                    >
                      {isValidatingPromo ? '...' : 'Pasang'}
                    </button>
                  )}
                </div>

                {/* Quick Promo Pills matching prototype */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleApplyPromo('OLGACOFFEE')}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-brand-800 border border-amber-200 font-bold transition-all"
                  >
                    OLGACOFFEE (-10rb)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPromo('GRATISONGKIR')}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold transition-all"
                  >
                    GRATISONGKIR (Free Ongkir)
                  </button>
                </div>

                {promoMessage && (
                  <p className="text-xs text-emerald-600 font-semibold">{promoMessage}</p>
                )}
                {promoError && (
                  <p className="text-xs text-red-600 font-semibold">{promoError}</p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3 text-xs">
                <h4 className="font-serif font-bold text-sm text-stone-900 pb-2 border-b border-stone-100">
                  Rincian Biaya
                </h4>

                <div className="flex justify-between text-stone-600">
                  <span>Subtotal ({items.length} item)</span>
                  <span className="font-bold text-stone-900">{formatRupiah(subtotal)}</span>
                </div>

                <div className="flex justify-between text-stone-600">
                  <span>Ongkos Kirim</span>
                  <span className="font-bold text-stone-900">{formatRupiah(deliveryFee)}</span>
                </div>

                <div className="flex justify-between text-stone-600">
                  <span>Biaya Layanan & Pengemasan</span>
                  <span className="font-bold text-stone-900">{formatRupiah(serviceFee)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Diskon Promo ({appliedPromo})</span>
                    <span>-{formatRupiah(discount)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-stone-200 flex justify-between items-center text-sm font-extrabold text-stone-900">
                  <span>Total Pembayaran</span>
                  <span className="text-brand-700 text-base">{formatRupiah(grandTotal)}</span>
                </div>

                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full py-3.5 mt-3 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-xs"
                >
                  <span>Lanjut ke Kasir & Pembayaran</span>
                  <i className="fa-solid fa-arrow-right text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
