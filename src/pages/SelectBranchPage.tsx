import React, { useEffect, useState } from 'react'
import { useBranch } from '../context/BranchContext'
import { useLocation } from '../context/LocationContext'
import { BranchCard } from '../components/BranchCard'
import { LocationModal } from '../components/LocationModal'

export const SelectBranchPage: React.FC = () => {
  const { branches, loading, error, reload, quotesError, quotesLoading } = useBranch()
  const { location, permission, hasBeenPrompted, detecting, requestGps } = useLocation()
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  // Ask once, on the first visit, and only where the browser will actually
  // show a prompt. The app never assumes a location on the customer's behalf.
  useEffect(() => {
    if (!location && !hasBeenPrompted && permission === 'prompt') {
      void requestGps()
    }
  }, [location, hasBeenPrompted, permission, requestGps])

  return (
    <div className="min-h-screen bg-[#fbf9f6] pb-24 lg:pb-16">
      <section className="hero-bg text-white py-12 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-4 relative z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-200 border border-white/15 text-xs font-semibold">
            <i className="fa-solid fa-mug-hot" aria-hidden="true"></i>
            <span>Pesan online & pengantaran</span>
          </span>

          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight">Pilih Outlet</h1>

          <p className="text-stone-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Tentukan lokasi Anda dan kami tampilkan jarak, estimasi waktu, serta ongkos kirim
            sebenarnya dari setiap outlet.
          </p>

          <div className="pt-2">
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/20 border border-white/25 text-white text-xs font-medium shadow-md transition-all active:scale-95 max-w-full"
            >
              <i
                className={`fa-solid ${detecting ? 'fa-circle-notch fa-spin' : 'fa-location-dot'} text-amber-300 shrink-0`}
                aria-hidden="true"
              ></i>
              <span className="truncate max-w-[16rem] sm:max-w-md">
                {detecting
                  ? 'Mendeteksi lokasi Anda...'
                  : location
                    ? location.address
                    : 'Tentukan lokasi Anda'}
              </span>
              <i className="fa-solid fa-chevron-down text-[10px] text-stone-400 shrink-0" aria-hidden="true"></i>
            </button>

            {!location && !detecting && (
              <p className="text-[11px] text-amber-200/80 mt-2">
                Ongkos kirim belum bisa ditampilkan sampai lokasi ditentukan.
              </p>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {quotesError && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start gap-2">
            <i className="fa-solid fa-triangle-exclamation mt-0.5" aria-hidden="true"></i>
            <span>{quotesError}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <i className="fa-solid fa-circle-notch fa-spin text-3xl text-brand-600" aria-hidden="true"></i>
            <span className="sr-only">Memuat outlet</span>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 shadow-sm space-y-3">
            <i className="fa-solid fa-triangle-exclamation text-3xl text-amber-500" aria-hidden="true"></i>
            <h3 className="font-bold text-stone-800 text-sm">Gagal memuat outlet</h3>
            <p className="text-xs text-stone-500">{error}</p>
            <button
              onClick={() => void reload()}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold shadow-md"
            >
              Coba lagi
            </button>
          </div>
        ) : branches.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 shadow-sm">
            <i className="fa-solid fa-store-slash text-3xl text-stone-300 mb-2" aria-hidden="true"></i>
            <h3 className="font-bold text-stone-800 text-sm">Belum ada outlet tersedia</h3>
          </div>
        ) : (
          <>
            {quotesLoading && (
              <p className="text-[11px] text-stone-400 mb-3 flex items-center gap-2">
                <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
                Menghitung ongkos kirim...
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {branches.map((b) => (
                <BranchCard key={b.id} branch={b} onNeedLocation={() => setIsLocationModalOpen(true)} />
              ))}
            </div>
          </>
        )}
      </main>

      <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
    </div>
  )
}
