import React from 'react'
import type { Order } from '../types'

interface RouteProgressBannerProps {
  status: Order['status']
  orderType: Order['order_type']
  originName?: string
  destination?: string
  distanceKm?: number
  createdAt?: string
}

/** How far through fulfilment each status is, as a fraction of the bar. */
const PROGRESS: Partial<Record<Order['status'], number>> = {
  pending: 0.1,
  accepted: 0.3,
  preparing: 0.5,
  ready: 0.7,
  on_the_way: 0.85,
  delivered: 1,
  completed: 1,
}

const HEADLINE: Partial<Record<Order['status'], string>> = {
  pending: 'Menunggu konfirmasi outlet',
  accepted: 'Pesanan diterima outlet',
  preparing: 'Pesanan sedang disiapkan',
  ready: 'Pesanan siap',
  on_the_way: 'Kurir menuju alamat Anda',
  delivered: 'Pesanan telah tiba',
  completed: 'Pesanan selesai',
  cancelled: 'Pesanan dibatalkan',
  rejected: 'Pesanan ditolak outlet',
}

export const RouteProgressBanner: React.FC<RouteProgressBannerProps> = ({
  status,
  orderType,
  originName,
  destination,
  distanceKm,
  createdAt,
}) => {
  const isStopped = status === 'cancelled' || status === 'rejected'
  const progress = isStopped ? 0 : (PROGRESS[status] ?? 0.1)

  // Elapsed time since the order was placed. This is a real measurement; the
  // previous banner printed a fixed "Est. tiba ~10 mnt" and a made-up street
  // position ("Melintasi Jl. Jend. Sudirman, SCBD") regardless of the order.
  const elapsedMinutes = createdAt
    ? Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000))
    : null

  return (
    <div className="bg-stone-950 text-white rounded-3xl p-6 shadow-xl overflow-hidden relative border border-stone-800 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {!isStopped && status !== 'completed' && status !== 'delivered' ? (
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          ) : (
            <i
              className={`fa-solid ${isStopped ? 'fa-circle-xmark text-red-400' : 'fa-circle-check text-emerald-400'} text-sm`}
              aria-hidden="true"
            ></i>
          )}
          <span
            className={`text-xs font-bold uppercase tracking-wider truncate ${
              isStopped ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {HEADLINE[status] ?? status}
          </span>
        </div>

        {elapsedMinutes !== null && !isStopped && (
          <span className="text-xs text-amber-300 bg-white/10 px-3 py-1 rounded-full border border-white/15 font-semibold shrink-0">
            {elapsedMinutes < 1 ? 'baru saja' : `${elapsedMinutes} mnt lalu`}
          </span>
        )}
      </div>

      <div className="py-2">
        <div
          className="h-2.5 bg-stone-800 rounded-full w-full relative overflow-hidden border border-stone-700"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progres pesanan"
        >
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isStopped ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 via-amber-400 to-brand-500'
            }`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          ></div>
        </div>

        {status === 'on_the_way' && orderType !== 'pickup' && (
          <div className="mt-3 flex justify-center">
            <div className="drive-anim text-amber-200 flex items-center gap-2 font-bold text-xs bg-brand-700/90 px-3.5 py-1.5 rounded-full border border-amber-400/40 shadow-lg">
              <i className="fa-solid fa-motorcycle text-sm text-amber-300" aria-hidden="true"></i>
              <span>Kurir sedang melaju</span>
            </div>
          </div>
        )}

        <div className="flex justify-between gap-4 text-xs text-stone-400 pt-3">
          <span className="flex items-center gap-1.5 min-w-0">
            <i className="fa-solid fa-store text-stone-500 shrink-0" aria-hidden="true"></i>
            <span className="truncate">{originName ?? 'Outlet'}</span>
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-emerald-400 min-w-0 justify-end">
            <i className="fa-solid fa-location-dot shrink-0" aria-hidden="true"></i>
            <span className="truncate">
              {orderType === 'pickup' ? 'Diambil di outlet' : (destination || 'Alamat Anda')}
            </span>
          </span>
        </div>
      </div>

      {orderType !== 'pickup' && distanceKm != null && distanceKm > 0 && (
        <div className="bg-stone-900/80 rounded-2xl p-3 border border-stone-800 text-xs text-stone-300 flex items-center gap-2.5">
          <i className="fa-solid fa-route text-amber-400 text-sm shrink-0" aria-hidden="true"></i>
          <span>
            Jarak tempuh <strong className="font-mono text-white">{distanceKm} km</strong> dari{' '}
            {originName ?? 'outlet'} ke alamat Anda
          </span>
        </div>
      )}
    </div>
  )
}
