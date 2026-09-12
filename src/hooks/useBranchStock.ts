import { useState, useEffect, useCallback, useMemo } from 'react'
import { customerApi } from '../api/client'
import type { Branch, CartItem, MenuItem } from '../types'

export interface StockValidationResult {
  isLoading: boolean
  isAllAvailable: boolean
  unavailableItems: Array<{ cartItem: CartItem; reason: string }>
  stockMap: Record<string, { available: boolean; reason?: string; targetMenuItemId?: string }>
  revalidate: () => Promise<void>
}

export function useBranchStock(
  items: CartItem[],
  branch: Branch | null
): StockValidationResult {
  const [branchMenu, setBranchMenu] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchMenu = useCallback(async () => {
    if (!branch) {
      setBranchMenu([])
      return
    }
    setIsLoading(true)
    try {
      const menu = await customerApi.getMenuByBranch(branch.slug || branch.id)
      setBranchMenu(menu)
    } catch {
      // If menu request fails, do not block artificially
    } finally {
      setIsLoading(false)
    }
  }, [branch])

  useEffect(() => {
    void fetchMenu()
  }, [fetchMenu])

  const { unavailableItems, stockMap, isAllAvailable } = useMemo(() => {
    if (!branch || branchMenu.length === 0) {
      return {
        unavailableItems: [],
        stockMap: {},
        isAllAvailable: true,
      }
    }

    const unavail: Array<{ cartItem: CartItem; reason: string }> = []
    const map: Record<string, { available: boolean; reason?: string; targetMenuItemId?: string }> = {}

    for (const item of items) {
      // Match by exact menu item ID or case-insensitive item name in this branch
      const cleanName = item.name.trim().toLowerCase()
      const match = branchMenu.find(
        (m) => m.id === item.menu_item_id || m.name.trim().toLowerCase() === cleanName
      )

      if (!match) {
        const reason = `Tidak tersedia di ${branch.name}`
        unavail.push({ cartItem: item, reason })
        map[item.id] = { available: false, reason }
      } else if (!match.is_available) {
        const reason = `Stok habis di ${branch.name}`
        unavail.push({ cartItem: item, reason })
        map[item.id] = { available: false, reason }
      } else {
        map[item.id] = { available: true, targetMenuItemId: match.id }
      }
    }

    return {
      unavailableItems: unavail,
      stockMap: map,
      isAllAvailable: unavail.length === 0,
    }
  }, [items, branch, branchMenu])

  return {
    isLoading,
    isAllAvailable,
    unavailableItems,
    stockMap,
    revalidate: fetchMenu,
  }
}
