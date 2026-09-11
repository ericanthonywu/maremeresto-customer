import React from 'react'

interface RouteProgressBannerProps {
  status: string
  origin?: string
  destination?: string
}

export const RouteProgressBanner: React.FC<RouteProgressBannerProps> = ({
  status,
  origin = 'Outlet Sudirman',
  destination = 'Gedung Menara Sudirman',
}) => {
  return (
    <div className="bg-stone-950 text-white rounded-3xl p-6 shadow-xl overflow-hidden relative border border-stone-800 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Live GPS Tracking
          </span>
        </div>
        <span className="text-xs text-amber-300 bg-white/10 px-3 py-1 rounded-full border border-white/15 font-semibold">
          Est. tiba ~10 mnt
        </span>
      </div>

      {/* Progress Track */}
      <div className="py-4">
        <div className="h-2.5 bg-stone-800 rounded-full w-full relative overflow-hidden border border-stone-700">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-brand-500 rounded-full transition-all duration-1000"
            style={{ width: status === 'delivered' ? '100%' : status === 'on_the_way' ? '75%' : status === 'ready' ? '50%' : '25%' }}
          ></div>
        </div>

        {/* Moving Motorcycle Animated Badge */}
        {status === 'on_the_way' && (
          <div className="mt-3 flex justify-center">
            <div className="drive-anim text-amber-200 flex items-center gap-2 font-bold text-xs bg-brand-700/90 px-3.5 py-1.5 rounded-full border border-amber-400/40 shadow-lg">
              <i className="fa-solid fa-motorcycle text-sm text-amber-300"></i>
              <span>Kurir Sedang Melaju Menuju Anda</span>
            </div>
          </div>
        )}

        {/* Start and Destination */}
        <div className="flex justify-between text-xs text-stone-400 pt-3">
          <span className="flex items-center gap-1">
            <i className="fa-solid fa-store text-stone-500"></i> {origin}
          </span>
          <span className="flex items-center gap-1 font-semibold text-emerald-400">
            <i className="fa-solid fa-location-dot"></i> {destination}
          </span>
        </div>
      </div>

      {/* Current Position Ticker */}
      <div className="bg-stone-900/80 rounded-2xl p-3 border border-stone-800 text-xs text-stone-300 flex items-center gap-2.5">
        <i className="fa-solid fa-compass text-amber-400 text-sm animate-spin" style={{ animationDuration: '6s' }}></i>
        <span>Posisi: Melintasi Jl. Jend. Sudirman, SCBD (Lancar)</span>
      </div>
    </div>
  )
}
