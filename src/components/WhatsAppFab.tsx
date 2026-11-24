import React from 'react'
import { useLocation } from 'react-router-dom'
import { useBranch } from '../context/BranchContext'
import { useCart } from '../context/CartContext'
import { buildWhatsAppUrl } from '../api/client'

/**
 * Floating WhatsApp action button that redirects to the currently selected
 * branch's wa.me link, shifting above the mobile FloatingCartBar when active.
 */
export const WhatsAppFab: React.FC = () => {
  const { selectedBranch } = useBranch()
  const { totalCount } = useCart()
  const { pathname } = useLocation()

  const waUrl = selectedBranch
    ? buildWhatsAppUrl(
        selectedBranch.whatsapp_number,
        `Halo ${selectedBranch.name}, saya ingin bertanya mengenai menu / pesanan.`
      )
    : null

  if (!selectedBranch || !waUrl) return null

  const hasFloatingCartBar = pathname === '/menu' && totalCount > 0

  return (
    <div
      className={`fixed right-4 lg:right-6 z-30 transition-all duration-200 ${
        hasFloatingCartBar ? 'bottom-36 lg:bottom-6' : 'bottom-20 lg:bottom-6'
      }`}
    >
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Chat WhatsApp ${selectedBranch.name}`}
        title={`Chat WhatsApp ${selectedBranch.name}`}
        className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 text-white shadow-lg shadow-emerald-900/25 ring-2 ring-white/90 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
      >
        <span
          aria-hidden="true"
          className="hidden lg:flex items-center whitespace-nowrap absolute right-full mr-3 px-3 py-1.5 rounded-xl bg-stone-900/95 text-white text-xs font-bold shadow-lg opacity-0 translate-x-1 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 transition-all duration-150"
        >
          Chat {selectedBranch.name}
        </span>
        <i className="fa-brands fa-whatsapp text-3xl leading-none" aria-hidden="true" />
      </a>
    </div>
  )
}
