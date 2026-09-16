import React from 'react'
import type { MenuItem } from '../types'
import { useCart } from '../context/CartContext'
import { formatRupiah } from '../api/client'

interface MenuItemCardProps {
  item: MenuItem
  /** A closed outlet cannot take orders, so adding to the basket is blocked. */
  outletOpen?: boolean
  onOpenConfirm?: (item: MenuItem) => void
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  outletOpen = true,
  onOpenConfirm,
}) => {
  const { addToCart } = useCart()

  const canOrder = item.is_available && outletOpen

  const handleAction = () => {
    if (!canOrder) return
    if (onOpenConfirm) {
      onOpenConfirm(item)
    } else {
      addToCart(item)
    }
  }

  return (
    <div
      onClick={canOrder ? handleAction : undefined}
      className={`bg-white rounded-2xl p-4 border border-stone-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
        canOrder ? 'cursor-pointer hover:border-brand-300' : 'opacity-80'
      }`}
    >
      <div className="flex items-start gap-3.5 mb-3">
        {/* Icon / Image thumbnail */}
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
            item.icon_bg_class || 'bg-amber-50'
          }`}
        >
          {item.image_url ? (
            <img src={item.image_url} alt="" loading="lazy" className="w-full h-full object-cover rounded-xl" />
          ) : (
            <i className={`fa-solid ${item.icon || 'fa-mug-hot'} text-brand-700`}></i>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-bold text-stone-900 text-sm truncate">{item.name}</h4>
            {item.tag && (
              <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md">
                {item.tag}
              </span>
            )}
          </div>
          <p className="text-stone-500 text-xs line-clamp-2 mt-1 leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>

      {/* Price & Add button */}
      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
        <span className="font-extrabold text-sm text-brand-700">{formatRupiah(item.price)}</span>
        {canOrder ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleAction()
            }}
            aria-label={`Tambah ${item.name} ke keranjang`}
            className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
          >
            <i className="fa-solid fa-plus text-[10px]" aria-hidden="true"></i>
            <span>Tambah</span>
          </button>
        ) : (
          <span className="px-2.5 py-1 bg-stone-100 text-stone-400 rounded-xl text-xs font-semibold">
            {item.is_available ? 'Outlet tutup' : 'Habis'}
          </span>
        )}
      </div>
    </div>
  )
}
