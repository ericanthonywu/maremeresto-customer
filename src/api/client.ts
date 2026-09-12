import axios from 'axios'
import type {
  Branch,
  Category,
  DeliveryQuote,
  GeocodeResult,
  MenuItem,
  Order,
  Payment,
  PaymentStatus,
} from '../types'

export const TOKEN_KEY = 'olga_customer_token'
export const USER_KEY = 'olga_customer_user'

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// A rejected token means the 30-day session lapsed. Clear it so the next
// checkout re-authenticates instead of retrying with a dead credential.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }
    return Promise.reject(error)
  }
)

/**
 * Pulls a human-readable message out of an axios error. The API always answers
 * with { success: false, error: "..." }; anything else is a transport failure.
 */
export function errorMessage(err: unknown, fallback = 'Terjadi kesalahan. Silakan coba lagi.'): string {
  if (axios.isAxiosError(err)) {
    const apiError = err.response?.data?.error
    if (typeof apiError === 'string' && apiError.trim()) return apiError
    if (err.code === 'ECONNABORTED') return 'Koneksi timeout. Periksa jaringan Anda dan coba lagi.'
    if (!err.response) return 'Tidak dapat menghubungi server. Periksa koneksi internet Anda.'
  }
  return fallback
}

export function isLoggedIn(): boolean {
  return Boolean(localStorage.getItem(TOKEN_KEY))
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/**
 * Normalizes user input strictly to "+628..." format.
 * Accepts "081234567890", "6281234567890", "+62 812-3456-7890".
 * Mirrors dto.NormalizeIndonesianPhone on the server, which re-validates.
 */
export function normalizePhone(rawPhone: string): { valid: boolean; normalized: string; error?: string } {
  let cleaned = rawPhone.trim().replace(/[\s\-().]/g, '')

  if (cleaned.startsWith('+62')) {
    cleaned = cleaned.substring(3)
  } else if (cleaned.startsWith('62')) {
    cleaned = cleaned.substring(2)
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }

  if (!/^8[1-9][0-9]{7,11}$/.test(cleaned)) {
    return {
      valid: false,
      normalized: '',
      error: 'WhatsApp harus diawali 08 atau +628 dan terdiri dari 10-14 digit.',
    }
  }

  return { valid: true, normalized: '+62' + cleaned }
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

export interface CreateOrderPayload {
  branch_id: string
  order_type: 'delivery' | 'pickup' | 'scheduled'
  customer_name: string
  customer_phone: string
  delivery_address: string
  delivery_notes: string
  delivery_lat: number | null
  delivery_lon: number | null
  promo_code: string
  scheduled_at: string | null
  items: Array<{ menu_item_id: string; quantity: number; notes: string }>
}

export const customerApi = {
  // ---- Auth -------------------------------------------------------------
  login: async (phone: string, name: string) => {
    const res = await api.post('/auth/customer-login', { phone, name })
    const data = res.data.data
    if (data?.token) {
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    }
    return data
  },

  updateProfile: async (name: string, phone: string) => {
    const res = await api.put('/auth/customer-profile', { name, phone })
    const data = res.data.data
    if (data?.token) {
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    }
    return data
  },

  // ---- Branches & menu --------------------------------------------------
  getBranches: async (): Promise<Branch[]> => {
    const res = await api.get('/branches')
    return res.data.data ?? []
  },

  getBranch: async (slug: string): Promise<Branch> => {
    const res = await api.get(`/branches/${slug}`)
    return res.data.data
  },

  getCategories: async (): Promise<Category[]> => {
    const res = await api.get('/categories')
    return res.data.data ?? []
  },

  getMenuByBranch: async (branchSlugOrId: string): Promise<MenuItem[]> => {
    const res = await api.get(`/branches/${branchSlugOrId}/menu`)
    return res.data.data ?? []
  },

  // ---- Location & delivery pricing -------------------------------------
  /**
   * Prices delivery from every outlet to a coordinate. The backend is the only
   * place the fee is computed, so the figure shown here is the figure charged.
   */
  quoteDelivery: async (
    lat: number,
    lon: number,
    subtotal: number,
    orderType: 'delivery' | 'pickup' | 'scheduled' = 'delivery'
  ): Promise<DeliveryQuote> => {
    const res = await api.post('/delivery/quote', {
      lat,
      lon,
      subtotal,
      order_type: orderType,
    })
    return res.data.data
  },

  searchAddress: async (query: string, signal?: AbortSignal): Promise<GeocodeResult[]> => {
    const res = await api.get('/geocode/search', { params: { q: query }, signal })
    return res.data.data ?? []
  },

  reverseGeocode: async (lat: number, lon: number): Promise<GeocodeResult> => {
    const res = await api.get('/geocode/reverse', { params: { lat, lon } })
    return res.data.data
  },

  // ---- Promo ------------------------------------------------------------
  validatePromo: async (code: string, subtotal: number, deliveryFee: number) => {
    const res = await api.post('/promos/validate', {
      code,
      subtotal,
      delivery_fee: deliveryFee,
    })
    return res.data.data as {
      code: string
      discount_amount: number
      final_total: number
      message: string
    }
  },

  // ---- Orders -----------------------------------------------------------
  createOrder: async (orderData: CreateOrderPayload): Promise<Order> => {
    const res = await api.post('/orders', orderData)
    return res.data.data
  },

  getOrder: async (id: string): Promise<Order> => {
    const res = await api.get(`/orders/${id}`)
    return res.data.data
  },

  getMyOrders: async (limit = 20): Promise<{ orders: Order[]; total: number }> => {
    const res = await api.get('/orders', { params: { limit } })
    return { orders: res.data.data ?? [], total: res.data.total ?? 0 }
  },

  cancelOrder: async (id: string): Promise<Order> => {
    const res = await api.post(`/orders/${id}/cancel`)
    return res.data.data
  },

  submitFeedback: async (id: string, rating: number, comment: string) => {
    const res = await api.put(`/orders/${id}/feedback`, { rating, comment })
    return res.data.data as NonNullable<Order['feedback']>
  },

  // ---- Payments ---------------------------------------------------------
  /**
   * Opens a Midtrans Snap session. The caller MUST send the customer to
   * snap_redirect_url; returning without doing so leaves the order unpaid.
   */
  createPayment: async (
    orderId: string,
    paymentMethod: string,
    idempotencyKey: string
  ): Promise<Payment> => {
    const res = await api.post(
      '/payments',
      { order_id: orderId, payment_method: paymentMethod, idempotency_key: idempotencyKey },
      { headers: { 'Idempotency-Key': idempotencyKey } }
    )
    return res.data.data
  },

  getPaymentStatus: async (orderId: string): Promise<PaymentStatus> => {
    const res = await api.get(`/orders/${orderId}/payment`)
    return res.data.data
  },
}
