export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'pos' | 'transfer' | 'split';

export interface MenuItem {
  id: number;
  category_id: number;
  name: string;
  description?: string;
  price: number;
  is_available: number;
  image_path?: string;
  created_at: string;
  updated_at: string;
  synced: number;
}

export interface Order {
  id: number;
  order_number: string;
  table_id?: number;
  waiter_id: number;
  status: OrderStatus;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_method?: PaymentMethod;
  payment_status: 'unpaid' | 'paid';
  created_at: string;
  updated_at: string;
  synced: number;
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
}
