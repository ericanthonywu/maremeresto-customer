import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useBranch } from '../context/BranchContext'

export const StickyCartSidebar: React.FC = () => {
  const { items, changeQuantity, subtotal, deliveryFee, grandTotal, totalCount } = useCart()
  const { selectedBranch } = useBranch()
  const navigate = useNavigate()

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)

  return (
    <aside className="hidden lg:block w-80 xl:w-96 shrink-0">
      <div className="sticky top-28 bg-white rounded-3xl p-6 border border-stone-200 shadow-lg space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-lg text-stone-900">Ringkasan Pesanan</h3>
            <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold flex items-center justify-center">
              {totalCount}
            </span>
          </div>
          <Link to="/branches" className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1">
            <span>{selectedBranch?.name.replace('Cafe Olga ', '')}</span>
            <i className="fa-solid fa-pencil text-[10px]"></i>
          </Link>
        </div>

        {/* Cart Item List */}
        {items.length === 0 ? (
          <div className="py-8 text-center text-stone-400 space-y-2">
            <i className="fa-solid fa-cart-shopping text-3xl opacity-30"></i>
            <p className="text-xs">Keranjang belanja kosong. Pilih menu lezat di sebelah kiri!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-none pr-1">
            {items.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg ${item.icon_bg_class} flex items-center justify-center shrink-0 text-brand-700 text-sm`}>
                    <i className={`fa-solid ${item.icon}`}></i>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-stone-900 truncate">{item.name}</p>
                    <p className="text-stone-400 text-[10px]">{formatRupiah(item.price)}</p>
                  </div>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center gap-2 bg-stone-50 rounded-xl p-1 border border-stone-200">
                  <button
                    onClick={() => changeQuantity(index, -1)}
                    className="w-5 h-5 rounded-lg bg-white text-stone-700 hover:bg-stone-200 flex items-center justify-center font-bold text-[10px] shadow-sm"
                  >
                    -
                  </button>
                  <span className="font-bold text-stone-900 w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => changeQuantity(index, 1)}
                    className="w-5 h-5 rounded-lg bg-white text-stone-700 hover:bg-stone-200 flex items-center justify-center font-bold text-[10px] shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Price Breakdown */}
        {items.length > 0 && (
          <div className="pt-3 border-t border-stone-100 space-y-2 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal Menu</span>
              <span className="font-bold text-stone-900">{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Ongkos Kirim (~25 mnt)</span>
              <span className="font-bold text-stone-900">{formatRupiah(deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-stone-900 font-extrabold text-sm pt-2 border-t border-stone-200">
              <span>Total Pembayaran</span>
              <span className="text-brand-700 text-base">{formatRupiah(grandTotal)}</span>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full py-3.5 mt-2 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-xs tracking-wide"
            >
              <span>Lanjut ke Pembayaran</span>
              <i className="fa-solid fa-arrow-right text-xs"></i>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
