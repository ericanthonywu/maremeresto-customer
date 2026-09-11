import React, { useState } from 'react'
import { useBranch } from '../context/BranchContext'
import { BranchCard } from '../components/BranchCard'
import { LocationModal } from '../components/LocationModal'

export const SelectBranchPage: React.FC = () => {
  const { branches, userLocation, nearestBranch, loading } = useBranch()
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#fbf9f6] pb-24 lg:pb-16">
      {/* Hero Section */}
      <section className="hero-bg text-white py-12 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-4 relative z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-200 border border-white/15 text-xs font-semibold">
            <i className="fa-solid fa-mug-hot"></i>
            <span>Pesan Online & Pengantaran Instan</span>
          </span>

          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight">
            Pilih Cabang Cafe Olga
          </h1>

          <p className="text-stone-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Nikmati aroma kopi istimewa dan freshly baked pastry hangat langsung diantar ke pintu Anda dari outlet terdekat.
          </p>

          {/* Location Trigger Bar */}
          <div className="pt-2">
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/20 border border-white/25 text-white text-xs font-medium shadow-md transition-all active:scale-95"
            >
              <i className="fa-solid fa-location-dot text-amber-300"></i>
              <span>{userLocation ? userLocation.address : 'Tentukan Lokasi Anda untuk Rekomendasi Terdekat'}</span>
              <i className="fa-solid fa-chevron-down text-[10px] text-stone-400 ml-1"></i>
            </button>
          </div>
        </div>
      </section>

      {/* Outlets Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <i className="fa-solid fa-circle-notch fa-spin text-3xl text-brand-600"></i>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map((b) => (
              <BranchCard
                key={b.id}
                branch={b}
                isNearest={nearestBranch?.id === b.id}
              />
            ))}
          </div>
        )}
      </main>

      {/* Location Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </div>
  )
}
