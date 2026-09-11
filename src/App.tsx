import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LocationProvider } from './context/LocationContext'
import { BranchProvider } from './context/BranchContext'
import { CartProvider } from './context/CartContext'
import { WebSocketProvider } from './context/WebSocketContext'
import { AppHeader } from './components/AppHeader'
import { MobileBottomNav } from './components/MobileBottomNav'

import { SelectBranchPage } from './pages/SelectBranchPage'
import { MenuPage } from './pages/MenuPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { OrderSuccessPage } from './pages/OrderSuccessPage'
import { TrackingPage } from './pages/TrackingPage'

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
      <LocationProvider>
        <BranchProvider>
          <CartProvider>
            <WebSocketProvider>
              <BrowserRouter>
                <div className="min-h-screen bg-[#fbf9f6] text-stone-800 font-sans flex flex-col selection:bg-brand-500 selection:text-white">
                  <AppHeader />

                  <main className="flex-1">
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
                  </main>

                  <MobileBottomNav />
                </div>
              </BrowserRouter>
            </WebSocketProvider>
          </CartProvider>
        </BranchProvider>
      </LocationProvider>
    </QueryClientProvider>
  )
}

export default App
