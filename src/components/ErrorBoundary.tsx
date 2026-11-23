import React from 'react'
import { isChunkLoadError, tryReloadOnceForChunkError } from '../utils/lazyWithRetry'

interface ErrorBoundaryState {
  hasError: boolean
  isChunkError: boolean
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, isChunkError: false }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, isChunkError: isChunkLoadError(error) }
  }

  componentDidCatch(error: unknown) {
    if (isChunkLoadError(error)) {
      tryReloadOnceForChunkError()
    }
  }

  private handleReload = () => {
    try {
      sessionStorage.removeItem('mareme_chunk_reload_at')
    } catch {
      // Ignore
    }
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="min-h-[65vh] flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-3xl p-7 sm:p-9 text-center border border-stone-200 shadow-sm max-w-md w-full space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center text-2xl mx-auto">
            <i
              className={`fa-solid ${this.state.isChunkError ? 'fa-arrows-rotate' : 'fa-triangle-exclamation'}`}
              aria-hidden="true"
            />
          </div>

          <div className="space-y-1.5">
            <h2 className="font-serif text-xl font-bold text-stone-900">
              {this.state.isChunkError
                ? 'Aplikasi Baru Saja Diperbarui'
                : 'Halaman Gagal Dimuat'}
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              {this.state.isChunkError
                ? 'Versi terbaru sudah tersedia. Silakan muat ulang halaman untuk melanjutkan.'
                : 'Terjadi gangguan saat membuka halaman ini. Silakan muat ulang atau coba lagi.'}
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all"
            >
              <i className="fa-solid fa-rotate-right text-xs" aria-hidden="true" />
              <span>Muat Ulang Halaman</span>
            </button>
            <a
              href="/branches"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <span>Kembali ke Beranda</span>
            </a>
          </div>
        </div>
      </div>
    )
  }
}
