import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Branch, BranchDeliveryQuote } from '../types'
import { customerApi, errorMessage } from '../api/client'
import { useLocation } from './LocationContext'

const SELECTED_BRANCH_KEY = 'olga_selected_branch_slug'

interface BranchContextType {
  branches: Branch[]
  selectedBranch: Branch | null
  setSelectedBranch: (branch: Branch) => void
  selectBranchBySlug: (slug: string) => void

  /**
   * Server-priced delivery quotes keyed by branch id. Empty until the customer
   * has given a location — there is no fallback pricing on the client.
   */
  quotes: Record<string, BranchDeliveryQuote>
  nearestBranch: Branch | null
  quoteFor: (branchId: string) => BranchDeliveryQuote | null
  quotesLoading: boolean
  quotesError: string | null
  /** Re-prices every outlet for the given basket subtotal. */
  refreshQuotes: (subtotal: number) => Promise<void>

  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { location } = useLocation()

  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranchState] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [quotes, setQuotes] = useState<Record<string, BranchDeliveryQuote>>({})
  const [nearestBranchId, setNearestBranchId] = useState<string | null>(null)
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [quotesError, setQuotesError] = useState<string | null>(null)

  // Remember the subtotal used for the latest quote so a basket change is
  // re-priced against the server's fixed distance policy.
  const lastSubtotalRef = useRef<number>(0)

  const loadBranches = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await customerApi.getBranches()
      setBranches(list)

      const savedSlug = localStorage.getItem(SELECTED_BRANCH_KEY)
      const restored = savedSlug ? list.find((b) => b.slug === savedSlug) : undefined
      // Prefer an outlet that can actually take an order right now.
      setSelectedBranchState(restored ?? list.find((b) => b.is_open_now) ?? list[0] ?? null)
    } catch (err) {
      setError(errorMessage(err, 'Gagal memuat daftar outlet.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBranches()
  }, [loadBranches])

  // Make the chosen outlet's palette global. Components continue using their
  // semantic `brand-*` classes, while CSS variables switch the actual colour.
  useEffect(() => {
    document.documentElement.dataset.branchTheme = selectedBranch?.gradient_theme ?? 'brand'
  }, [selectedBranch?.gradient_theme])

  const refreshQuotes = useCallback(
    async (subtotal: number) => {
      if (!location) {
        setQuotes({})
        setNearestBranchId(null)
        return
      }

      lastSubtotalRef.current = subtotal
      setQuotesLoading(true)
      setQuotesError(null)

      try {
        const result = await customerApi.quoteDelivery(location.lat, location.lon, subtotal, 'delivery')
        const byId: Record<string, BranchDeliveryQuote> = {}
        for (const q of result.quotes) byId[q.branch_id] = q

        setQuotes(byId)
        setNearestBranchId(result.nearest_branch_id ?? null)
      } catch (err) {
        // Leave any previous quotes in place rather than flashing to zero, and
        // surface the failure so checkout can block instead of guessing a fee.
        setQuotesError(errorMessage(err, 'Gagal menghitung ongkos kirim.'))
      } finally {
        setQuotesLoading(false)
      }
    },
    [location]
  )

  // Re-price whenever the delivery point moves.
  useEffect(() => {
    if (!location) return
    void refreshQuotes(lastSubtotalRef.current)
  }, [location, refreshQuotes])

  const setSelectedBranch = useCallback((branch: Branch) => {
    setSelectedBranchState(branch)
    localStorage.setItem(SELECTED_BRANCH_KEY, branch.slug)
  }, [])

  const selectBranchBySlug = useCallback(
    (slug: string) => {
      const found = branches.find((b) => b.slug === slug)
      if (found) setSelectedBranch(found)
    },
    [branches, setSelectedBranch]
  )

  const quoteFor = useCallback((branchId: string) => quotes[branchId] ?? null, [quotes])

  const nearestBranch = useMemo(
    () => branches.find((b) => b.id === nearestBranchId) ?? null,
    [branches, nearestBranchId]
  )

  const value = useMemo(
    () => ({
      branches,
      selectedBranch,
      setSelectedBranch,
      selectBranchBySlug,
      quotes,
      nearestBranch,
      quoteFor,
      quotesLoading,
      quotesError,
      refreshQuotes,
      loading,
      error,
      reload: loadBranches,
    }),
    [
      branches, selectedBranch, setSelectedBranch, selectBranchBySlug,
      quotes, nearestBranch, quoteFor, quotesLoading, quotesError, refreshQuotes,
      loading, error, loadBranches,
    ]
  )

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
}

export const useBranch = () => {
  const context = useContext(BranchContext)
  if (!context) throw new Error('useBranch must be used within a BranchProvider')
  return context
}
