import React, { useState } from 'react'
import type { CartItem } from '../types'
import { useCart } from '../context/CartContext'
import { formatRupiah } from '../api/client'

interface CartItemCardProps {
  item: CartItem
  index: number
}

export const CartItemCard: React.FC<CartItemCardProps> = ({ item, index }) => {
  const { changeQuantity, removeFromCart, updateNotes } = useCart()
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesText, setNotesText] = useState(item.notes || '')

  const handleSaveNotes = () => {
    updateNotes(index, notesText)
    setIsEditingNotes(false)
  }

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-12 h-12 rounded-xl ${item.icon_bg_class} flex items-center justify-center text-xl text-brand-700 shrink-0`}>
            <i className={`fa-solid ${item.icon}`}></i>
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-stone-900 text-sm truncate">{item.name}</h4>
            <p className="text-xs text-stone-500">{formatRupiah(item.price)} / porsi</p>

            {/* Note badge */}
            {item.notes && !isEditingNotes && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-stone-600 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-200 max-w-fit">
                <i className="fa-solid fa-note-sticky text-brand-600 text-[10px]"></i>
                <span className="italic">{item.notes}</span>
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-stone-400 hover:text-brand-600 ml-1"
                >
                  <i className="fa-solid fa-pen text-[9px]"></i>
                </button>
              </div>
            )}
            {!item.notes && !isEditingNotes && (
              <button
                onClick={() => setIsEditingNotes(true)}
                className="mt-1 text-[11px] text-brand-600 hover:underline flex items-center gap-1"
              >
                <i className="fa-solid fa-plus text-[9px]"></i> Tambah catatan
              </button>
            )}
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={() => removeFromCart(index)}
          className="text-stone-400 hover:text-red-500 p-1 transition-colors"
          title="Hapus menu"
        >
          <i className="fa-solid fa-trash-can text-sm"></i>
        </button>
      </div>

      {/* Edit note input */}
      {isEditingNotes && (
        <div className="pt-2 flex gap-2">
          <input
            type="text"
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="mis. Kurang manis, dipanaskan..."
            maxLength={200}
            className="flex-1 px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-brand-500"
          />
          <button
            onClick={handleSaveNotes}
            className="px-3 py-1.5 bg-brand-600 text-white rounded-xl text-xs font-bold"
          >
            Simpan
          </button>
        </div>
      )}

      {/* Bottom row: Subtotal & Quantity controls */}
      <div className="flex items-center justify-between pt-3 border-t border-stone-100">
        <div>
          <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Subtotal</span>
          <span className="font-extrabold text-sm text-stone-900">
            {formatRupiah(item.price * item.quantity)}
          </span>
        </div>

        {/* Quantity Stepper */}
        <div className="flex items-center gap-2 bg-stone-50 rounded-xl p-1 border border-stone-200">
          <button
            onClick={() => changeQuantity(index, -1)}
            className="w-7 h-7 rounded-lg bg-white text-stone-700 hover:bg-stone-200 flex items-center justify-center font-bold text-xs shadow-sm active:scale-95"
          >
            -
          </button>
          <span className="font-bold text-stone-900 w-6 text-center text-xs">{item.quantity}</span>
          <button
            onClick={() => changeQuantity(index, 1)}
            className="w-7 h-7 rounded-lg bg-white text-stone-700 hover:bg-stone-200 flex items-center justify-center font-bold text-xs shadow-sm active:scale-95"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
