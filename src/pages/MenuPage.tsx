import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useBranch } from '../context/BranchContext'
import { useCart } from '../context/CartContext'
import { customerApi, errorMessage } from '../api/client'
import type { Category, MenuItem } from '../types'
import { CategoryTabs } from '../components/CategoryTabs'
import { MenuItemCard } from '../components/MenuItemCard'
import { StickyCartSidebar } from '../components/StickyCartSidebar'
import { FloatingCartBar } from '../components/FloatingCartBar'
import { HalalCertificateBadge } from '../components/HalalCertificateBadge'
import { MenuSkeletonGrid } from '../components/Skeleton'
import { SEO } from '../components/SEO'

export const MenuPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const branchParam = searchParams.get('branch')
  const { selectedBranch, selectBranchBySlug, loading: branchesLoading } = useBranch()
  const { toastMessage } = useCart()

  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Honour ?branch= in the URL, e.g. from a shared link.
  useEffect(() => {
    if (branchParam && selectedBranch?.slug !== branchParam) {
      selectBranchBySlug(branchParam)
    }
  }, [branchParam, selectedBranch?.slug, selectBranchBySlug])

  const activeSlug = selectedBranch?.slug ?? null

  useEffect(() => {
    if (!activeSlug) {
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([customerApi.getCategories(), customerApi.getMenuByBranch(activeSlug)])
      .then(([cats, menu]) => {
        if (cancelled) return
        setCategories(cats)
        setMenuItems(menu)
      })
      .catch((err) => {
        if (cancelled) return
        setError(errorMessage(err, 'Gagal memuat menu outlet ini.'))
        setMenuItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeSlug, branchesLoading])

  // Only offer categories that this outlet actually has items in.
  const visibleCategories = useMemo(() => {
    const present = new Set(menuItems.map((i) => i.category?.slug).filter(Boolean))
    return categories.filter((c) => present.has(c.slug))
  }, [categories, menuItems])

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return menuItems.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category?.slug === activeCategory
      if (!matchesCategory) return false
      if (!query) return true
      return (
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        (item.tag ?? '').toLowerCase().includes(query)
      )
    })
  }, [menuItems, activeCategory, searchQuery])

  const isBusy = (loading && Boolean(activeSlug)) || branchesLoading

  const pageTitle = selectedBranch
    ? `Menu Makanan Hangat & Murah — ${selectedBranch.name} Solo | Mareme Group`
    : 'Menu Kuliner Makanan Hangat & Murah Surakarta Solo'

  const pageDescription = selectedBranch
    ? `Pesan online menu makanan hangat murah di ${selectedBranch.name} Surakarta / Solo. Nikmati soto, bakmi, warmindo, & kopi hangat terjangkau.`
    : 'Pilih dan pesan menu kuliner makanan hangat dan murah di Surakarta / Solo dari Mareme Group. Soto hangat, bakmi, warmindo & kopi terjangkau.'

  return (
    <div className="min-h-screen bg-brand-50/40 pb-28 lg:pb-16 transition-colors duration-300">
      <SEO
        title={pageTitle}
        description={pageDescription}
        keywords="menu makanan murah solo, menu makanan hangat surakarta, soto hangat solo, bakmi murah solo, warmindo solo, kopi hangat solo, mareme group menu"
      />

      {toastMessage && (
        <div className="fixed top-16 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
          <div
            role="status"
            className="bg-stone-900 text-white px-5 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 border border-stone-700 animate-fade-in"
          >
            <span className="text-emerald-400" aria-hidden="true">●</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Outlet banner: name, address and opening hours all come from the API. */}
      <section className="bg-white border-b border-stone-200 py-6 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                Menu Makanan Hangat Murah Solo
              </span>
              {selectedBranch && (
                <span
                  className={`text-xs font-bold flex items-center gap-1 ${
                    selectedBranch.is_open_now ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selectedBranch.is_open_now ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                    }`}
                    aria-hidden="true"
                  ></span>
                  {selectedBranch.is_open_now ? 'Buka' : 'Tutup'}
                  {selectedBranch.today_hours && ` (${selectedBranch.today_hours})`}
                </span>
              )}
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 truncate">
              {selectedBranch?.name ?? (branchesLoading ? 'Memuat cabang...' : 'Pilih Cabang')}
            </h1>
            <p className="text-xs text-stone-500 max-w-xl">
              {selectedBranch?.address ? `${selectedBranch.address} — Kuliner hangat & terjangkau di Surakarta` : ''}
            </p>
            {selectedBranch && <HalalCertificateBadge certificateId={selectedBranch.halal_certificate_id} />}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/branches"
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl text-xs transition-colors flex items-center gap-2 border border-stone-200 shadow-sm whitespace-nowrap"
            >
              <i className="fa-solid fa-store text-brand-600" aria-hidden="true"></i>
              <span>Ganti Cabang</span>
            </Link>

            <div className="relative flex-1 sm:flex-none">
              <label htmlFor="menu-search" className="sr-only">
                Cari makanan atau minuman
              </label>
              <i
                className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs"
                aria-hidden="true"
              ></i>
              <input
                id="menu-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari menu soto, bakmi, kopi..."
                className="pl-9 pr-4 py-2 bg-stone-50 border border-stone-300 rounded-2xl text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-brand-500 focus:bg-white w-full sm:w-56 transition-all"
              />
            </div>
          </div>
        </div>

        {selectedBranch && !selectedBranch.is_open_now && (
          <div className="max-w-7xl mx-auto mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start gap-2">
            <i className="fa-solid fa-circle-info mt-0.5 shrink-0" aria-hidden="true"></i>
            <span>
              Cabang ini sedang istirahat / tutup 😴. Bapak/Ibu tetap bisa melihat-lihat menu, atau <Link to="/branches" className="underline font-bold">pilih cabang lain yang buka ➔</Link>
            </span>
          </div>
        )}
      </section>

      {visibleCategories.length > 0 && (
        <CategoryTabs
          categories={visibleCategories}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex gap-8 items-start">
          <div className="flex-1 min-w-0">
            {isBusy ? (
              <MenuSkeletonGrid />
            ) : error ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-sm space-y-3">
                <i className="fa-solid fa-triangle-exclamation text-4xl text-amber-500" aria-hidden="true"></i>
                <h3 className="font-bold text-stone-800 text-sm">Gagal memuat menu</h3>
                <p className="text-xs text-stone-500">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold shadow-md"
                >
                  Coba lagi
                </button>
              </div>
            ) : !selectedBranch ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-sm space-y-3">
                <i className="fa-solid fa-store text-4xl text-stone-300" aria-hidden="true"></i>
                <h3 className="font-bold text-stone-800 text-sm">Pilih outlet terlebih dahulu</h3>
                <Link
                  to="/branches"
                  className="inline-flex px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold shadow-md"
                >
                  Lihat daftar outlet
                </Link>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-sm space-y-2">
                <i className="fa-solid fa-mug-hot text-4xl text-stone-300" aria-hidden="true"></i>
                <h3 className="font-bold text-stone-800 text-sm">
                  {menuItems.length === 0 ? 'Outlet ini belum punya menu' : 'Tidak ada menu yang cocok'}
                </h3>
                <p className="text-xs text-stone-400">
                  {menuItems.length === 0
                    ? 'Silakan pilih outlet lain.'
                    : 'Coba kata kunci lain atau pilih kategori berbeda.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    outletOpen={selectedBranch.is_open_now}
                  />
                ))}
              </div>
            )}
          </div>

          <StickyCartSidebar />
        </div>
      </div>

      <FloatingCartBar />
    </div>
  )
}
