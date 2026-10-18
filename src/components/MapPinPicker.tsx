import React, { useCallback, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { customerApi } from '../api/client'
import { useBranch } from '../context/BranchContext'
import type { Branch } from '../types'

export const SURAKARTA_BOUNDS = {
  minLat: -7.5960,
  maxLat: -7.5220,
  minLon: 110.7680,
  maxLon: 110.8700,
  centerLat: -7.5666,
  centerLon: 110.8250,
}

export function isWithinSurakarta(lat: number, lon: number): boolean {
  return (
    lat >= SURAKARTA_BOUNDS.minLat &&
    lat <= SURAKARTA_BOUNDS.maxLat &&
    lon >= SURAKARTA_BOUNDS.minLon &&
    lon <= SURAKARTA_BOUNDS.maxLon
  )
}

interface MapPinPickerProps {
  initialLat?: number | null
  initialLon?: number | null
  initialAddress?: string | null
  onSelectLocation: (loc: { lat: number; lon: number; address: string }) => void
  onCancel?: () => void
}

export const MapPinPicker: React.FC<MapPinPickerProps> = ({
  initialLat,
  initialLon,
  initialAddress,
  onSelectLocation,
  onCancel,
}) => {
  const { branches } = useBranch()

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const debounceTimerRef = useRef<number | null>(null)
  const abortCtrlRef = useRef<AbortController | null>(null)

  // Starting coordinates: use initial if valid inside Surakarta, or default to city center
  const defaultLat =
    initialLat && initialLat >= -90 && initialLat <= 90 ? initialLat : SURAKARTA_BOUNDS.centerLat
  const defaultLon =
    initialLon && initialLon >= -180 && initialLon <= 180 ? initialLon : SURAKARTA_BOUNDS.centerLon

  const [coords, setCoords] = useState<{ lat: number; lon: number }>({
    lat: defaultLat,
    lon: defaultLon,
  })
  const [address, setAddress] = useState<string>(initialAddress || 'Memuat alamat titik...')
  const [addressLoading, setAddressLoading] = useState<boolean>(false)
  const [isMoving, setIsMoving] = useState<boolean>(false)
  const [detectingGps, setDetectingGps] = useState<boolean>(false)
  const [gpsError, setGpsError] = useState<string | null>(null)

  const inSurakarta = isWithinSurakarta(coords.lat, coords.lon)

  // Reverse geocode when center coordinates settle
  const fetchAddress = useCallback(async (lat: number, lon: number) => {
    abortCtrlRef.current?.abort()
    const ctrl = new AbortController()
    abortCtrlRef.current = ctrl

    setAddressLoading(true)
    try {
      const res = await customerApi.reverseGeocode(lat, lon)
      if (!ctrl.signal.aborted) {
        setAddress(res.full_address || res.label)
      }
    } catch {
      if (!ctrl.signal.aborted) {
        setAddress(`Titik Koordinat (${lat.toFixed(5)}, ${lon.toFixed(5)})`)
      }
    } finally {
      if (!ctrl.signal.aborted) {
        setAddressLoading(false)
      }
    }
  }, [])

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLon],
      zoom: 16,
      minZoom: 12,
      maxZoom: 19,
      zoomControl: false,
      maxBounds: [
        [-7.6500, 110.7300],
        [-7.4800, 110.9100],
      ],
      maxBoundsViscosity: 0.8,
    })
    mapRef.current = map

    // OpenStreetMap standard tile layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    // Zoom buttons in bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Mark branches on the map for user orientation
    if (branches && branches.length > 0) {
      const cafeIcon = L.divIcon({
        className: 'branch-map-marker',
        html: `
          <div style="background-color: #B45309; color: white; width: 28px; height: 28px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">
            ☕
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })

      branches.forEach((b: Branch) => {
        if (b.latitude && b.longitude) {
          L.marker([b.latitude, b.longitude], { icon: cafeIcon })
            .addTo(map)
            .bindPopup(`<div style="font-size:12px; font-weight:bold; color:#1C1917;">${b.name}</div><div style="font-size:10px; color:#78716C;">${b.address}</div>`)
        }
      })
    }

    // Handle map drag/pan events
    map.on('movestart', () => {
      setIsMoving(true)
    })

    map.on('moveend', () => {
      setIsMoving(false)
      const center = map.getCenter()
      setCoords({ lat: center.lat, lon: center.lng })

      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = window.setTimeout(() => {
        fetchAddress(center.lat, center.lng)
      }, 350)
    })

    // Invalidate map size after modal transitions render
    const sizeTimer = window.setTimeout(() => {
      map.invalidateSize()
    }, 200)

    // Initial address fetch if not pre-populated
    if (!initialAddress) {
      fetchAddress(defaultLat, defaultLon)
    }

    return () => {
      window.clearTimeout(sizeTimer)
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
      abortCtrlRef.current?.abort()
      map.remove()
      mapRef.current = null
    }
  }, [defaultLat, defaultLon, branches, fetchAddress, initialAddress])

  // Locate Me using Browser GPS
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Browser tidak mendukung deteksi lokasi GPS')
      return
    }

    setDetectingGps(true)
    setGpsError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetectingGps(false)
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude

        if (mapRef.current) {
          mapRef.current.flyTo([lat, lon], 17, { duration: 1.2 })
        }
      },
      (err) => {
        setDetectingGps(false)
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Akses lokasi (GPS) diblokir pada browser')
        } else {
          setGpsError('Gagal mendeteksi sinyal GPS. Silakan geser peta secara manual')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  }, [])

  const handleConfirm = () => {
    if (!inSurakarta) return
    onSelectLocation({
      lat: coords.lat,
      lon: coords.lon,
      address,
    })
  }

  return (
    <div className="space-y-3">
      {/* Informative City Badge */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-stone-600">
          <i className="fa-solid fa-hand-pointer text-brand-600" aria-hidden="true"></i>
          <span className="font-medium text-[11px] sm:text-xs">
            Geser & perbesar peta sampai pin pas di rumah Anda:
          </span>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
            inSurakarta
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          {inSurakarta ? '✓ Wilayah Surakarta' : '⚠️ Luar Surakarta'}
        </span>
      </div>

      {/* Map Container with Center Pin Overlay */}
      <div className="relative w-full h-[290px] sm:h-[330px] rounded-2xl overflow-hidden border border-stone-200 shadow-inner bg-stone-100">
        <div ref={mapContainerRef} className="w-full h-full z-0 outline-none" />

        {/* Center Pin Fixed Marker */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-[400] flex flex-col items-center">
          {/* Tooltip badge */}
          <div
            className={`px-2.5 py-0.5 bg-stone-900/90 text-white text-[10px] font-bold rounded-full shadow-lg mb-1 whitespace-nowrap flex items-center gap-1 transition-all duration-200 ${
              isMoving ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
            }`}
          >
            <span>Titik Pengantaran</span>
          </div>

          {/* SVG Pin */}
          <div
            className={`transition-transform duration-200 ease-out origin-bottom ${
              isMoving ? '-translate-y-2.5 scale-110 drop-shadow-2xl' : 'translate-y-0 scale-100 drop-shadow-md'
            }`}
          >
            <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M17 0C7.61116 0 0 7.61116 0 17C0 26.9167 14.875 40.375 15.5139 40.9444C16.3611 41.6944 17.6389 41.6944 18.4861 40.9444C19.125 40.375 34 26.9167 34 17C34 7.61116 26.3888 0 17 0Z"
                fill="#DC2626"
              />
              <circle cx="17" cy="17" r="6.5" fill="white" />
              <circle cx="17" cy="17" r="3.5" fill="#DC2626" />
            </svg>
          </div>

          {/* Pin Shadow */}
          <div
            className={`w-3.5 h-1.5 bg-black/40 rounded-full blur-[1px] -mt-0.5 transition-all duration-200 ${
              isMoving ? 'scale-75 opacity-30' : 'scale-100 opacity-70'
            }`}
          />
        </div>

        {/* Locate Me (GPS) Floating Button */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={detectingGps}
          className="absolute bottom-4 left-4 z-[400] bg-white hover:bg-stone-50 active:scale-95 text-stone-800 px-3 py-2 rounded-xl shadow-md border border-stone-200 flex items-center gap-1.5 text-xs font-bold transition-all disabled:opacity-60"
          title="Arahkan peta ke posisi GPS saya saat ini"
        >
          <i
            className={`fa-solid ${
              detectingGps ? 'fa-circle-notch fa-spin text-brand-600' : 'fa-location-crosshairs text-brand-600'
            } text-xs`}
            aria-hidden="true"
          />
          <span className="text-[11px]">{detectingGps ? 'Mencari GPS...' : 'Lokasi Saya'}</span>
        </button>

        {/* Cafe Legend Badge */}
        <div className="absolute top-2.5 left-2.5 z-[400] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-stone-200 text-[10px] text-stone-600 font-medium flex items-center gap-1.5 shadow-xs">
          <span>☕ = Outlet Mareme Resto</span>
        </div>
      </div>

      {/* GPS Error Notice */}
      {gpsError && (
        <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 flex items-center gap-2 animate-fade-in">
          <i className="fa-solid fa-triangle-exclamation text-amber-600 text-xs shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Selected Address Card */}
      <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">
            <i className="fa-solid fa-location-dot text-brand-600 text-xs" />
            <span>Alamat Titik Terpilih:</span>
          </div>
          <span className="text-[10px] font-mono text-stone-400 shrink-0">
            {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
          </span>
        </div>

        <div className="min-h-[38px] flex items-center">
          {addressLoading || isMoving ? (
            <div className="flex items-center gap-2 text-stone-500 text-xs py-1">
              <i className="fa-solid fa-circle-notch fa-spin text-brand-600 text-xs" />
              <span className="italic text-[11px]">Mendapatkan nama jalan dan kelurahan...</span>
            </div>
          ) : (
            <p className="text-xs text-stone-800 font-semibold leading-relaxed break-words">
              {address}
            </p>
          )}
        </div>
      </div>

      {/* Out of bounds Warning */}
      {!inSurakarta && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2 animate-fade-in">
          <i className="fa-solid fa-circle-exclamation text-amber-600 mt-0.5 text-xs shrink-0" />
          <span>
            Titik ini berada di luar batas administratif <strong>Kota Surakarta (Solo)</strong>. Silakan geser pin kembali ke dalam area Kota Surakarta.
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="py-3 px-4 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-100 transition-colors"
          >
            Kembali
          </button>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!inSurakarta || addressLoading}
          className="flex-1 py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <i className="fa-solid fa-check text-sm" aria-hidden="true" />
          <span>Gunakan Titik Peta Ini 📍</span>
        </button>
      </div>
    </div>
  )
}
