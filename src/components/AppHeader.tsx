import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useBranch } from '../context/BranchContext'
import { useCart } from '../context/CartContext'

export const AppHeader: React.FC = () => {
  const { selectedBranch } = useBranch()
  const { totalCount } = useCart()
  const location = useLocation()

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Left: Logo + Brand */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center text-amber-200 shadow-md group-hover:bg-brand-700 transition-colors">
              <i className="fa-solid fa-mug-hot text-xl"></i>
            </div>
            <div>
              <span className="font-serif font-bold text-lg text-stone-900 leading-none block">
                Cafe Olga
              </span>
              <span className="text-[11px] text-brand-600 font-medium tracking-wide">
                Online Ordering
              </span>
            </div>
          </Link>

          {/* Current Branch Pill */}
          {selectedBranch && (
            <Link
              to="/branches"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-all border border-stone-200 ml-2"
              title="Ganti Cabang"
            >
              <i className="fa-solid fa-store text-brand-600 text-xs"></i>
              <span>{selectedBranch.name}</span>
              <i className="fa-solid fa-chevron-down text-[10px] text-stone-400"></i>
            </Link>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Active Order Pill */}
          <Link
            to="/tracking"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold shadow-sm transition-all"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span>Pesanan Aktif</span>
            <span className="font-mono text-brand-700">#0042</span>
          </Link>

          {/* Cart Icon Link */}
          <Link
            to="/cart"
            className={`relative p-2.5 rounded-xl border transition-all ${
              location.pathname === '/cart'
                ? 'bg-brand-50 border-brand-300 text-brand-700'
                : 'bg-stone-100 hover:bg-brand-50 border-transparent text-stone-700 hover:text-brand-600'
            }`}
          >
            <i className="fa-solid fa-cart-shopping text-base"></i>
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-[11px] font-extrabold text-white bg-brand-600 rounded-full shadow">
                {totalCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
