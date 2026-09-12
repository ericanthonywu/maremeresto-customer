import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useBranch } from '../context/BranchContext'
import { formatRupiah } from '../api/client'

export const StickyCartSidebar: React.FC = () => {
  const { items, changeQuantity, subtotal, totalCount } = useCart()
  const { selectedBranch, quoteFor } = useBranch()
  const navigate = useNavigate()

  // Fees are only shown once the server has priced them for this location.
  const quote = selectedBranch ? quoteFor(selectedBranch.id) : null
  const knownTotal = quote ? subtotal + quote.delivery_fee + quote.service_fee : null

  return (
    <aside className="hidden lg:block w-80 xl:w-96 shrink-0">
      <div className="sticky top-28 bg-white rounded-3xl p-6 border border-stone-200 shadow-lg space-y-5">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-lg text-stone-900">Ringkasan</h3>
            <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold flex items-center justify-center">
              {totalCount}
            </span>
          </div>
          {selectedBranch && (
            <Link
              to="/branches"
              className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 min-w-0"
            >
              <span className="truncate">{selectedBranch.name}</span>
              <i className="fa-solid fa-pencil text-[10px] shrink-0" aria-hidden="true"></i>
            </Link>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-8 text-center text-stone-400 space-y-2">
            <i className="fa-solid fa-cart-shopping text-3xl opacity-30" aria-hidden="true"></i>
            <p className="text-xs">Keranjang masih kosong. Pilih menu di sebelah kiri.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-none pr-1">
            {items.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg ${item.icon_bg_class} flex items-center justify-center shrink-0 text-brand-700 text-sm`}
                    aria-hidden="true"
                  >
                    <i className={`fa-solid ${item.icon}`}></i>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-stone-900 truncate">{item.name}</p>
                    <p className="text-stone-400 text-[10px]">{formatRupiah(item.price)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-stone-50 rounded-xl p-1 border border-stone-200 shrink-0">
                  <button
                    onClick={() => changeQuantity(index, -1)}
                    aria-label={`Kurangi ${item.name}`}
                    className="w-5 h-5 rounded-lg bg-white text-stone-700 hover:bg-stone-200 flex items-center justify-center font-bold text-[10px] shadow-sm"
                  >
                    −
                  </button>
                  <span className="font-bold text-stone-900 w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => changeQuantity(index, 1)}
                    aria-label={`Tambah ${item.name}`}
                    className="w-5 h-5 rounded-lg bg-white text-stone-700 hover:bg-stone-200 flex items-center justify-center font-bold text-[10px] shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="pt-3 border-t border-stone-100 space-y-2 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal menu</span>
              <span className="font-bold text-stone-900">{formatRupiah(subtotal)}</span>
            </div>

            {quote ? (
              <>
                <div className="flex justify-between text-stone-600">
                  <span>Ongkir ({quote.distance_km} km)</span>
                  <span className="font-bold text-stone-900">
                    {quote.delivery_fee === 0 ? 'Gratis' : formatRupiah(quote.delivery_fee)}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Biaya layanan</span>
                  <span className="font-bold text-stone-900">{formatRupiah(quote.service_fee)}</span>
                </div>
                <div className="flex justify-between text-stone-900 font-extrabold text-sm pt-2 border-t border-stone-200">
                  <span>Perkiraan total</span>
                  <span className="text-brand-700 text-base">{formatRupiah(knownTotal ?? subtotal)}</span>
                </div>
              </>
            ) : (
              <p className="text-[11px] text-stone-400 pt-1">
                Ongkos kirim dihitung setelah Anda menentukan alamat di halaman kasir.
              </p>
            )}

            <button
              onClick={() => navigate('/cart')}
              className="w-full py-3.5 mt-2 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-xs tracking-wide"
            >
              <span>Lihat keranjang</span>
              <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
