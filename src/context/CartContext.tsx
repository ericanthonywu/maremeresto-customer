import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { CartItem, MenuItem } from '../types'

const CART_KEY = 'olga_cart_items'
const CART_BRANCH_KEY = 'olga_cart_branch_id'

const MAX_QTY_PER_ITEM = 99

interface CartContextType {
  items: CartItem[]
  /** The outlet the basket belongs to; prices differ per outlet. */
  cartBranchId: string | null
  addToCart: (item: MenuItem, notes?: string, quantity?: number) => void
  removeFromCart: (index: number) => void
  changeQuantity: (index: number, delta: number) => void
  updateNotes: (index: number, notes: string) => void
  clearCart: () => void
  totalCount: number
  subtotal: number
  discount: number
  setDiscount: (val: number) => void
  appliedPromo: string
  setAppliedPromo: (code: string) => void
  clearPromo: () => void
  toastMessage: string | null
  showToast: (msg: string) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

function readStoredCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    // Drop anything that is not a complete, sane line. Older builds seeded the
    // basket with placeholder items whose menu_item_id ("default-1") did not
    // exist, which made checkout fail with an opaque error.
    return parsed.filter(
      (i): i is CartItem =>
        i &&
        typeof i.id === 'string' &&
        typeof i.menu_item_id === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(i.menu_item_id) &&
        typeof i.name === 'string' &&
        Number.isFinite(i.price) &&
        i.price >= 0 &&
        Number.isInteger(i.quantity) &&
        i.quantity > 0 &&
        i.quantity <= MAX_QTY_PER_ITEM
    )
  } catch {
    return []
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // A new visitor starts with an empty basket. Nothing is pre-filled.
  const [items, setItems] = useState<CartItem[]>(readStoredCart)
  const [cartBranchId, setCartBranchId] = useState<string | null>(
    () => localStorage.getItem(CART_BRANCH_KEY)
  )
  const [discount, setDiscount] = useState(0)
  const [appliedPromo, setAppliedPromo] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    if (cartBranchId) {
      localStorage.setItem(CART_BRANCH_KEY, cartBranchId)
    } else {
      localStorage.removeItem(CART_BRANCH_KEY)
    }
  }, [cartBranchId])

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    window.setTimeout(() => setToastMessage(null), 2400)
  }, [])

  const clearPromo = useCallback(() => {
    setDiscount(0)
    setAppliedPromo('')
  }, [])

  const addToCart = useCallback(
    (menuItem: MenuItem, notes?: string, quantity = 1) => {
      const trimmedNotes = (notes ?? '').trim()
      const addQty = Math.max(1, Math.min(quantity, MAX_QTY_PER_ITEM))

      setItems((prev) => {
        // A basket may only contain items from one outlet, because each outlet
        // prices and prepares its own menu. Switching outlets starts fresh.
        let base = prev
        if (cartBranchId && cartBranchId !== menuItem.branch_id) {
          base = []
          showToast('Keranjang dikosongkan karena Anda berpindah outlet')
        }

        const existing = base.findIndex(
          (i) => i.menu_item_id === menuItem.id && (i.notes ?? '') === trimmedNotes
        )

        if (existing > -1) {
          const currentQty = base[existing].quantity
          if (currentQty >= MAX_QTY_PER_ITEM) {
            showToast(`Maksimal ${MAX_QTY_PER_ITEM} per item`)
            return base
          }
          const finalQty = Math.min(MAX_QTY_PER_ITEM, currentQty + addQty)
          return base.map((item, idx) =>
            idx === existing ? { ...item, quantity: finalQty } : item
          )
        }

        return [
          ...base,
          {
            id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            menu_item_id: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            icon: menuItem.icon,
            icon_bg_class: menuItem.icon_bg_class,
            quantity: addQty,
            notes: trimmedNotes,
          },
        ]
      })

      setCartBranchId(menuItem.branch_id)
      // A promo is validated against a specific subtotal, so changing the
      // basket invalidates it.
      clearPromo()
      showToast(
        addQty > 1
          ? `${menuItem.name} (${addQty} porsi) ditambahkan`
          : `${menuItem.name} ditambahkan`
      )
    },
    [cartBranchId, clearPromo, showToast]
  )

  const changeQuantity = useCallback(
    (index: number, delta: number) => {
      setItems((prev) => {
        const target = prev[index]
        if (!target) return prev

        const nextQty = target.quantity + delta
        if (nextQty <= 0) return prev.filter((_, i) => i !== index)
        if (nextQty > MAX_QTY_PER_ITEM) return prev

        return prev.map((item, i) => (i === index ? { ...item, quantity: nextQty } : item))
      })
      clearPromo()
    },
    [clearPromo]
  )

  const updateNotes = useCallback((index: number, notes: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, notes: notes.slice(0, 200) } : item))
    )
  }, [])

  const removeFromCart = useCallback(
    (index: number) => {
      setItems((prev) => prev.filter((_, i) => i !== index))
      clearPromo()
    },
    [clearPromo]
  )

  const clearCart = useCallback(() => {
    setItems([])
    setCartBranchId(null)
    clearPromo()
  }, [clearPromo])

  const totalCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items])
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items])

  // Note: delivery and service fees are NOT computed here. They come from the
  // server's delivery quote, so the customer is never shown a fee that differs
  // from the one they are charged.
  const value = useMemo(
    () => ({
      items,
      cartBranchId,
      addToCart,
      removeFromCart,
      changeQuantity,
      updateNotes,
      clearCart,
      totalCount,
      subtotal,
      discount,
      setDiscount,
      appliedPromo,
      setAppliedPromo,
      clearPromo,
      toastMessage,
      showToast,
    }),
    [
      items, cartBranchId, addToCart, removeFromCart, changeQuantity, updateNotes,
      clearCart, totalCount, subtotal, discount, appliedPromo, clearPromo,
      toastMessage, showToast,
    ]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within a CartProvider')
  return context
}
