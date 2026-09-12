import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { customerApi, isLoggedIn as checkIsLoggedIn, TOKEN_KEY, USER_KEY } from '../api/client'

export interface CustomerUser {
  id: string
  name: string
  phone: string
  role?: string
}

interface CustomerAuthContextType {
  user: CustomerUser | null
  isLoggedIn: boolean
  showAuthModal: boolean
  openAuthModal: () => void
  closeAuthModal: () => void
  login: (phone: string, name?: string) => Promise<void>
  logout: () => void
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined)

function readStoredUser(): CustomerUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CustomerUser>
    if (!parsed?.phone) return null
    return {
      id: parsed.id ?? '',
      name: parsed.name ?? 'Pelanggan',
      phone: parsed.phone,
      role: parsed.role ?? 'customer',
    }
  } catch {
    return null
  }
}

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CustomerUser | null>(() => readStoredUser())
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => checkIsLoggedIn())
  const [showAuthModal, setShowAuthModal] = useState<boolean>(() => !checkIsLoggedIn())

  // Keep state in sync if local storage changes
  useEffect(() => {
    const loggedIn = checkIsLoggedIn()
    setIsLoggedIn(loggedIn)
    if (!loggedIn) {
      setUser(null)
      setShowAuthModal(true)
    } else {
      setUser(readStoredUser())
      setShowAuthModal(false)
    }
  }, [])

  const login = useCallback(async (phone: string, name?: string) => {
    const data = await customerApi.login(phone, name)
    if (data?.user) {
      setUser(data.user)
      setIsLoggedIn(true)
      setShowAuthModal(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
    setIsLoggedIn(false)
    setShowAuthModal(true)
  }, [])

  const openAuthModal = useCallback(() => {
    setShowAuthModal(true)
  }, [])

  const closeAuthModal = useCallback(() => {
    // Only permit closing if already authenticated
    if (checkIsLoggedIn()) {
      setShowAuthModal(false)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoggedIn,
      showAuthModal,
      openAuthModal,
      closeAuthModal,
      login,
      logout,
    }),
    [user, isLoggedIn, showAuthModal, openAuthModal, closeAuthModal, login, logout]
  )

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>
}

export const useCustomerAuth = () => {
  const ctx = useContext(CustomerAuthContext)
  if (!ctx) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider')
  }
  return ctx
}
