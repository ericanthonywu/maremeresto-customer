export interface Branch {
  id: string
  slug: string
  name: string
  address: string
  phone: string
  latitude: number
  longitude: number
  gradient_theme: 'brand' | 'emerald' | 'indigo' | 'shopee' | 'gojek' | 'gopay'
  icon: string
  facility_tags: string[]
  rating: number
  /** Manual master switch set by staff. */
  is_open: boolean
  /** Derived server-side from is_open AND today's operating hours. Trust this. */
  is_open_now: boolean
  /** Today's schedule, e.g. "08.00–22.00". Empty when none is configured. */
  today_hours?: string
  whatsapp_number?: string
  halal_certificate_id?: string
}

export interface Category {
  id: string
  name: string
  slug: string
  emoji: string
  sort_order: number
}

export interface MenuItem {
  id: string
  branch_id: string
  category_id: string
  category?: Category
  name: string
  description: string
  price: number
  icon: string
  icon_bg_class: string
  image_url?: string
  tag?: string
  is_available: boolean
  sort_order: number
}

export interface CartItem {
  id: string
  menu_item_id: string
  name: string
  price: number
  icon: string
  icon_bg_class: string
  quantity: number
  notes?: string
}

export interface Order {
  id: string
  order_number: string
  branch_id: string
  branch?: Branch
  order_type: 'delivery' | 'pickup' | 'scheduled'
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'on_the_way' | 'picked_up' | 'delivered' | 'completed' | 'rejected' | 'cancelled'
  customer_name: string
  customer_phone: string
  delivery_address?: string
  delivery_notes?: string
  delivery_distance_km: number
  subtotal: number
  delivery_fee: number
  service_fee: number
  discount: number
  grand_total: number
  promo_code?: string
  scheduled_at?: string
  rejection_reason?: string
  feedback?: {
    rating: number
    comment?: string
    created_at: string
    updated_at: string
  }
  version: number
  items?: OrderItem[]
  payment?: Payment
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  item_name: string
  item_price: number
  item_icon: string
  quantity: number
  notes?: string
  line_total: number
}

export interface Payment {
  id: string
  order_id: string
  payment_method: 'qris' | 'gopay' | 'shopeepay'
  status: 'pending' | 'settlement' | 'expire' | 'cancel'
  amount: number
  snap_token?: string
  snap_redirect_url?: string
  qr_string?: string
}

/** One branch's live delivery quote, priced entirely by the backend. */
export interface BranchDeliveryQuote {
  branch_id: string
  branch_slug: string
  branch_name: string
  distance_km: number
  distance_meters: number
  delivery_fee: number
  service_fee: number
  min_order_amount: number
  eta_minutes: number
  max_radius_km: number
  within_radius: boolean
  free_delivery_from: number
  is_open_now: boolean
  is_nearest: boolean
}

export interface DeliveryQuote {
  quotes: BranchDeliveryQuote[]
  nearest_branch_id?: string
}

export interface GeocodeResult {
  label: string
  full_address: string
  latitude: number
  longitude: number
  postcode?: string
}

/**
 * How the customer's delivery point was established. The UI must be able to
 * say so, because a guessed location silently mispriced delivery before.
 */
export type LocationSource = 'gps' | 'search' | 'manual'

export interface UserLocation {
  lat: number
  lon: number
  address: string
  source: LocationSource
  /** Epoch ms when the fix was taken, so a stale GPS position can be refreshed. */
  capturedAt: number
}

export interface PaymentStatus {
  order_status: Order['status']
  payment_status: Payment['status']
  expires_at: string
  paid_at?: string | null
  redirect_url?: string | null
  snap_token?: string | null
}
