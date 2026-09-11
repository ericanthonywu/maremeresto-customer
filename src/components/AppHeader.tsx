import React, { useEffect, useState } from 'react'
import { Link, useLocation as useRouterLocation } from 'react-router-dom'
import { useBranch } from '../context/BranchContext'
import { useCart } from '../context/CartContext'
import { customerApi, isLoggedIn } from '../api/client'
import type { Order } from '../types'

/** Statuses that mean an order is still worth surfacing in the header. */
const ACTIVE_STATUSES: Array<Order['status']> = [
  'pending', 'accepted', 'preparing', 'ready', 'on_the_way',
]

export const AppHeader: React.FC = () => {
  const { selectedBranch } = useBranch()
  const { totalCount } = useCart()
  const routerLocation = useRouterLocation()

  // The "active order" pill is only rendered when the customer really has one.
  // It used to be hardcoded to "#0042" and shown to every visitor.
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)

  useEffect(() => {
    if (!isLoggedIn()) {
      setActiveOrder(null)
      return
    }

    let cancelled = false
    customerApi
      .getMyOrders(5)
      .then(({ orders }) => {
        if (cancelled) return
        setActiveOrder(orders.find((o) => ACTIVE_STATUSES.includes(o.status)) ?? null)
      })
      .catch(() => {
        if (!cancelled) setActiveOrder(null)
      })

    return () => {
      cancelled = true
    }
    // Re-check on navigation so a newly placed order appears without a reload.
  }, [routerLocation.pathname])

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div
              className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center text-amber-200 shadow-md group-hover:bg-brand-700 transition-colors"
              aria-hidden="true"
            >
              <i className="fa-solid fa-mug-hot text-xl"></i>
            </div>
            <div>
              <span className="font-serif font-bold text-lg text-stone-900 leading-none block">Cafe Olga</span>
              <span className="text-[11px] text-brand-600 font-medium tracking-wide">Online Ordering</span>
            </div>
          </Link>

          {selectedBranch && (
            <Link
              to="/branches"
              title="Ganti outlet"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-all border border-stone-200 ml-2 min-w-0"
            >
              <i className="fa-solid fa-store text-brand-600 text-xs shrink-0" aria-hidden="true"></i>
              <span className="truncate max-w-[10rem]">{selectedBranch.name}</span>
              <i className="fa-solid fa-chevron-down text-[10px] text-stone-400 shrink-0" aria-hidden="true"></i>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {activeOrder && (
            <Link
              to={`/tracking/${activeOrder.id}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold shadow-sm transition-all"
            >
              <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="hidden sm:inline">Pesanan aktif</span>
              <span className="font-mono text-brand-700">
                {activeOrder.order_number.split('-').pop()}
              </span>
            </Link>
          )}

          <Link
            to="/cart"
            aria-label={`Keranjang, ${totalCount} item`}
            className={`relative p-2.5 rounded-xl border transition-all ${
              routerLocation.pathname === '/cart'
                ? 'bg-brand-50 border-brand-300 text-brand-700'
                : 'bg-stone-100 hover:bg-brand-50 border-transparent text-stone-700 hover:text-brand-600'
            }`}
          >
            <i className="fa-solid fa-cart-shopping text-base" aria-hidden="true"></i>
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-5 h-5 px-1 text-[11px] font-extrabold text-white bg-brand-600 rounded-full shadow">
                {totalCount > 99 ? '99+' : totalCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
