import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { customerApi, errorMessage } from '../api/client'
import type { UserLocation } from '../types'

const STORAGE_KEY = 'olga_user_location'
const PROMPTED_KEY = 'olga_location_prompted'

/** A GPS fix older than this is offered for refresh before checkout. */
const STALE_AFTER_MS = 30 * 60 * 1000

export type PermissionState = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported' | 'insecure_http'

const isSecureOrigin = (): boolean => {
  if (typeof window === 'undefined') return true
  if (typeof window.isSecureContext === 'boolean') return window.isSecureContext
  return (
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )
}

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

/**
 * Tries to retrieve location with progressive multi-tier fallbacks:
 * 1. High accuracy (GPS, ideal for mobile devices)
 * 2. Standard accuracy fallback (Wi-Fi/IP, essential for Mac & PC without GPS hardware,
 *    preventing macOS CoreLocation kCLErrorLocationUnknown failure)
 * 3. Short watchPosition fallback (gives CoreLocation time to scan Wi-Fi beacons)
 */
async function fetchCurrentPosition(): Promise<GeolocationPosition> {
  const getPos = (opts: PositionOptions) =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, opts)
    })

  const watchPos = (opts: PositionOptions, maxWaitMs = 6000) =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      let id: number | null = null
      let settled = false

      const timer = window.setTimeout(() => {
        if (!settled) {
          settled = true
          if (id !== null) navigator.geolocation.clearWatch(id)
          reject(new Error('watchPosition timeout'))
        }
      }, maxWaitMs)

      id = navigator.geolocation.watchPosition(
        (pos) => {
          if (!settled) {
            settled = true
            window.clearTimeout(timer)
            if (id !== null) navigator.geolocation.clearWatch(id)
            resolve(pos)
          }
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED && !settled) {
            settled = true
            window.clearTimeout(timer)
            if (id !== null) navigator.geolocation.clearWatch(id)
            reject(err)
          }
        },
        opts
      )
    })

  // Tier 1: Try high accuracy first (smartphones / mobile GPS)
  try {
    return await getPos({
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 60000,
    })
  } catch (err1) {
    const geoErr1 = err1 as GeolocationPositionError
    if (geoErr1?.code === geoErr1?.PERMISSION_DENIED) {
      throw err1
    }

    // Tier 2: Standard accuracy (uses Wi-Fi / IP positioning without demanding GPS hardware,
    // avoiding macOS CoreLocation kCLErrorLocationUnknown failure)
    try {
      return await getPos({
        enableHighAccuracy: false,
        timeout: 7000,
        maximumAge: 300000,
      })
    } catch (err2) {
      const geoErr2 = err2 as GeolocationPositionError
      if (geoErr2?.code === geoErr2?.PERMISSION_DENIED) {
        throw err2
      }

      // Tier 3: watchPosition retry
      try {
        return await watchPos(
          {
            enableHighAccuracy: false,
            maximumAge: 300000,
          },
          6000
        )
      } catch {
        throw err1
      }
    }
  }
}

/** Maps a GeolocationPositionError to something a customer can act on. */
function geolocationMessage(err: GeolocationPositionError): string {
  if (!isSecureOrigin()) {
    return 'Browser membatasi GPS pada koneksi HTTP (memerlukan HTTPS). Silakan ketik alamat pengantaran Anda secara manual.'
  }
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Izin lokasi belum diberikan atau ditolak browser/sistem. Silakan ketik alamat pengantaran Anda secara manual pada kolom pencarian.'
    case err.POSITION_UNAVAILABLE:
      return 'Tidak dapat mendeteksi koordinat GPS perangkat. Silakan ketik nama jalan, gedung, atau area Anda secara manual pada kolom pencarian.'
    case err.TIMEOUT:
      return 'Waktu pencarian lokasi GPS habis. Silakan ketik alamat pengantaran Anda secara manual pada kolom pencarian.'
    default:
      return 'Gagal membaca lokasi GPS otomatis. Silakan ketik alamat pengantaran Anda secara manual pada kolom pencarian.'
  }
}

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocationState] = useState<UserLocation | null>(() => readStored())
  const [permission, setPermission] = useState<PermissionState>(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unsupported'
    if (!isSecureOrigin()) return 'insecure_http'
    return 'unknown'
  })
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasBeenPrompted, setHasBeenPrompted] = useState(
    () => localStorage.getItem(PROMPTED_KEY) === '1'
  )

  // Read the browser's stored decision without triggering a prompt, so the UI
  // can show the right call to action before asking for anything.
  useEffect(() => {
    if (!isSecureOrigin()) {
      setPermission('insecure_http')
      return
    }
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

    if (!isSecureOrigin()) {
      setPermission('insecure_http')
      setError('Browser membatasi GPS otomatis pada koneksi HTTP (memerlukan HTTPS). Silakan gunakan kolom pencarian alamat.')
      return null
    }

    if (!navigator.geolocation) {
      setPermission('unsupported')
      setError('Perangkat atau browser ini tidak mendukung deteksi lokasi. Silakan masukkan alamat secara manual.')
      return null
    }

    setDetecting(true)
    setError(null)

    try {
      const position = await fetchCurrentPosition()

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
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setPermission(isSecureOrigin() ? 'denied' : 'insecure_http')
        }
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
