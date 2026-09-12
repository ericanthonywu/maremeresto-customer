import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { Branch } from '../types'
import { useBranch } from '../context/BranchContext'
import { formatRupiah } from '../api/client'

interface BranchCardProps {
  branch: Branch
  onNeedLocation: () => void
}

/**
 * Outlet theming is driven by the branch's own gradient_theme column rather
 * than a switch on slug, so adding an outlet no longer needs a code change.
 */
const THEMES: Record<Branch['gradient_theme'], { gradient: string; btn: string; panel: string }> = {
  emerald: {
    gradient: 'from-emerald-900 via-emerald-800 to-teal-800',
    btn: 'bg-emerald-700 hover:bg-emerald-800',
    panel: 'bg-emerald-50/70 border-emerald-100',
  },
  indigo: {
    gradient: 'from-indigo-900 via-indigo-800 to-purple-900',
    btn: 'bg-indigo-700 hover:bg-indigo-800',
    panel: 'bg-indigo-50/70 border-indigo-100',
  },
  brand: {
    gradient: 'from-brand-800 via-brand-700 to-amber-700',
    btn: 'bg-brand-600 hover:bg-brand-700',
    panel: 'bg-brand-50/70 border-brand-100',
  },
  // Distinct outlet palettes: Shopee orange, Gojek green, and GoPay blue.
  shopee: {
    gradient: 'from-orange-700 via-orange-600 to-red-600',
    btn: 'bg-orange-600 hover:bg-orange-700',
    panel: 'bg-orange-50/80 border-orange-100',
  },
  gojek: {
    gradient: 'from-green-800 via-emerald-700 to-teal-700',
    btn: 'bg-green-700 hover:bg-green-800',
    panel: 'bg-green-50/80 border-green-100',
  },
  gopay: {
    gradient: 'from-sky-800 via-blue-700 to-indigo-700',
    btn: 'bg-blue-600 hover:bg-blue-700',
    panel: 'bg-blue-50/80 border-blue-100',
  },
}

export const BranchCard: React.FC<BranchCardProps> = ({ branch, onNeedLocation }) => {
  const navigate = useNavigate()
  const { setSelectedBranch, quoteFor, quotesLoading } = useBranch()

  // Server-priced quote, or null when the customer has not shared a location.
  const quote = quoteFor(branch.id)
  const theme = THEMES[branch.gradient_theme] ?? THEMES.brand

  const handleSelect = () => {
    setSelectedBranch(branch)
    navigate(`/menu?branch=${branch.slug}`)
  }

  const outOfRange = quote && !quote.within_radius

  return (
    <div
      className={`bg-white rounded-3xl overflow-hidden border shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between ${
        quote?.is_nearest ? 'ring-2 ring-emerald-500 border-emerald-200' : 'border-stone-200'
      }`}
    >
      <div>
        <div className={`bg-gradient-to-r ${theme.gradient} p-6 text-white relative overflow-hidden`}>
          <i
            className={`fa-solid ${branch.icon || 'fa-store'} text-7xl text-white/10 absolute -right-3 -bottom-3 pointer-events-none`}
            aria-hidden="true"
          ></i>

          <div className="flex items-center justify-between gap-2 mb-2 relative z-10 flex-wrap">
            {/* Reflects the real open state, including operating hours. */}
            {branch.is_open_now ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true"></span>
                Buka sekarang
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-200 border border-red-400/30 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" aria-hidden="true"></span>
                Tutup
              </span>
            )}

            {quote?.is_nearest && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-400 text-stone-950 text-[10px] font-extrabold uppercase tracking-wide shadow">
                <i className="fa-solid fa-location-dot" aria-hidden="true"></i> Terdekat
              </span>
            )}
          </div>

          <h3 className="font-serif text-xl sm:text-2xl font-bold mb-1 relative z-10">{branch.name}</h3>
          <p className="text-white/80 text-xs line-clamp-2 relative z-10">{branch.address}</p>
          {branch.today_hours && (
            <p className="text-white/60 text-[11px] mt-1 relative z-10">Jam buka hari ini: {branch.today_hours}</p>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2 py-2 border-y border-stone-100 text-center text-xs">
            <div>
              <span className="text-stone-400 block text-[10px]">Jarak</span>
              <span className="font-bold text-stone-900 font-mono">
                {quotesLoading ? '…' : quote ? `${quote.distance_km} km` : '—'}
              </span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px]">Rating</span>
              <span className="font-bold text-amber-600 flex items-center justify-center gap-1">
                <i className="fa-solid fa-star text-[10px]" aria-hidden="true"></i> {branch.rating}
              </span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px]">Estimasi</span>
              <span className="font-bold text-stone-900">
                {quotesLoading ? '…' : quote ? `~${quote.eta_minutes} mnt` : '—'}
              </span>
            </div>
          </div>

          {/* Delivery fee: shown only once it is actually known. */}
          {quote ? (
            outOfRange ? (
              <div className="rounded-2xl p-3 border border-amber-200 bg-amber-50 text-xs text-amber-800 flex items-start gap-2">
                <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0" aria-hidden="true"></i>
                <span>
                  Di luar jangkauan antar outlet ini (maks. {quote.max_radius_km} km). Anda masih bisa
                  memesan untuk diambil sendiri.
                </span>
              </div>
            ) : (
              <div className={`rounded-2xl p-3 border flex items-center justify-between text-xs ${theme.panel}`}>
                <span className="text-stone-600 flex items-center gap-1.5 font-medium">
                  <i className="fa-solid fa-motorcycle text-stone-500" aria-hidden="true"></i>
                  Ongkir ({quote.distance_km} km)
                </span>
                <span className="font-extrabold text-stone-900">
                  {quote.delivery_fee === 0 ? 'Gratis' : formatRupiah(quote.delivery_fee)}
                </span>
              </div>
            )
          ) : (
            <button
              onClick={onNeedLocation}
              className="w-full rounded-2xl p-3 border border-dashed border-stone-300 bg-stone-50 hover:bg-stone-100 text-xs text-stone-600 flex items-center justify-center gap-2 transition-colors"
            >
              <i className="fa-solid fa-location-crosshairs text-brand-600" aria-hidden="true"></i>
              <span className="font-semibold">Tentukan lokasi untuk lihat ongkir</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-5 pt-0">
        <button
          onClick={handleSelect}
          disabled={!branch.is_open_now}
          className={`w-full py-3 ${theme.btn} disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2`}
        >
          <span>{branch.is_open_now ? 'Pilih outlet & mulai pesan' : 'Outlet sedang tutup'}</span>
          {branch.is_open_now && <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i>}
        </button>
      </div>
    </div>
  )
}
