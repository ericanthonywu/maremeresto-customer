import React, { useState } from 'react'
import { useBranch } from '../context/BranchContext'

interface LocationModalProps {
  isOpen: boolean
  onClose: () => void
}

// Presets in Surakarta (Solo) and surrounding areas
const ADDR_DB = [
  { name: 'Kawasan Manahan & Stadion, Banjarsari, Surakarta', lat: -7.5532, lon: 110.8061 },
  { name: 'Jl. Sam Ratulangi / Kerten, Laweyan, Surakarta', lat: -7.5583, lon: 110.7952 },
  { name: 'Makamhaji / Kartasura, Sukoharjo', lat: -7.5662, lon: 110.7788 },
  { name: 'Jl. R.M. Said / Ketelan, Banjarsari, Surakarta', lat: -7.5647, lon: 110.8227 },
  { name: 'Slamet Riyadi / Purwosari, Surakarta', lat: -7.5628, lon: 110.7981 },
  { name: 'Pasar Gede / Jebres, Surakarta', lat: -7.5701, lon: 110.8322 },
  { name: 'Solo Baru / Kawasan Bisnis Grogol, Sukoharjo', lat: -7.6005, lon: 110.8174 },
]

export const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose }) => {
  const { setUserLocation } = useBranch()
  const [addressInput, setAddressInput] = useState('')
  const [isDetecting, setIsDetecting] = useState(false)

  if (!isOpen) return null

  const handleGPS = () => {
    setIsDetecting(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsDetecting(false)
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            address: 'Lokasi Terkini Saya (GPS Terdeteksi)',
          })
          onClose()
        },
        () => {
          setIsDetecting(false)
          // Fallback to Manahan Solo
          setUserLocation({
            lat: -7.5532,
            lon: 110.8061,
            address: 'Kawasan Manahan, Banjarsari, Kota Surakarta',
          })
          onClose()
        },
        { timeout: 5000 }
      )
    } else {
      setIsDetecting(false)
      setUserLocation({
        lat: -7.5532,
        lon: 110.8061,
        address: 'Kawasan Manahan, Banjarsari, Kota Surakarta',
      })
      onClose()
    }
  }

  const handleSelectQuick = (item: { name: string; lat: number; lon: number }) => {
    setUserLocation({
      lat: item.lat,
      lon: item.lon,
      address: item.name,
    })
    onClose()
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!addressInput.trim()) return
    setUserLocation({
      lat: -7.5583,
      lon: 110.7952,
      address: addressInput.trim(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Mobile handle */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto sm:hidden"></div>

        <div className="flex items-center justify-between">
          <h3 className="font-serif font-bold text-lg text-stone-900">
            Tentukan Alamat Pengantaran
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* GPS Button */}
        <button
          onClick={handleGPS}
          disabled={isDetecting}
          className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
        >
          <i className="fa-solid fa-location-crosshairs text-base"></i>
          <span>{isDetecting ? 'Mendeteksi Lokasi GPS...' : 'Gunakan Lokasi GPS Saya Saat Ini'}</span>
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-stone-200 w-full"></div>
          <span className="bg-white px-3 text-stone-400 text-xs uppercase tracking-wider font-semibold absolute">
            atau pilih area cepat Solo
          </span>
        </div>

        {/* Quick Area List */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-none">
          {ADDR_DB.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectQuick(item)}
              className="w-full text-left p-2.5 rounded-xl hover:bg-brand-50 hover:text-brand-800 text-stone-700 text-xs font-medium flex items-center gap-2 transition-colors border border-transparent hover:border-brand-200"
            >
              <i className="fa-solid fa-map-pin text-brand-600 text-xs shrink-0"></i>
              <span className="truncate">{item.name}</span>
            </button>
          ))}
        </div>

        {/* Manual Address Input */}
        <form onSubmit={handleManualSubmit} className="pt-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Ketik alamat lengkap atau patokan di Solo..."
              className="flex-1 px-4 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold"
            >
              Terapkan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
