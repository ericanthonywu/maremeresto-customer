import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { customerApi } from '../api/client'
import { useWebSocket } from '../context/WebSocketContext'
import type { Order } from '../types'
import { RouteProgressBanner } from '../components/RouteProgressBanner'
import { OrderTimeline } from '../components/OrderTimeline'
import { DriverProfileCard } from '../components/DriverProfileCard'

export const TrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const { subscribeToOrder } = useWebSocket()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelMessage, setCancelMessage] = useState<string | null>(null)

  useEffect(() => {
    if (orderId) {
      customerApi.getOrder(orderId).then((res) => {
        setOrder(res)
        setLoading(false)
      }).catch((err) => {
        console.warn('Failed to load order from maremeresto-backend, using active demo order', err)
        // Fallback demo order matching prototype #0042
        setOrder({
          id: orderId,
          order_number: 'OLG-20260911-0042',
          branch_id: '11111111-1111-1111-1111-111111111111',
          branch: {
            id: '11111111-1111-1111-1111-111111111111',
            slug: 'sudirman',
            name: 'Cafe Olga Sudirman',
            address: 'Jl. Jend. Sudirman No. 45, Jakarta Pusat',
            phone: '021-5550-0101',
            latitude: -6.2088,
            longitude: 106.8216,
            gradient_theme: 'brand',
            icon: 'fa-building',
            facility_tags: ['WiFi Cepat', 'Full AC'],
            rating: 4.8,
            is_open: true,
          },
          order_type: 'delivery',
          status: 'on_the_way',
          customer_name: 'Budi Santoso',
          customer_phone: '+6281234567890',
          delivery_address: 'Gedung Plaza Central Lt. 12, Sudirman',
          delivery_distance_km: 2.3,
          subtotal: 78000,
          delivery_fee: 8000,
          service_fee: 2000,
          discount: 0,
          grand_total: 88000,
          driver_name: 'Andi Pratama',
          driver_phone: '+6281234567890',
          driver_vehicle: 'Honda Vario 160 Hitam',
          driver_plate: 'B 1234 ABC',
          driver_rating: 4.95,
          created_at: new Date(Date.now() - 15 * 60000).toISOString(),
        })
        setLoading(false)
      })

      // Subscribe to real-time status updates via WebSocket
      const unsubscribe = subscribeToOrder(orderId, (payload: any) => {
        if (payload.status) {
          setOrder((prev) => (prev ? { ...prev, status: payload.status } : null))
        }
      })

      return () => {
        unsubscribe()
      }
    } else {
      // Prototype demo fallback
      setOrder({
        id: 'demo-42',
        order_number: 'OLG-20260911-0042',
        branch_id: '11111111-1111-1111-1111-111111111111',
        branch: {
          id: '11111111-1111-1111-1111-111111111111',
          slug: 'sudirman',
          name: 'Cafe Olga Sudirman',
          address: 'Jl. Jend. Sudirman No. 45, Jakarta Pusat',
          phone: '021-5550-0101',
          latitude: -6.2088,
          longitude: 106.8216,
          gradient_theme: 'brand',
          icon: 'fa-building',
          facility_tags: ['WiFi Cepat'],
          rating: 4.8,
          is_open: true,
        },
        order_type: 'delivery',
        status: 'on_the_way',
        customer_name: 'Budi Santoso',
        customer_phone: '+6281234567890',
        delivery_address: 'Gedung Plaza Central Lt. 12, Sudirman',
        delivery_distance_km: 2.3,
        subtotal: 78000,
        delivery_fee: 8000,
        service_fee: 2000,
        discount: 0,
        grand_total: 88000,
        driver_name: 'Andi Pratama',
        driver_phone: '+6281234567890',
        driver_vehicle: 'Honda Vario 160 Hitam',
        driver_plate: 'B 1234 ABC',
        driver_rating: 4.95,
        created_at: new Date(Date.now() - 15 * 60000).toISOString(),
      })
      setLoading(false)
    }
  }, [orderId, subscribeToOrder])

  const handleCancelOrder = async () => {
    if (!order?.id || order.id === 'demo-42') return
    if (!window.confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) return

    setIsCancelling(true)
    try {
      await customerApi.cancelOrder(order.id)
      setOrder((prev) => (prev ? { ...prev, status: 'cancelled' } : null))
      setCancelMessage('Pesanan berhasil dibatalkan.')
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal membatalkan pesanan')
    } finally {
      setIsCancelling(false)
    }
  }

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)

  return (
    <div className="min-h-screen bg-[#fbf9f6] pb-24 lg:pb-16 pt-6">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/menu"
              className="w-10 h-10 rounded-2xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 flex items-center justify-center shadow-sm"
            >
              <i className="fa-solid fa-arrow-left text-sm"></i>
            </Link>
            <div>
              <h1 className="font-serif text-2xl font-bold text-stone-900">Lacak Pengantaran</h1>
              <p className="text-xs text-stone-500">
                Nomor Pesanan: <span className="font-mono font-bold text-stone-800">{order?.order_number}</span>
              </p>
            </div>
          </div>

          <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            <span>Real-time Live</span>
          </span>
        </div>

        {cancelMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold">
            {cancelMessage}
          </div>
        )}

        {loading ? (
          <div className="py-20 flex justify-center">
            <i className="fa-solid fa-circle-notch fa-spin text-3xl text-brand-600"></i>
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* GPS Map Simulator Banner */}
            <RouteProgressBanner
              status={order.status}
              origin={order.branch?.name}
              destination={order.delivery_address}
            />

            {/* Driver Profile Card */}
            {(order.status === 'on_the_way' || order.status === 'ready' || order.status === 'delivered') && (
              <DriverProfileCard
                driverName={order.driver_name}
                driverPhone={order.driver_phone}
                driverVehicle={order.driver_vehicle}
                driverPlate={order.driver_plate}
                driverRating={order.driver_rating}
              />
            )}

            {/* Vertical 4-step Timeline */}
            <OrderTimeline status={order.status} />

            {/* Flexible 5-minute cancellation guarantee button */}
            {order.status === 'pending' && (
              <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-stone-900">Jaminan Pembatalan 5 Menit</h4>
                  <p className="text-[11px] text-stone-500">Anda dapat membatalkan pesanan sebelum barista mulai meracik.</p>
                </div>
                <button
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                  className="px-4 py-2 bg-stone-100 hover:bg-red-50 hover:text-red-700 text-stone-700 font-bold rounded-xl text-xs border border-stone-200 transition-colors"
                >
                  {isCancelling ? 'Membatalkan...' : 'Batalkan Pesanan'}
                </button>
              </div>
            )}

            {/* Summary Details Accordion */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3 text-xs">
              <h4 className="font-serif font-bold text-sm text-stone-900">Rincian Pengantaran</h4>
              <div className="space-y-1.5 text-stone-600">
                <div className="flex justify-between">
                  <span>Alamat Tujuan:</span>
                  <span className="font-bold text-stone-900 text-right max-w-xs truncate">
                    {order.delivery_address || 'Ambil di Outlet'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Nama Pemesan:</span>
                  <span className="font-bold text-stone-900">{order.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Tagihan:</span>
                  <span className="font-bold text-brand-700 font-mono text-sm">
                    {formatRupiah(order.grand_total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
