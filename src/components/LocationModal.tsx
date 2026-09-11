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
    }
  }, [isOpen, clearError])

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
    if (resolved) onClose()
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

  const gpsBlocked = permission === 'denied' || permission === 'unsupported'

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
              Tentukan Alamat Pengantaran
            </h3>
            <p className="text-[11px] text-stone-500 mt-0.5">
              {reason ?? 'Ongkos kirim dihitung dari jarak sebenarnya ke outlet terdekat.'}
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

        {/* GPS: the browser asks for permission only when this is tapped. */}
        <div className="space-y-2">
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
                ? 'Mendeteksi lokasi Anda...'
                : permission === 'granted'
                  ? 'Perbarui Lokasi GPS Saya'
                  : 'Gunakan Lokasi GPS Saya'}
            </span>
          </button>

          {permission === 'denied' && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-start gap-2">
              <i className="fa-solid fa-circle-info mt-0.5" aria-hidden="true"></i>
              <span>
                Izin lokasi diblokir untuk situs ini. Untuk mengaktifkan kembali, buka ikon kunci di
                address bar browser Anda, lalu izinkan akses Lokasi. Atau cari alamat Anda di bawah.
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
          <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-xl p-2.5 flex items-start gap-2">
            <i className="fa-solid fa-circle-exclamation mt-0.5" aria-hidden="true"></i>
            <span>{error}</span>
          </p>
        )}

        <div className="relative flex items-center justify-center">
          <div className="border-t border-stone-200 w-full"></div>
          <span className="bg-white px-3 text-stone-400 text-[10px] uppercase tracking-wider font-semibold absolute">
            atau cari alamat
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
