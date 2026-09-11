import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { customerApi, errorMessage } from '../api/client'
import type { UserLocation } from '../types'

const STORAGE_KEY = 'olga_user_location'
const PROMPTED_KEY = 'olga_location_prompted'

/** A GPS fix older than this is offered for refresh before checkout. */
const STALE_AFTER_MS = 30 * 60 * 1000

export type PermissionState = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported'

interface LocationContextType {
  /**
   * The confirmed delivery point, or null. Null genuinely means "we do not
   * know where the customer is" — there is deliberately no default coordinate,
   * because guessing one silently mispriced delivery.
   */
  location: UserLocation | null
  permission: PermissionState
  /** True while a GPS fix or reverse lookup is in flight. */
  detecting: boolean
  error: string | null
  /** True when the customer has been asked at least once on this device. */
  hasBeenPrompted: boolean
  isStale: boolean
  requestGps: () => Promise<UserLocation | null>
  setLocation: (loc: UserLocation) => void
  clearLocation: () => void
  clearError: () => void
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

function readStored(): UserLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<UserLocation>
    // Reject anything that is not a usable coordinate, including the shape
    // written by older builds that stored no source or timestamp.
    if (
      typeof parsed.lat !== 'number' ||
      typeof parsed.lon !== 'number' ||
      Number.isNaN(parsed.lat) ||
      Number.isNaN(parsed.lon) ||
      parsed.lat < -90 ||
      parsed.lat > 90 ||
      parsed.lon < -180 ||
      parsed.lon > 180 ||
      !parsed.address
    ) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return {
      lat: parsed.lat,
      lon: parsed.lon,
      address: parsed.address,
      source: parsed.source ?? 'manual',
      capturedAt: parsed.capturedAt ?? 0,
    }
  } catch {
    return null
  }
}

/** Maps a GeolocationPositionError to something a customer can act on. */
function geolocationMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Izin lokasi ditolak. Aktifkan izin lokasi di pengaturan browser, atau masukkan alamat Anda secara manual.'
    case err.POSITION_UNAVAILABLE:
      return 'Lokasi GPS tidak dapat ditentukan. Pastikan GPS aktif, atau masukkan alamat secara manual.'
    case err.TIMEOUT:
      return 'Pencarian lokasi memakan waktu terlalu lama. Coba lagi atau masukkan alamat secara manual.'
    default:
      return 'Gagal membaca lokasi Anda. Silakan masukkan alamat secara manual.'
  }
}

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocationState] = useState<UserLocation | null>(() => readStored())
  const [permission, setPermission] = useState<PermissionState>(
    typeof navigator === 'undefined' || !navigator.geolocation ? 'unsupported' : 'unknown'
  )
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasBeenPrompted, setHasBeenPrompted] = useState(
    () => localStorage.getItem(PROMPTED_KEY) === '1'
  )

  // Read the browser's stored decision without triggering a prompt, so the UI
  // can show the right call to action before asking for anything.
  useEffect(() => {
    if (!navigator.geolocation) {
      setPermission('unsupported')
      return
    }
    if (!navigator.permissions?.query) {
      setPermission('prompt')
      return
    }

    let status: PermissionStatus | null = null
    const onChange = () => {
      if (status) setPermission(status.state as PermissionState)
    }

    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((result) => {
        status = result
        setPermission(result.state as PermissionState)
        result.addEventListener('change', onChange)
      })
      .catch(() => setPermission('prompt'))

    return () => status?.removeEventListener('change', onChange)
  }, [])

  const persist = useCallback((loc: UserLocation | null) => {
    if (loc) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const setLocation = useCallback(
    (loc: UserLocation) => {
      setLocationState(loc)
      persist(loc)
      setError(null)
    },
    [persist]
  )

  const clearLocation = useCallback(() => {
    setLocationState(null)
    persist(null)
  }, [persist])

  const markPrompted = useCallback(() => {
    localStorage.setItem(PROMPTED_KEY, '1')
    setHasBeenPrompted(true)
  }, [])

  /**
   * Asks the browser for a GPS fix, then resolves it to a street address so
   * the customer can confirm the courier is being sent somewhere real.
   */
  const requestGps = useCallback(async (): Promise<UserLocation | null> => {
    markPrompted()

    if (!navigator.geolocation) {
      setPermission('unsupported')
      setError('Perangkat atau browser ini tidak mendukung deteksi lokasi. Silakan masukkan alamat secara manual.')
      return null
    }

    setDetecting(true)
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        })
      })

      const { latitude, longitude } = position.coords
      setPermission('granted')

      // Label the point with a real address. If the geocoder is unreachable
      // the coordinate is still correct, so keep it and show the raw position
      // rather than discarding a good fix.
      let address = `Lokasi GPS (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`
      try {
        const place = await customerApi.reverseGeocode(latitude, longitude)
        if (place?.label) address = place.label
      } catch {
        setError('Lokasi terdeteksi, tetapi nama alamat belum bisa dimuat. Anda masih dapat melanjutkan.')
      }

      const resolved: UserLocation = {
        lat: latitude,
        lon: longitude,
        address,
        source: 'gps',
        capturedAt: Date.now(),
      }
      setLocation(resolved)
      return resolved
    } catch (err) {
      const geoErr = err as GeolocationPositionError
      if (typeof geoErr?.code === 'number') {
        if (geoErr.code === geoErr.PERMISSION_DENIED) setPermission('denied')
        setError(geolocationMessage(geoErr))
      } else {
        setError(errorMessage(err, 'Gagal membaca lokasi Anda.'))
      }
      return null
    } finally {
      setDetecting(false)
    }
  }, [markPrompted, setLocation])

  const isStale = useMemo(() => {
    if (!location || location.source !== 'gps') return false
    return Date.now() - location.capturedAt > STALE_AFTER_MS
  }, [location])

  const value = useMemo(
    () => ({
      location,
      permission,
      detecting,
      error,
      hasBeenPrompted,
      isStale,
      requestGps,
      setLocation,
      clearLocation,
      clearError: () => setError(null),
    }),
    [location, permission, detecting, error, hasBeenPrompted, isStale, requestGps, setLocation, clearLocation]
  )

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export const useLocation = () => {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocation must be used within a LocationProvider')
  return ctx
}
