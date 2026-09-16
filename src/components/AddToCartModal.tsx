import React, { useEffect, useState, useRef } from 'react'
import type { MenuItem } from '../types'
import { formatRupiah } from '../api/client'

interface AddToCartModalProps {
  item: MenuItem | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (item: MenuItem, notes: string, quantity: number) => void
}

export const AddToCartModal: React.FC<AddToCartModalProps> = ({
  item,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)

  // Reset state when opening a new item
  useEffect(() => {
    if (isOpen && item) {
      setQuantity(1)
      setNotes('')
    }
  }, [isOpen, item])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !item) return null

  const isDrink =
    item.category?.slug === 'minuman' ||
    item.name.toLowerCase().includes('es ') ||
    item.name.toLowerCase().includes('kopi') ||
    item.name.toLowerCase().includes('teh') ||
    item.name.toLowerCase().includes('wedang') ||
    (item.icon && (item.icon.includes('glass') || item.icon.includes('mug')))

  const handleIncrease = () => {
    setQuantity((q) => Math.min(99, q + 1))
  }

  const handleDecrease = () => {
    setQuantity((q) => Math.max(1, q - 1))
  }

  const handleConfirm = () => {
    onConfirm(item, notes.trim(), quantity)
  }

  const subtotal = item.price * quantity

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-cart-title"
        className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="w-12 h-1 bg-stone-300 rounded-full mx-auto sm:hidden" aria-hidden="true" />

        {/* Header with Title & Close Button */}
        <div className="flex items-start justify-between gap-3 pb-2 border-b border-stone-100">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-600">
              Konfirmasi Pesanan
            </span>
            <h3 id="add-to-cart-title" className="font-serif font-bold text-lg text-stone-900 leading-snug">
              Tambah ke Keranjang
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors shrink-0"
          >
            <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
          </button>
        </div>

        {/* Item Overview Card */}
        <div className="flex items-start gap-3.5 bg-stone-50/80 p-3.5 rounded-2xl border border-stone-200/70">
          <div
            className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl shrink-0 overflow-hidden shadow-xs ${
              item.icon_bg_class || 'bg-amber-50'
            }`}
          >
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <i className={`fa-solid ${item.icon || 'fa-bowl-food'} text-brand-700`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-bold text-stone-900 text-sm leading-tight">{item.name}</h4>
              {item.tag && (
                <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md">
                  {item.tag}
                </span>
              )}
            </div>
            <p className="text-stone-500 text-xs line-clamp-2 mt-1 leading-relaxed">
              {item.description || 'Pilihan hidangan lezat dan hangat khas Mareme.'}
            </p>
            <p className="text-brand-700 font-extrabold text-sm mt-1.5">
              {formatRupiah(item.price)}{' '}
              <span className="text-stone-400 text-xs font-normal">/ porsi</span>
            </p>
          </div>
        </div>

        {/* Quantity Stepper */}
        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 flex items-center justify-between">
          <div>
            <label htmlFor="item-quantity-stepper" className="block text-xs font-bold text-stone-800">
              Jumlah Porsi
            </label>
            <span className="text-[11px] text-stone-400">Tentukan banyak pesanan</span>
          </div>

          <div
            id="item-quantity-stepper"
            className="flex items-center gap-2 bg-stone-100/80 rounded-xl p-1 border border-stone-200"
          >
            <button
              type="button"
              onClick={handleDecrease}
              disabled={quantity <= 1}
              aria-label="Kurangi porsi"
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-xs transition-all active:scale-95 ${
                quantity <= 1
                  ? 'bg-stone-100 text-stone-300 cursor-not-allowed'
                  : 'bg-white text-stone-800 hover:bg-stone-200'
              }`}
            >
              <i className="fa-solid fa-minus text-xs" />
            </button>
            <span className="font-extrabold text-stone-900 w-8 text-center text-sm font-mono">
              {quantity}
            </span>
            <button
              type="button"
              onClick={handleIncrease}
              disabled={quantity >= 99}
              aria-label="Tambah porsi"
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-xs transition-all active:scale-95 ${
                quantity >= 99
                  ? 'bg-stone-100 text-stone-300 cursor-not-allowed'
                  : 'bg-white text-stone-800 hover:bg-stone-200'
              }`}
            >
              <i className="fa-solid fa-plus text-xs" />
            </button>
          </div>
        </div>

        {/* Notes Textarea & Autocomplete Chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="item-notes" className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <i className="fa-solid fa-note-sticky text-brand-600" />
              <span>Catatan Tambahan untuk Dapur (Opsional)</span>
            </label>
            <span className="text-[10px] text-stone-400 font-mono">
              {notes.length}/200
            </span>
          </div>

          {/* Notes Input Field */}
          <textarea
            id="item-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 200))}
            rows={3}
            placeholder={
              isDrink
                ? 'Tulis catatan untuk minuman (mis. es dipisah, kurang manis, dsb)...'
                : 'Tulis catatan untuk pesanan (mis. kuah dipisah, tidak pedas, banyakin bawang goreng, dsb)...'
            }
            className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-2xl text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500/20 resize-none transition-all leading-relaxed"
          />
        </div>

        {/* Footer: Subtotal & Action Buttons */}
        <div className="pt-2 border-t border-stone-100 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-stone-500 font-medium">Subtotal Porsi Ini:</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] text-stone-400">
                ({quantity} x {formatRupiah(item.price)})
              </span>
              <span className="font-serif font-extrabold text-lg text-brand-700">
                {formatRupiah(subtotal)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-2xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-bold text-xs transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-[2] py-3 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-cart-plus text-sm" />
              <span>Tambah ke Keranjang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
