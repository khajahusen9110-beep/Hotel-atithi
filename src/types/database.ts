export type ProductType = 'food' | 'vegetable';

export interface Category {
  id: string;
  name: string;
  type: ProductType;
  icon?: string;
  sort_order?: number;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  type: ProductType;
  category_id?: string;
  image_url?: string;
  is_available: boolean;
  stock?: number;
  available_from?: string | null;
  available_until?: string | null;
  unit?: string;
  weight_grams?: number;
  calories?: number;
  is_veg?: boolean;
  prep_time_minutes?: number;
  created_at?: string;
  updated_at?: string;
  category?: Category;
}

export interface Address {
  id: string;
  customer_id: string;
  recipient_name?: string;
  phone: string;
  label: string;
  full_address: string;
  landmark?: string;
  city: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
  created_at?: string;
}

export interface AddressFormData {
  recipient_name: string;
  phone: string;
  label: string;
  full_address: string;
  landmark: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
}

export interface CartItem {
  id: string; // product id
  product: Product;
  quantity: number;
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type PaymentGateway = 'razorpay' | 'cod';

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id?: string;
  product_name?: string;
  price?: number;
  qty?: number;
  quantity?: number;
  total_price?: number;
  product?: Product;
}

export interface Review {
  id: string;
  order_id: string;
  customer_id: string;
  rating: number;
  comment?: string;
  created_at?: string;
}

export interface Order {
  id: string;
  order_number?: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_gateway: PaymentGateway;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  subtotal: number;
  discount_amount?: number;
  delivery_fee: number;
  tax_amount?: number;
  tax?: number;
  total_amount?: number;
  total?: number;
  tax_percent?: number;
  cooking_instructions?: string | null;
  delivery_instructions?: string | null;
  address_id?: string;
  created_at: string;
  updated_at?: string;
  items?: OrderItem[];
  order_items?: OrderItem[];
  address?: Address;
  review?: Review;
}

export interface Profile {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: 'customer' | 'admin';
  created_at?: string;
  updated_at?: string;
}

export interface Settings {
  id: string | boolean;
  is_store_open?: boolean;
  store_manually_closed?: boolean;
  store_closed_message?: string;
  opening_time?: string;
  closing_time?: string;
  announcement?: string;
  min_order_amount?: number;
  delivery_fee_base?: number;
  delivery_fee?: number;
  delivery_fee_per_km?: number;
  free_delivery_threshold?: number;
  free_delivery_above?: number;
  hotel_latitude?: number;
  hotel_longitude?: number;
  hotel_name?: string;
  hotel_address?: string;
  hotel_phone?: string;
  tax_percent?: number;
  max_delivery_distance_km?: number;
  created_at?: string;
  updated_at?: string;
}
