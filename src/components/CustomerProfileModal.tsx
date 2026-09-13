import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { errorMessage, normalizePhone } from '../api/client'
import { useCustomerAuth } from '../context/CustomerAuthContext'

interface CustomerProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useCustomerAuth()
  const [name, setName] = useState(() => user?.name ?? '')
  const [phone, setPhone] = useState(() => user?.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track previous isOpen state to synchronize form inputs when modal opens
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      setName(user?.name ?? '')
      setPhone(user?.phone ?? '')
      setError(null)
    }
  }

  if (!isOpen || !user) return null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const normalized = normalizePhone(phone)
    if (name.trim().length < 2) {
      setError('Nama pemesan minimal 2 karakter.')
      return
    }
    if (!normalized.valid) {
      setError(normalized.error ?? 'Nomor WhatsApp tidak valid.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await updateProfile(name.trim(), normalized.normalized)
      onClose()
    } catch (err) {
      setError(errorMessage(err, 'Gagal memperbarui profil.'))
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={() => !saving && onClose()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-profile-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="customer-profile-title" className="font-serif text-xl font-bold text-stone-900">Profil saya</h2>
            <p className="text-xs text-stone-500 mt-1">Perbarui data untuk pesanan berikutnya.</p>
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 disabled:opacity-50"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="profile-name" className="block text-xs font-bold text-stone-700 mb-1">Nama pemesan *</label>
            <input
              id="profile-name"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full px-3.5 py-3 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label htmlFor="profile-whatsapp" className="block text-xs font-bold text-stone-700 mb-1">WhatsApp *</label>
            <div className="relative">
              <i className="fa-brands fa-whatsapp absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600" aria-hidden="true"></i>
              <input
                id="profile-whatsapp"
                required
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="081234567890"
                className="w-full pl-9 pr-3.5 py-3 text-xs bg-stone-50 border border-stone-300 rounded-xl font-mono focus:outline-none focus:border-brand-500 focus:bg-white"
              />
            </div>
          </div>

          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-50 rounded-2xl text-xs font-bold">Batal</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 rounded-2xl text-xs font-bold shadow-md">
              {saving ? 'Menyimpan...' : 'Simpan profil'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
