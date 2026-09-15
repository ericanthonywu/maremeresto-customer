import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LocationProvider } from './context/LocationContext'
import { BranchProvider } from './context/BranchContext'
import { CartProvider } from './context/CartContext'
import { WebSocketProvider } from './context/WebSocketContext'
import { CustomerAuthProvider } from './context/CustomerAuthContext'
import { AppHeader } from './components/AppHeader'
import { MobileBottomNav } from './components/MobileBottomNav'
import { CustomerAuthModal } from './components/CustomerAuthModal'

import { lazy, Suspense } from 'react'

const SelectBranchPage = lazy(() => import('./pages/SelectBranchPage').then((m) => ({ default: m.SelectBranchPage })))
const MenuPage = lazy(() => import('./pages/MenuPage').then((m) => ({ default: m.MenuPage })))
const CartPage = lazy(() => import('./pages/CartPage').then((m) => ({ default: m.CartPage })))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })))
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage').then((m) => ({ default: m.OrderSuccessPage })))
const TrackingPage = lazy(() => import('./pages/TrackingPage').then((m) => ({ default: m.TrackingPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      {/* LocationProvider wraps BranchProvider: delivery quotes are derived
          from the customer's location, so it must resolve first. */}
      <CustomerAuthProvider>
        <LocationProvider>
          <BranchProvider>
            <CartProvider>
              <WebSocketProvider>
                <BrowserRouter>
                  <div className="min-h-screen bg-brand-50/40 text-stone-800 font-sans flex flex-col selection:bg-brand-500 selection:text-white transition-colors duration-300">
                    <AppHeader />

                    <main className="flex-1">
                      <Suspense
                        fallback={
                          <div className="py-20 flex justify-center items-center min-h-[50vh]">
                            <i className="fa-solid fa-circle-notch fa-spin text-3xl text-brand-600" aria-hidden="true"></i>
                            <span className="sr-only">Memuat...</span>
                          </div>
                        }
                      >
                        <Routes>
                          <Route path="/" element={<Navigate to="/branches" replace />} />
                          <Route path="/branches" element={<SelectBranchPage />} />
                          <Route path="/menu" element={<MenuPage />} />
                          <Route path="/cart" element={<CartPage />} />
                          <Route path="/checkout" element={<CheckoutPage />} />
                          <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
                          <Route path="/tracking" element={<TrackingPage />} />
                          <Route path="/tracking/:orderId" element={<TrackingPage />} />
                          <Route path="*" element={<Navigate to="/branches" replace />} />
                        </Routes>
                      </Suspense>
                    </main>

                    <MobileBottomNav />

                    {/* Authenticate customer phone when opening the app */}
                    <CustomerAuthModal />
                  </div>
                </BrowserRouter>
              </WebSocketProvider>
            </CartProvider>
          </BranchProvider>
        </LocationProvider>
      </CustomerAuthProvider>
    </QueryClientProvider>
  )
}

export default App
