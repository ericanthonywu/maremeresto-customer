import React, { useState } from 'react'
import { useCustomerAuth } from '../context/CustomerAuthContext'
import { normalizePhone } from '../api/client'

export const CustomerAuthModal: React.FC = () => {
  const { showAuthModal, login } = useCustomerAuth()

  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [submitting, setSubmitting] = useState(false)
  const [normalizedResult, setNormalizedResult] = useState<{ normalized: string } | null>(null)

  // Whenever modal opens (e.g. on initial load or after clicking logout),
  // always reset to initial form step and clear state.
  React.useEffect(() => {
    if (showAuthModal) {
      setStep('form')
      setPhone('')
      setName('')
      setError(null)
      setNormalizedResult(null)
      setSubmitting(false)
    }
  }, [showAuthModal])

  if (!showAuthModal) return null

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!phone.trim()) {
      setError('Silakan masukkan nomor WhatsApp Anda.')
      return
    }

    const check = normalizePhone(phone)
    if (!check.valid) {
      setError(check.error ?? 'Nomor WhatsApp tidak valid. Contoh: 081234567890')
      return
    }

    if (name.trim().length < 2) {
      setError('Nama pemesan wajib diisi (minimal 2 karakter).')
      return
    }

    setNormalizedResult({ normalized: check.normalized })
    setStep('confirm')
  }

  const handleConfirmLogin = async () => {
    if (!normalizedResult) return
    setSubmitting(true)
    setError(null)

    try {
      await login(normalizedResult.normalized, name.trim())
    } catch {
      setError('Gagal masuk. Periksa koneksi internet Anda dan coba lagi.')
      setStep('form')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
        {step === 'form' ? (
          <>
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center text-2xl shadow-sm">
                <i className="fa-solid fa-mug-hot"></i>
              </div>
              <h2 id="auth-modal-title" className="font-serif font-bold text-xl text-stone-900">
                Selamat Datang di Mareme Group
              </h2>
              <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
                Masukkan nomor WhatsApp Anda untuk mulai memesan makanan dan minuman favorit keluarga.
              </p>
            </div>

            <form onSubmit={handleProceedToConfirm} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label htmlFor="auth-phone" className="block text-xs font-bold text-stone-800">
                  WhatsApp <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500 text-xs font-bold">
                    <span>🇮🇩 +62</span>
                  </div>
                  <input
                    id="auth-phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      if (error) setError(null)
                    }}
                    placeholder="812-3456-7890"
                    autoFocus
                    required
                    className="w-full pl-16 pr-3.5 py-3 text-xs bg-stone-50 border border-stone-300 rounded-2xl focus:outline-none focus:border-brand-500 focus:bg-white font-mono transition-all text-stone-900"
                  />
                </div>
                <p className="text-[10px] text-stone-500">
                  Nomor ini digunakan untuk memberi kabar status pesanan dan dihubungi oleh kurir.
                </p>
              </div>

              <div className="space-y-1.5 text-left">
                <label htmlFor="auth-name" className="block text-xs font-bold text-stone-800">
                  Nama Pemesan <span className="text-red-500">*</span>
                </label>
                <input
                  id="auth-name"
                    type="text"
                    required
                    minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="mis. Budi Santoso"
                  className="w-full px-3.5 py-3 text-xs bg-stone-50 border border-stone-300 rounded-2xl focus:outline-none focus:border-brand-500 focus:bg-white transition-all text-stone-900"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                  <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0"></i>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Lanjutkan</span>
                <i className="fa-solid fa-arrow-right text-xs"></i>
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Step 2: Confirmation Popup */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center text-2xl shadow-sm">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <h2 id="auth-modal-title" className="font-serif font-bold text-xl text-stone-900">
                Konfirmasi WhatsApp
              </h2>
              <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
                Apakah WhatsApp di bawah sudah benar dan aktif untuk dihubungi kurir?
              </p>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500">WhatsApp:</span>
                <span className="font-mono font-bold text-stone-900 text-sm">
                  {normalizedResult?.normalized}
                </span>
              </div>
              {name.trim() && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200/60">
                  <span className="text-stone-500">Nama Pemesan:</span>
                  <span className="font-bold text-stone-900">{name.trim()}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2 text-left">
                <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0"></i>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmLogin}
                disabled={submitting}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
                    <span>Masuk...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check text-sm"></i>
                    <span>Ya, Sudah Benar</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('form')}
                disabled={submitting}
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-2xl text-xs transition-colors"
              >
                Ubah Nomor
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
