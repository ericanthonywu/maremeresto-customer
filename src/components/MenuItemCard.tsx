import React from 'react'
import type { MenuItem } from '../types'
import { useCart } from '../context/CartContext'

interface MenuItemCardProps {
  item: MenuItem
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item }) => {
  const { addToCart } = useCart()

  const formattedPrice = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(item.price)

  return (
    <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div className="flex items-start gap-3.5 mb-3">
        {/* Icon / Image thumbnail */}
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
            item.icon_bg_class || 'bg-amber-50'
          }`}
        >
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-xl" />
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
        <span className="font-extrabold text-sm text-brand-700">{formattedPrice}</span>
        {item.is_available ? (
          <button
            onClick={() => addToCart(item)}
            className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
          >
            <i className="fa-solid fa-plus text-[10px]"></i>
            <span>Tambah</span>
          </button>
        ) : (
          <span className="px-2.5 py-1 bg-stone-100 text-stone-400 rounded-xl text-xs font-semibold">
            Habis
          </span>
        )}
      </div>
    </div>
  )
}
