export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'served'
  | 'completed'
  | 'voided';
export type OrderItemStatus = 'pending' | 'preparing' | 'served' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'split';

export interface MenuItem {
  id: number;
  name: string;
  category_id: number | null;
  category_name?: string; // joined
  selling_price: number;
  inventory_item_id: number | null;
  inventory_name?: string; // joined
  current_stock?: number; // joined from inventory
  is_available: number;
  image_path?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  synced: number;
}

export interface MenuItemInput {
  name: string;
  category_id: number | null;
  selling_price: number;
  inventory_item_id: number | null;
  inventory_item_ids?: number[]; // Multiple items (new feature)
  description?: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  menu_item_name?: string; // joined
  image_path?: string; // joined
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  status: OrderItemStatus;
  synced: number;
}

export interface OrderItemInput {
  menu_item_id: number;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: number;
  order_number: string;
  shift_id: number;
  shift_name?: string; // joined
  cashier_id: number;
  cashier_name?: string; // joined
  waiter_id?: number;
  waiter_name?: string; // joined
  table_number?: string;
  subtotal: number;
  discount_amount: number;
  discount_reason?: string;
  discount_approved_by?: number;
  tax_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  void_reason?: string;
  void_approved_by?: number;
  item_count?: number; // joined aggregate
  created_at: string;
  completed_at?: string;
  synced: number;
}

export interface OrderCreateInput {
  shift_id: number;
  cashier_id: number;
  waiter_id?: number;
  table_number?: string;
  items: OrderItemInput[];
  discount_amount?: number;
  discount_reason?: string;
  tax_amount?: number;
  payment_method?: PaymentMethod;
  customer_id?: number;
  is_credit?: boolean;
  notes?: string;
}

export interface OrderWithItems extends Order {
  items?: OrderItem[];
}

export interface TaxRate {
  name: string;
  percentage: number;
}

/** Cart item during order creation (before persisting to DB) */
export interface CartItem {
  menu_item_id: number;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
}
