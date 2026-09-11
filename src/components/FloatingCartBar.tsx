import React from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatRupiah } from '../api/client'

export const FloatingCartBar: React.FC = () => {
  const { totalCount, subtotal } = useCart()

  if (totalCount === 0) return null

  return (
    <div className="lg:hidden fixed bottom-16 inset-x-0 px-4 z-30 max-w-md mx-auto pointer-events-none">
      <Link
        to="/cart"
        className="pointer-events-auto w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/20 flex items-center justify-between transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <i className="fa-solid fa-bag-shopping text-xl"></i>
            <span className="absolute -top-1.5 -right-2 bg-white text-brand-700 font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow">
              {totalCount}
            </span>
          </div>
          <div className="text-left">
            <p className="text-[11px] text-amber-200 leading-tight">
              {totalCount} menu · subtotal
            </p>
            <p className="font-extrabold text-sm">{formatRupiah(subtotal)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
          <span>Lihat keranjang</span>
          <i className="fa-solid fa-chevron-right text-[10px]"></i>
        </div>
      </Link>
    </div>
  )
}
