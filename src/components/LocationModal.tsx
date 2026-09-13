import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from '../context/LocationContext'
import { customerApi, errorMessage } from '../api/client'
import type { GeocodeResult } from '../types'

interface LocationModalProps {
  isOpen: boolean
  onClose: () => void
  /** Shown when the flow was triggered by checkout rather than by the user. */
  reason?: string
}

const SEARCH_DEBOUNCE_MS = 450
const MIN_QUERY_LENGTH = 3

export const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose, reason }) => {
  const { location, permission, detecting, error, requestGps, setLocation, clearError } = useLocation()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isInsecure = permission === 'insecure_http'
  const gpsBlocked = permission === 'denied' || permission === 'unsupported' || isInsecure

  // Debounced address lookup. Every result carries the coordinate the geocoder
  // actually returned, so a typed address is priced from where it really is.
  useEffect(() => {
    const trimmed = query.trim()

    if (trimmed.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort()
      setResults([])
      setSearching(false)
      setSearchError(null)
      setHasSearched(false)
      return
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setSearching(true)
      setSearchError(null)

      try {
        const found = await customerApi.searchAddress(trimmed, controller.signal)
        setResults(found)
        setHasSearched(true)
      } catch (err) {
        if (!controller.signal.aborted) {
          setResults([])
          setSearchError(errorMessage(err, 'Pencarian alamat gagal. Coba kata kunci lain.'))
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [query])

  // Reset transient state each time the sheet opens.
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setSearchError(null)
      setHasSearched(false)
      clearError()
      if (isInsecure || gpsBlocked) {
        window.setTimeout(() => inputRef.current?.focus(), 150)
      }
    }
  }, [isOpen, clearError, isInsecure, gpsBlocked])

  // Close on Escape, and keep focus inside the sheet.
  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    dialogRef.current?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, onClose])

  const handleGps = useCallback(async () => {
    const resolved = await requestGps()
    if (resolved) {
      onClose()
    } else {
      window.setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [requestGps, onClose])

  const handlePick = useCallback(
    (result: GeocodeResult) => {
      setLocation({
        lat: result.latitude,
        lon: result.longitude,
        address: result.full_address || result.label,
        source: 'search',
        capturedAt: Date.now(),
      })
      onClose()
    },
    [setLocation, onClose]
  )

  if (!isOpen) return null

  const popularAreas = ['Manahan', 'Slamet Riyadi', 'Solo Baru', 'Banjarsari', 'Jebres', 'Kartasura']

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-modal-title"
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto sm:hidden" aria-hidden="true"></div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="location-modal-title" className="font-serif font-bold text-lg text-stone-900">
              Pilih Alamat Pengiriman
            </h3>
            <p className="text-[11px] text-stone-500 mt-0.5">
              {reason ?? 'Biaya pengiriman dihitung otomatis berdasarkan jarak rumah Anda ke cabang terdekat.'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center shrink-0"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        {/* Current selection, so the customer can see what delivery is priced from. */}
        {location && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
            <i className="fa-solid fa-circle-check text-emerald-600 mt-0.5 text-sm" aria-hidden="true"></i>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Alamat saat ini
                {location.source === 'gps' && ' · dari GPS'}
                {location.source === 'search' && ' · hasil pencarian'}
              </span>
              <span className="block text-xs text-stone-800 font-medium break-words">{location.address}</span>
            </div>
          </div>
        )}

        {/* GPS section */}
        <div className="space-y-2">
          {!isInsecure ? (
            <button
              onClick={handleGps}
              disabled={detecting || gpsBlocked}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
            >
              <i
                className={`fa-solid ${detecting ? 'fa-circle-notch fa-spin' : 'fa-location-crosshairs'} text-base`}
                aria-hidden="true"
              ></i>
              <span>
                {detecting
                  ? 'Mencari lokasi Anda otomatis...'
                  : permission === 'granted'
                    ? 'Perbarui Lokasi Otomatis (GPS)'
                    : 'Gunakan Lokasi Otomatis (GPS)'}
              </span>
            </button>
          ) : (
            <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5">
              <i className="fa-solid fa-circle-info text-amber-600 mt-0.5 text-xs shrink-0" aria-hidden="true"></i>
              <div className="space-y-1">
                <span className="font-semibold block text-amber-950">
                  Pencarian Lokasi Otomatis Tidak Tersedia
                </span>
                <span className="text-amber-800 block leading-relaxed">
                  Untuk kemudahan Anda, silakan ketik nama jalan, perumahan, atau area tempat tinggal Anda pada kolom pencarian di bawah ini.
                </span>
              </div>
            </div>
          )}

          {!isInsecure && permission === 'denied' && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-start gap-2">
              <i className="fa-solid fa-circle-info mt-0.5" aria-hidden="true"></i>
              <span>
                Izin lokasi diblokir untuk situs ini. Silakan cari alamat Anda pada kolom pencarian di bawah, atau izinkan akses lokasi di pengaturan browser.
              </span>
            </p>
          )}
          {permission === 'unsupported' && (
            <p className="text-[11px] text-stone-600 bg-stone-100 rounded-xl p-2.5">
              Browser ini tidak mendukung deteksi lokasi. Silakan cari alamat Anda di bawah.
            </p>
          )}
        </div>

        {error && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs space-y-2 animate-fade-in shadow-sm">
            <div className="flex items-start gap-2.5">
              <i className="fa-solid fa-triangle-exclamation mt-0.5 shrink-0 text-amber-600 text-sm" aria-hidden="true"></i>
              <div className="space-y-0.5 min-w-0">
                <span className="font-bold text-amber-950 block">Gagal Mendapatkan Lokasi GPS</span>
                <span className="leading-relaxed block text-stone-700 text-[11px]">{error}</span>
              </div>
            </div>
            <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200 flex items-center gap-2 text-[11px] text-brand-700 font-bold">
              <i className="fa-solid fa-pen text-brand-600"></i>
              <span>Silakan ketik alamat pengantaran Anda secara manual pada kolom di bawah:</span>
            </div>
          </div>
        )}

        <div className="relative flex items-center justify-center">
          <div className="border-t border-stone-200 w-full"></div>
          <span className="bg-white px-3 text-stone-400 text-[10px] uppercase tracking-wider font-semibold absolute">
            {isInsecure ? 'ketik alamat pengiriman' : 'atau ketik alamat'}
          </span>
        </div>

        {/* Address search backed by a real geocoder. */}
        <div className="space-y-2">
          <label htmlFor="address-search" className="sr-only">
            Cari alamat
          </label>
          <div className="relative">
            <i
              className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs"
              aria-hidden="true"
            ></i>
            <input
              ref={inputRef}
              id="address-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="mis. Jl. Slamet Riyadi, Stadion Manahan, Solo Baru"
              autoComplete="off"
              className="w-full pl-9 pr-9 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
            />
            {searching && (
              <i
                className="fa-solid fa-circle-notch fa-spin absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-600 text-xs"
                aria-hidden="true"
              ></i>
            )}
          </div>

          {/* Quick area suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-stone-400 font-medium">Saran area:</span>
            {popularAreas.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => setQuery(area)}
                className="px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-brand-50 hover:text-brand-700 text-stone-600 text-[10px] font-medium border border-stone-200 transition-colors"
              >
                {area}
              </button>
            ))}
          </div>

          {query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH && (
            <p className="text-[11px] text-stone-400 px-1">
              Ketik minimal {MIN_QUERY_LENGTH} karakter.
            </p>
          )}

          {searchError && <p className="text-[11px] text-red-600 font-medium px-1">{searchError}</p>}

          {results.length > 0 && (
            <ul className="space-y-1 max-h-56 overflow-y-auto" role="listbox">
              {results.map((result, idx) => (
                <li key={`${result.latitude}-${result.longitude}-${idx}`}>
                  <button
                    onClick={() => handlePick(result)}
                    role="option"
                    aria-selected="false"
                    className="w-full text-left p-2.5 rounded-xl hover:bg-brand-50 text-stone-700 hover:text-brand-900 text-xs flex items-start gap-2.5 transition-colors border border-transparent hover:border-brand-200"
                  >
                    <i className="fa-solid fa-map-pin text-brand-600 text-xs mt-0.5 shrink-0" aria-hidden="true"></i>
                    <span className="min-w-0">
                      <span className="block font-semibold">{result.label}</span>
                      <span className="block text-[10px] text-stone-400 truncate">{result.full_address}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {hasSearched && !searching && results.length === 0 && !searchError && (
            <p className="text-[11px] text-stone-500 px-1">
              Alamat tidak ditemukan. Coba nama jalan atau patokan yang lebih umum.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
