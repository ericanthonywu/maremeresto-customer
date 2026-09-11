import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { Branch } from '../types'
import { useBranch } from '../context/BranchContext'

interface BranchCardProps {
  branch: Branch
  isNearest?: boolean
}

export const BranchCard: React.FC<BranchCardProps> = ({ branch, isNearest }) => {
  const navigate = useNavigate()
  const { setSelectedBranch, getBranchDistanceInfo } = useBranch()
  const distInfo = getBranchDistanceInfo(branch)

  const handleSelect = () => {
    setSelectedBranch(branch)
    navigate(`/menu?branch=${branch.slug}`)
  }

  // Theme styles based on outlet
  const getTheme = () => {
    switch (branch.slug) {
      case 'makamhaji':
        return {
          gradient: 'from-emerald-900 via-emerald-800 to-teal-800',
          watermark: 'fa-utensils',
          btnBg: 'bg-emerald-700 hover:bg-emerald-800',
          deliveryBg: 'bg-emerald-50/70 border-emerald-100',
          tagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          hours: '08.00–22.00',
        }
      case 'mak-djan':
        return {
          gradient: 'from-indigo-900 via-indigo-800 to-purple-900',
          watermark: 'fa-bowl-rice',
          btnBg: 'bg-indigo-700 hover:bg-indigo-800',
          deliveryBg: 'bg-indigo-50/70 border-indigo-100',
          tagBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          hours: '09.00–23.00',
        }
      case 'kerten':
      default:
        return {
          gradient: 'from-brand-800 via-brand-700 to-amber-700',
          watermark: 'fa-store',
          btnBg: 'bg-brand-600 hover:bg-brand-700',
          deliveryBg: 'bg-brand-50/70 border-brand-100',
          tagBg: 'bg-amber-50 text-amber-800 border-amber-200',
          hours: '07.30–22.30',
        }
    }
  }

  const theme = getTheme()

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)

  return (
    <div
      className={`bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between ${
        isNearest ? 'ring-2 ring-emerald-500' : ''
      }`}
    >
      <div>
        {/* Card Header with gradient */}
        <div className={`bg-gradient-to-r ${theme.gradient} p-6 text-white relative overflow-hidden`}>
          <i className={`fa-solid ${theme.watermark} text-7xl text-white/10 absolute -right-3 -bottom-3 pointer-events-none`}></i>

          <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {branch.is_open ? 'Buka Sekarang' : 'Tutup Sementara'}
            </span>

            {isNearest && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-400 text-stone-950 text-[10px] font-extrabold uppercase tracking-wide shadow">
                <i className="fa-solid fa-location-dot"></i> Cabang Terdekat ({distInfo.distanceKm} km)
              </span>
            )}
          </div>

          <h3 className="font-serif text-xl sm:text-2xl font-bold mb-1 relative z-10">
            {branch.name}
          </h3>
          <p className="text-white/80 text-xs line-clamp-2 relative z-10">
            {branch.address}
          </p>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-4">
          {/* Stats strip with live distance & ETA */}
          <div className="grid grid-cols-3 gap-2 py-2 border-y border-stone-100 text-center text-xs">
            <div>
              <span className="text-stone-400 block text-[10px]">Jarak Antar</span>
              <span className="font-bold text-stone-900 font-mono">
                {distInfo.distanceKm} km
              </span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px]">Rating</span>
              <span className="font-bold text-amber-600 flex items-center justify-center gap-1">
                <i className="fa-solid fa-star text-[10px]"></i> {branch.rating}
              </span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px]">Estimasi Tiba</span>
              <span className="font-bold text-stone-900">~{distInfo.estimatedMinutes} mnt</span>
            </div>
          </div>

          {/* Facility chips */}
          <div className="flex flex-wrap gap-1.5">
            {branch.facility_tags?.map((tag, idx) => (
              <span
                key={idx}
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${theme.tagBg}`}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Delivery fee row calculated from user location */}
          <div className={`rounded-2xl p-3 border flex items-center justify-between text-xs ${theme.deliveryBg}`}>
            <span className="text-stone-600 flex items-center gap-1.5 font-medium">
              <i className="fa-solid fa-motorcycle text-stone-500"></i> Ongkir ({distInfo.distanceKm} km):
            </span>
            <span className="font-extrabold text-stone-900">{formatRupiah(distInfo.deliveryFee)}</span>
          </div>
        </div>
      </div>

      {/* Card Action */}
      <div className="p-5 pt-0">
        <button
          onClick={handleSelect}
          className={`w-full py-3 ${theme.btnBg} text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2`}
        >
          <span>Pilih Outlet & Mulai Pesan</span>
          <i className="fa-solid fa-arrow-right text-xs"></i>
        </button>
      </div>
    </div>
  )
}
