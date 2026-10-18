import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { customerApi, formatRupiah } from '../api/client'
import { useBranch } from '../context/BranchContext'
import type { MenuItem } from '../types'

export const BestSellerPreview: React.FC = () => {
  const navigate = useNavigate()
  const { branches, setSelectedBranch } = useBranch()

  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    customerApi
      .getBestSellers()
      .then((data) => {
        if (!cancelled) {
          setItems(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Gagal memuat rekomendasi menu best seller.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Filter items by branch if tab is selected
  const displayedItems = useMemo(() => {
    if (selectedBranchFilter === 'all') return items
    return items.filter(
      (it) => it.branch_slug === selectedBranchFilter || it.branch_id === selectedBranchFilter
    )
  }, [items, selectedBranchFilter])

  const handleOrderMenuItem = (item: MenuItem) => {
    // Find the corresponding branch object
    const targetBranch = branches.find(
      (b) => b.id === item.branch_id || b.slug === item.branch_slug
    )
    if (targetBranch) {
      setSelectedBranch(targetBranch)
      navigate(`/menu?branch=${targetBranch.slug}`)
    } else if (item.branch_slug) {
      navigate(`/menu?branch=${item.branch_slug}`)
    } else {
      navigate('/menu')
    }
  }

  return (
    <section className="mt-16 bg-white rounded-3xl p-6 sm:p-10 border border-stone-200 shadow-sm space-y-8">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
          <i className="fa-solid fa-star text-amber-500 text-[11px]" aria-hidden="true"></i>
          <span>Pilihan Terfavorit</span>
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
          Menu Best Seller 🌟
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
          Pilihan hidangan istimewa paling laris dan dicintai pelanggan setia Mareme Group Solo.
          Pilih menu favorit Anda untuk langsung memesan ke cabang terdekat!
        </p>
      </div>

      {/* Branch Tabs Filter (if multiple branches) */}
      {branches.length > 1 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedBranchFilter('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              selectedBranchFilter === 'all'
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
            }`}
          >
            Semua Cabang
          </button>
          {branches.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelectedBranchFilter(b.slug)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedBranchFilter === b.slug
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
              }`}
            >
              <i className="fa-solid fa-store text-[10px]" aria-hidden="true"></i>
              <span>{b.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="bg-stone-50/70 border border-stone-100 rounded-3xl p-5 space-y-4 animate-pulse"
            >
              <div className="w-full h-40 bg-stone-200 rounded-2xl"></div>
              <div className="space-y-2">
                <div className="h-4 bg-stone-200 rounded w-2/3"></div>
                <div className="h-3 bg-stone-200 rounded w-full"></div>
                <div className="h-3 bg-stone-200 rounded w-4/5"></div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="h-4 bg-stone-200 rounded w-20"></div>
                <div className="h-8 bg-stone-200 rounded-xl w-24"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8 space-y-2">
          <i className="fa-solid fa-circle-exclamation text-amber-500 text-2xl"></i>
          <p className="text-xs text-stone-500">{error}</p>
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="text-center py-10 bg-stone-50/50 rounded-2xl border border-stone-100 space-y-3">
          <i className="fa-solid fa-utensils text-stone-300 text-3xl"></i>
          <h3 className="font-bold text-stone-800 text-sm">Belum ada menu Best Seller</h3>
          <p className="text-xs text-stone-500">
            Menu best seller yang dikonfigurasi admin akan tampil di sini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group hover:border-brand-300"
            >
              <div>
                {/* Media banner / icon container */}
                <div
                  className={`w-full h-44 rounded-2xl ${item.icon_bg_class || 'bg-amber-50'} overflow-hidden relative flex items-center justify-center border border-stone-100 mb-4`}
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <i
                        className={`fa-solid ${item.icon || 'fa-bowl-food'} text-5xl text-brand-700/80 group-hover:scale-110 transition-transform duration-300`}
                        aria-hidden="true"
                      ></i>
                    </div>
                  )}

                  {/* Badges on top of image */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                    <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider">
                      <i className="fa-solid fa-star text-[8px]" aria-hidden="true"></i>
                      <span>Best Seller</span>
                    </span>
                    {item.tag && item.tag.toLowerCase() !== 'best' && (
                      <span className="inline-flex items-center bg-stone-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full shadow">
                        {item.tag}
                      </span>
                    )}
                  </div>

                  {item.branch_name && (
                    <div className="absolute bottom-3 left-3 z-10">
                      <span className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm text-stone-800 text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-sm border border-stone-200/50">
                        <i className="fa-solid fa-location-dot text-brand-600 text-[9px]" aria-hidden="true"></i>
                        <span>{item.branch_name}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-1.5">
                  {item.category?.name && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md inline-block">
                      {item.category.name}
                    </span>
                  )}
                  <h3 className="font-serif font-bold text-stone-900 text-base group-hover:text-brand-700 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-stone-500 text-xs line-clamp-2 leading-relaxed">
                    {item.description || 'Pilihan lezat khas racikan bumbu spesial Mareme Group.'}
                  </p>
                </div>
              </div>

              {/* Price & Action */}
              <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between gap-3">
                <div>
                  <span className="block text-[10px] text-stone-400 font-medium">Harga</span>
                  <span className="font-extrabold text-sm sm:text-base text-brand-700">
                    {formatRupiah(item.price)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleOrderMenuItem(item)}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 shrink-0"
                >
                  <span>Pesan Menu Ini</span>
                  <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
