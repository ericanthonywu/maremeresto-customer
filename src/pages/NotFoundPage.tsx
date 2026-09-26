import React from 'react'
import { Link } from 'react-router-dom'
import { SEO } from '../components/SEO'

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <SEO
        title="Halaman Tidak Ditemukan (404) | Mareme Group"
        description="Halaman yang Anda tuju tidak ditemukan atau sudah dipindahkan."
      />
      <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-stone-200 shadow-sm max-w-md w-full space-y-6">
        <div className="w-20 h-20 rounded-full bg-amber-50 border border-amber-200/80 text-amber-500 flex items-center justify-center text-4xl mx-auto shadow-xs">
          <i className="fa-solid fa-compass" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-100/60 px-2.5 py-1 rounded-full">
            Error 404
          </span>
          <h1 className="font-serif text-2xl font-bold text-stone-900 pt-1">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Maaf, halaman atau tautan yang Anda buka tidak tersedia, mungkin sudah berpindah alamat atau tautan tidak valid.
          </p>
        </div>

        <div className="space-y-2.5 pt-2">
          <Link
            to="/menu"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all"
          >
            <i className="fa-solid fa-utensils text-xs" aria-hidden="true" />
            <span>Lihat Menu &amp; Pesan Makanan</span>
          </Link>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              to="/branches"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <i className="fa-solid fa-store text-[11px]" aria-hidden="true" />
              <span>Pilih Cabang</span>
            </Link>
            <Link
              to="/tracking"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <i className="fa-solid fa-clock-rotate-left text-[11px]" aria-hidden="true" />
              <span>Lacak Pesanan</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
