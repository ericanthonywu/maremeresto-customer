import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Branch } from '../types'
import { customerApi } from '../api/client'

export interface DistanceInfo {
  branchId: string
  distanceKm: number
  distanceMeters: number
  estimatedMinutes: number
  deliveryFee: number
  isNearest: boolean
}

interface BranchContextType {
  branches: Branch[]
  selectedBranch: Branch | null
  setSelectedBranch: (branch: Branch) => void
  selectBranchBySlug: (slug: string) => void
  userLocation: { lat: number; lon: number; address: string } | null
  setUserLocation: (loc: { lat: number; lon: number; address: string }) => void
  nearestBranch: Branch | null
  getBranchDistanceInfo: (branch: Branch, subtotal?: number) => DistanceInfo
  loading: boolean
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

/**
 * Haversine distance formula between two GPS coordinates in kilometers
 * Multiplied by 1.3 to accurately simulate actual road winding distance
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius bumi dalam km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const straightDistance = R * c

  // Faktor jalan raya 1.3x
  const roadDistance = straightDistance * 1.3
  return Math.max(0.5, Math.round(roadDistance * 10) / 10)
}

/**
 * Formula Perhitungan Ongkos Kirim:
 * - 0 s/d 3.000 meter (3 km pertama): Base Flat Rp 8.000
 * - Di atas 3.000 s/d 7.000 meter: Rp 8.000 + (meter - 3.000) * 1.5/meter (atau Tier Mid Rp 12.000)
 * - Di atas 7.000 meter: Tier Far Rp 18.000
 * - Di atas Rp 150.000: Gratis Ongkir
 */
export function calculateDeliveryFeeRupiah(distanceKm: number, subtotal: number = 0): number {
  if (subtotal >= 150000) return 0

  if (distanceKm <= 3.0) {
    return 8000
  } else if (distanceKm <= 7.0) {
    // 3 - 7 km: Rp 8.000 + Rp 1.000 per km tambahan
    const extraKm = distanceKm - 3.0
    return 8000 + Math.round(extraKm * 1000)
  } else {
    // > 7 km: Rp 12.000 + Rp 1.500 per km tambahan
    const extraKm = distanceKm - 7.0
    return 14000 + Math.round(extraKm * 1500)
  }
}

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number; address: string } | null>(() => {
    const saved = localStorage.getItem('olga_user_location')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // ignore
      }
    }
    // Default location: Manahan, Surakarta
    return {
      lat: -7.5532,
      lon: 110.8061,
      address: 'Kawasan Manahan, Banjarsari, Kota Surakarta',
    }
  })
  const [nearestBranch, setNearestBranch] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)

  // Load branches
  useEffect(() => {
    customerApi.getBranches().then((list) => {
      setBranches(list)
      const savedSlug = localStorage.getItem('olga_selected_branch_slug') || 'kerten'
      const found = list.find((b) => b.slug === savedSlug) || list[0]
      setSelectedBranch(found || null)
      setLoading(false)
    }).catch((err) => {
      console.error('Failed to load branches', err)
      setLoading(false)
    })
  }, [])

  // Recalculate nearest branch when location or branches change
  useEffect(() => {
    if (branches.length > 0 && userLocation) {
      let minDistance = Infinity
      let closest: Branch | null = null

      branches.forEach((b) => {
        const dist = calculateDistanceKm(userLocation.lat, userLocation.lon, b.latitude, b.longitude)
        if (dist < minDistance) {
          minDistance = dist
          closest = b
        }
      })

      if (closest) {
        setNearestBranch(closest)
      }
    }
  }, [branches, userLocation])

  const selectBranchBySlug = (slug: string) => {
    const found = branches.find((b) => b.slug === slug)
    if (found) {
      setSelectedBranch(found)
      localStorage.setItem('olga_selected_branch_slug', found.slug)
    }
  }

  const handleSetSelectedBranch = (branch: Branch) => {
    setSelectedBranch(branch)
    localStorage.setItem('olga_selected_branch_slug', branch.slug)
  }

  const handleSetUserLocation = (loc: { lat: number; lon: number; address: string }) => {
    setUserLocation(loc)
    localStorage.setItem('olga_user_location', JSON.stringify(loc))
  }

  const getBranchDistanceInfo = (branch: Branch, subtotal: number = 0): DistanceInfo => {
    const uLat = userLocation?.lat || -7.5532
    const uLon = userLocation?.lon || 110.8061
    const distKm = calculateDistanceKm(uLat, uLon, branch.latitude, branch.longitude)
    const distM = Math.round(distKm * 1000)
    const estMin = Math.max(10, Math.round(distKm * 3.5 + 8)) // estimasi waktu antar
    const fee = calculateDeliveryFeeRupiah(distKm, subtotal)
    const isNear = nearestBranch?.id === branch.id

    return {
      branchId: branch.id,
      distanceKm: distKm,
      distanceMeters: distM,
      estimatedMinutes: estMin,
      deliveryFee: fee,
      isNearest: isNear,
    }
  }

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranch,
        setSelectedBranch: handleSetSelectedBranch,
        selectBranchBySlug,
        userLocation,
        setUserLocation: handleSetUserLocation,
        nearestBranch,
        getBranchDistanceInfo,
        loading,
      }}
    >
      {children}
    </BranchContext.Provider>
  )
}

export const useBranch = () => {
  const context = useContext(BranchContext)
  if (!context) throw new Error('useBranch must be used within a BranchProvider')
  return context
}
