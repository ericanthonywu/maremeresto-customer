export interface Branch {
  id: string
  slug: string
  name: string
  address: string
  phone: string
  latitude: number
  longitude: number
  gradient_theme: 'brand' | 'emerald' | 'indigo'
  icon: string
  facility_tags: string[]
  rating: number
  is_open: boolean
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
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'on_the_way' | 'delivered' | 'completed' | 'rejected' | 'cancelled'
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
  driver_name?: string
  driver_phone?: string
  driver_vehicle?: string
  driver_plate?: string
  driver_rating?: number
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
