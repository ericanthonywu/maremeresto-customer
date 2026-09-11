import axios from 'axios'
import type { Branch, Category, MenuItem, Order, Payment } from '../types'

export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to headers if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('olga_customer_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * Normalizes user input phone number strictly to "+628..." format
 * Supports inputs like "081234567890", "6281234567890", "+62 812-3456-7890"
 */
export function normalizePhone(rawPhone: string): { valid: boolean; normalized: string; error?: string } {
  let cleaned = rawPhone.trim().replace(/[\s\-()]/g, '')

  if (cleaned.startsWith('+62')) {
    cleaned = cleaned.substring(3)
  } else if (cleaned.startsWith('62')) {
    cleaned = cleaned.substring(2)
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }

  // Must start with 8 and have 8 to 12 subsequent digits (total 9-13 digits)
  const regex = /^8[1-9][0-9]{7,11}$/
  if (!regex.test(cleaned)) {
    return {
      valid: false,
      normalized: '',
      error: 'Nomor telepon harus diawali 08/628 dan memiliki 10-14 digit valid.',
    }
  }

  return {
    valid: true,
    normalized: '+62' + cleaned,
  }
}

export const customerApi = {
  // Auth
  login: async (phone: string, name?: string) => {
    const res = await api.post('/auth/customer-login', { phone, name })
    if (res.data?.data?.token) {
      localStorage.setItem('olga_customer_token', res.data.data.token)
      localStorage.setItem('olga_customer_user', JSON.stringify(res.data.data.user))
    }
    return res.data.data
  },

  // Branches
  getBranches: async (): Promise<Branch[]> => {
    const res = await api.get('/branches')
    return res.data.data
  },

  getBranch: async (slug: string): Promise<Branch> => {
    const res = await api.get(`/branches/${slug}`)
    return res.data.data
  },

  // Categories & Menu
  getCategories: async (): Promise<Category[]> => {
    const res = await api.get('/categories')
    return res.data.data
  },

  getMenuByBranch: async (branchSlugOrId: string): Promise<MenuItem[]> => {
    const res = await api.get(`/branches/${branchSlugOrId}/menu`)
    return res.data.data
  },

  // Promo
  validatePromo: async (code: string, subtotal: number, deliveryFee: number) => {
    const res = await api.post('/promos/validate', {
      code,
      subtotal,
      delivery_fee: deliveryFee,
    })
    return res.data.data
  },

  // Orders
  createOrder: async (orderData: any): Promise<Order> => {
    const res = await api.post('/orders', orderData)
    return res.data.data
  },

  getOrder: async (id: string): Promise<Order> => {
    const res = await api.get(`/orders/${id}`)
    return res.data.data
  },

  cancelOrder: async (id: string) => {
    const res = await api.post(`/orders/${id}/cancel`)
    return res.data
  },

  // Payments (Midtrans Snap)
  createPayment: async (orderId: string, paymentMethod: string, idempotencyKey: string): Promise<Payment> => {
    const res = await api.post(
      '/payments',
      {
        order_id: orderId,
        payment_method: paymentMethod,
        idempotency_key: idempotencyKey,
      },
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      }
    )
    return res.data.data
  },
}
