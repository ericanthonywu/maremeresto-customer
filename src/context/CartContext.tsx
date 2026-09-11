import React, { createContext, useContext, useState, useEffect } from 'react'
import type { CartItem, MenuItem } from '../types'

interface CartContextType {
  items: CartItem[]
  addToCart: (item: MenuItem, notes?: string) => void
  removeFromCart: (index: number) => void
  changeQuantity: (index: number, delta: number) => void
  updateNotes: (index: number, notes: string) => void
  clearCart: () => void
  totalCount: number
  subtotal: number
  deliveryFee: number
  serviceFee: number
  discount: number
  setDiscount: (val: number) => void
  grandTotal: number
  appliedPromo: string
  setAppliedPromo: (code: string) => void
  toastMessage: string | null
  showToast: (msg: string) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('olga_cart_items')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // fallback
      }
    }
    // Default initial mock items matching prototype
    return [
      { id: 'item-1', menu_item_id: 'default-1', name: 'Café Latte', price: 32000, icon: 'fa-mug-saucer', icon_bg_class: 'bg-amber-50', quantity: 2, notes: 'Hot, Less sugar' },
      { id: 'item-2', menu_item_id: 'default-2', name: 'Butter Croissant', price: 22000, icon: 'fa-bread-slice', icon_bg_class: 'bg-amber-50', quantity: 1, notes: 'Dipanaskan sebentar (warm)' },
      { id: 'item-3', menu_item_id: 'default-3', name: 'Chicken Pasta Alfredo', price: 48000, icon: 'fa-bowl-food', icon_bg_class: 'bg-amber-50', quantity: 1, notes: 'Extra cheese, cut cutlery please' }
    ]
  })

  const [discount, setDiscount] = useState(0)
  const [appliedPromo, setAppliedPromo] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('olga_cart_items', JSON.stringify(items))
  }, [items])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 2200)
  }

  const addToCart = (menuItem: MenuItem, notes?: string) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.menu_item_id === menuItem.id && (i.notes || '') === (notes || ''))
      if (existingIndex > -1) {
        const updated = [...prev]
        updated[existingIndex].quantity += 1
        return updated
      } else {
        return [
          ...prev,
          {
            id: 'cart-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            menu_item_id: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            icon: menuItem.icon,
            icon_bg_class: menuItem.icon_bg_class,
            quantity: 1,
            notes: notes || '',
          },
        ]
      }
    })
    showToast(`✓ ${menuItem.name} ditambahkan ke pesanan`)
  }

  const changeQuantity = (index: number, delta: number) => {
    setItems((prev) => {
      const updated = [...prev]
      const newQty = updated[index].quantity + delta
      if (newQty <= 0) {
        updated.splice(index, 1)
      } else {
        updated[index].quantity = newQty
      }
      return updated
    })
  }

  const updateNotes = (index: number, notes: string) => {
    setItems((prev) => {
      const updated = [...prev]
      updated[index].notes = notes
      return updated
    })
  }

  const removeFromCart = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const clearCart = () => {
    setItems([])
    setDiscount(0)
    setAppliedPromo('')
  }

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const deliveryFee = 8000
  const serviceFee = 2000
  const grandTotal = Math.max(0, subtotal + deliveryFee + serviceFee - discount)

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        changeQuantity,
        updateNotes,
        clearCart,
        totalCount,
        subtotal,
        deliveryFee,
        serviceFee,
        discount,
        setDiscount,
        grandTotal,
        appliedPromo,
        setAppliedPromo,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within a CartProvider')
  return context
}
