import React, { useEffect, useState } from 'react'
import type { MenuItem } from '../types'
import { formatRupiah } from '../api/client'

interface MenuImagePreviewModalProps {
  item: MenuItem | null
  isOpen: boolean
  outletOpen?: boolean
  onClose: () => void
  onOrder?: (item: MenuItem) => void
}

export const MenuImagePreviewModal: React.FC<MenuImagePreviewModalProps> = ({
  item,
  isOpen,
  outletOpen = true,
  onClose,
  onOrder,
}) => {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null)
  const imgError = Boolean(item?.image_url) && failedImageUrl === item?.image_url

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !item) return null

  const canOrder = item.is_available && outletOpen

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-image-preview-title"
        className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image container */}
        <div className="relative bg-stone-950 flex items-center justify-center min-h-[240px] max-h-[60vh]">
          {item.image_url && !imgError ? (
            <img
              src={item.image_url}
              alt={item.name}
              onError={() => setFailedImageUrl(item.image_url ?? null)}
              className="w-full max-h-[60vh] object-contain select-none"
            />
          ) : (
            <div className="py-16 px-6 text-center text-stone-400 space-y-2">
              <i className={`fa-solid ${item.icon || 'fa-bowl-food'} text-5xl text-stone-500`} aria-hidden="true" />
              <p className="text-xs">Foto menu tidak dapat dimuat</p>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup preview gambar"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors backdrop-blur-xs shadow-md"
          >
            <i className="fa-solid fa-xmark text-base" aria-hidden="true" />
          </button>

          {item.tag && (
            <span className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full shadow-md tracking-wider">
              {item.tag}
            </span>
          )}
        </div>

        {/* Item info & action */}
        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {item.category?.name && (
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md mb-1">
                  {item.category.name}
                </span>
              )}
              <h3
                id="menu-image-preview-title"
                className="font-serif font-bold text-lg text-stone-900 leading-snug"
              >
                {item.name}
              </h3>
            </div>
            <span className="font-extrabold text-base text-brand-700 shrink-0">
              {formatRupiah(item.price)}
            </span>
          </div>

          {item.description && (
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              {item.description}
            </p>
          )}

          <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-2xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-bold text-xs transition-colors"
            >
              Tutup
            </button>
            {onOrder && (
              canOrder ? (
                <button
                  type="button"
                  onClick={() => onOrder(item)}
                  className="flex-[2] py-2.5 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-plus text-[11px]" aria-hidden="true" />
                  <span>Tambah ke Keranjang</span>
                </button>
              ) : (
                <span className="flex-[2] py-2.5 px-4 rounded-2xl bg-stone-100 text-stone-400 font-semibold text-xs text-center">
                  {item.is_available ? 'Outlet tutup' : 'Habis'}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
