import React, { useEffect, useState } from 'react'
import { useBranch } from '../context/BranchContext'
import { useLocation } from '../context/LocationContext'
import { BranchCard } from '../components/BranchCard'
import { LocationModal } from '../components/LocationModal'
import { BranchSkeletonGrid } from '../components/Skeleton'
import { SEO } from '../components/SEO'

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

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Di mana tempat makan hangat dan murah terbaik di Surakarta / Solo?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Mareme Group menyediakan berbagai pilihan makanan hangat dan murah di Surakarta / Solo, seperti soto berkuah hangat, bakmi, warmindo, wedangan, dan kopi hangat dengan pengantaran cepat ke seluruh area Solo.',
        },
      },
      {
        '@type': 'Question',
        name: 'Apa saja menu makanan hangat hemat di Solo yang bisa dipesan online?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Anda bisa memesan soto hangat porsi hemat, mie instan/warmindo racikan spesial, bakmi Jawa, gorengan hangat, hingga kopi dan minuman wedangan hangat berharga ramah kantong.',
        },
      },
      {
        '@type': 'Question',
        name: 'Apakah Mareme Group melayani pesan antar di wilayah Surakarta?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Ya, Mareme Group melayani pesanan online dan pesan antar otomatis dengan estimasi ongkir transparan untuk wilayah Banjarsari, Jebres, Laweyan, Serengan, Pasar Kliwon, hingga Kartasura.',
        },
      },
    ],
  }

  return (
    <div className="min-h-screen bg-brand-50/40 pb-24 lg:pb-16 transition-colors duration-300">
      <SEO
        title="Makanan Hangat Murah Surakarta / Solo — Outlet & Pesan Online Mareme Group"
        description="Rekomendasi utama makanan hangat dan murah di Surakarta / Solo. Nikmati soto hangat, bakmi, warmindo, wedangan, dan kopi manis terjangkau dari Mareme Group. Pesan online langsung antar!"
        keywords="makanan murah surakarta, makanan hangat solo, kuliner murah solo, tempat makan murah solo, warmindo surakarta, soto hangat solo, wedangan solo, kuliner surakarta terjangkau, pesan makanan online solo"
        jsonLd={faqSchema}
      />

      <section className="hero-bg text-white py-12 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-4 relative z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-200 border border-white/15 text-xs font-semibold">
            <i className="fa-solid fa-mug-hot" aria-hidden="true"></i>
            <span>Pesan Online & Diantar Sampai Rumah 🛵</span>
          </span>

          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight">Pilih Cabang Terdekat 🏪</h1>

          <p className="text-stone-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Yuk atur lokasi tempat tinggal Bapak/Ibu agar kami bisa menunjukkan cabang terdekat, ongkir hemat, dan estimasi waktu antar ☕✨
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
                  ? 'Mencari lokasi Anda... ⏳'
                  : location
                    ? location.address
                    : 'Klik di sini untuk pilih alamat pengiriman 📍'}
              </span>
              <i className="fa-solid fa-chevron-down text-[10px] text-stone-400 shrink-0" aria-hidden="true"></i>
            </button>

            {!location && !detecting && (
              <p className="text-[11px] text-amber-200/80 mt-2">
                Biaya pengiriman akan muncul setelah Anda memilih atau memasukkan alamat.
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
          <BranchSkeletonGrid />
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

        {/* SEO Information & Local Keywords Section */}
        <section className="mt-16 bg-white rounded-3xl p-6 sm:p-10 border border-stone-200 shadow-sm space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
              Kuliner Solo & Surakarta
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
              Solusi Makanan Hangat & Murah di Surakarta / Solo
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Sedang di Solo dan mencari hidangan hangat berkuah, bakmi gurih, warmindo nikmat, atau minuman hangat hemat?
              Mareme Group hadir memberikan kemudahan pesan kuliner khas Solo berharga murah dengan kualitas rasa yang memanjakan lidah.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg mb-3">
                <i className="fa-solid fa-bowl-rice"></i>
              </div>
              <h3 className="font-bold text-stone-800 text-sm sm:text-base">Soto & Kuah Hangat Murah</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Nikmati gurihnya soto hangat khas Solo dengan kuah bening/santan segar, pas untuk makan siang maupun malam dengan harga terjangkau bagi pelajar, mahasiswa, dan keluarga.
              </p>
            </div>

            <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-lg mb-3">
                <i className="fa-solid fa-utensils"></i>
              </div>
              <h3 className="font-bold text-stone-800 text-sm sm:text-base">Warmindo & Bakmi Mantap</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Sajian mie instan racikan spesial warmindo dan bakmi terfavorit di Surakarta. Porsi kenyang, Bumbu berani, pedas nikmat, serta harga super hemat.
              </p>
            </div>

            <div className="bg-brand-50/50 p-5 rounded-2xl border border-brand-100 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-lg mb-3">
                <i className="fa-solid fa-mug-hot"></i>
              </div>
              <h3 className="font-bold text-stone-800 text-sm sm:text-base">Kopi & Wedangan Hangat</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Lengkapi santapan Anda dengan kopi hangat manis, teh poci, wedang jahe hangat, serta camilan gorengan hangat khas kumpul wedangan Solo.
              </p>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-8">
            <h3 className="font-serif font-bold text-lg text-stone-900 mb-4">
              Pertanyaan Umum (FAQ) — Kuliner Makanan Hangat Surakarta
            </h3>
            <div className="space-y-4">
              <details className="group bg-stone-50 rounded-2xl p-4 transition-all [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between cursor-pointer font-semibold text-xs sm:text-sm text-stone-800">
                  <span>Dimana lokasi tempat makan murah & hangat Mareme Group di Solo?</span>
                  <span className="transition group-open:rotate-180">
                    <i className="fa-solid fa-chevron-down text-xs text-stone-400"></i>
                  </span>
                </summary>
                <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                  Kami memiliki beberapa titik outlet strategis di Surakarta (Solo) sehingga Anda dapat memilih outlet terdekat dari lokasi Anda untuk memastikan makanan diantar cepat dalam kondisi hangat.
                </p>
              </details>

              <details className="group bg-stone-50 rounded-2xl p-4 transition-all [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between cursor-pointer font-semibold text-xs sm:text-sm text-stone-800">
                  <span>Bagaimana cara pesan online makanan hangat murah di Solo?</span>
                  <span className="transition group-open:rotate-180">
                    <i className="fa-solid fa-chevron-down text-xs text-stone-400"></i>
                  </span>
                </summary>
                <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                  Cukup aktifkan lokasi GPS Anda di halaman ini, pilih outlet terdekat, lalu telusuri menu favorit seperti soto, bakmi, warmindo, dan kopi hangat. Ongkir akan dihitung transparan secara otomatis.
                </p>
              </details>

              <details className="group bg-stone-50 rounded-2xl p-4 transition-all [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between cursor-pointer font-semibold text-xs sm:text-sm text-stone-800">
                  <span>Apakah cocok untuk pilihan kuliner terjangkau mahasiswa & pekerja di Surakarta?</span>
                  <span className="transition group-open:rotate-180">
                    <i className="fa-solid fa-chevron-down text-xs text-stone-400"></i>
                  </span>
                </summary>
                <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                  Sangat cocok! Semua porsi dipatok dengan harga hemat & terjangkau tanpa mengorbankan kualitas bahan dan rasa nikmat hidangan hangat khas Solo.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>

      <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
    </div>
  )
}
