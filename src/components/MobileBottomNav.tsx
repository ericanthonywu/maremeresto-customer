import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export const MobileBottomNav: React.FC = () => {
  const location = useLocation()
  const { totalCount } = useCart()

  const tabs: Array<{ label: string; path: string; icon: string; badge?: number }> = [
    {
      label: 'Cabang',
      path: '/branches',
      icon: 'fa-solid fa-store',
    },
    {
      label: 'Menu',
      path: '/menu',
      icon: 'fa-solid fa-mug-hot',
    },
    {
      label: 'Keranjang',
      path: '/cart',
      icon: 'fa-solid fa-cart-shopping',
      badge: totalCount > 0 ? totalCount : undefined,
    },
    {
      label: 'Lacak',
      path: '/tracking',
      icon: 'fa-solid fa-location-crosshairs',
    },
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-stone-200 z-40">
      <div className="grid grid-cols-4 py-2 text-center text-[10px] font-medium max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path || (tab.path === '/menu' && location.pathname === '/')
          return (
            <Link
              key={tab.path}
              to={tab.path}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center py-1 relative transition-colors ${
                isActive ? 'text-brand-600 font-bold' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <div className="relative mb-0.5">
                <i className={`${tab.icon} text-lg`} aria-hidden="true"></i>
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 bg-brand-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
