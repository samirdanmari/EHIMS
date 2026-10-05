export type CategoryType = 'inventory' | 'menu' | 'both';

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
  description?: string;
  created_at: string;
  synced: number;
}

export interface InventoryItem {
  id: number;
  name: string;
  category_id: number | null;
  category_name?: string; // joined field from inventory:list-items
  unit: string;
  cost_price: number;
  opening_stock: number;
  current_stock: number;
  low_stock_threshold: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  synced: number;
}

export type PaymentMethod = 'cash' | 'credit' | 'bank_transfer' | 'cheque';

export interface PurchaseEntry {
  id: number;
  supplier_id: number | null;
  item_id: number;
  item_name?: string; // joined
  item_unit?: string; // joined
  supplier_name?: string; // joined
  received_by_name?: string; // joined
  quantity: number;
  unit_cost: number;
  total_cost: number;
  payment_method: PaymentMethod;
  is_credit: number;
  received_by: number;
  purchase_date: string;
  notes?: string;
  synced: number;
}

/** Line item used when submitting a new purchase entry. */
export interface PurchaseLineInput {
  item_id: number;
  quantity: number;
  unit_cost: number;
}

export interface StockIssuance {
  id: number;
  shift_id: number;
  shift_name?: string; // joined
  issued_by: number;
  issued_by_name?: string; // joined
  received_by: number;
  received_by_name?: string; // joined
  issued_at: string;
  notes?: string;
  item_count?: number; // joined aggregate
  total_cost?: number; // joined aggregate
  synced: number;
}

export interface StockIssuanceItem {
  id: number;
  issuance_id: number;
  item_id: number;
  item_name?: string; // joined
  item_unit?: string; // joined
  quantity: number;
  unit_cost: number;
  total_cost: number;
  synced: number;
}

/** Line item used when submitting a new stock issuance. */
export interface IssuanceLineInput {
  item_id: number;
  quantity: number;
}

export interface StockAuditRow {
  item_id: number;
  name: string;
  unit: string;
  category_name?: string;
  low_stock_threshold: number;
  opening: number;
  purchased: number;
  issued: number;
  deal_received: number;
  deal_issued: number;
  closing: number;
}

export type HotDealDirection = 'in' | 'out';
export type HotDealPaymentMethod = 'cash' | 'bank_transfer' | 'credit';

export interface HotDeal {
  id: number;
  partner_name: string;
  direction: HotDealDirection;
  payment_method: HotDealPaymentMethod;
  recorded_by: number;
  recorded_by_name?: string;
  created_at: string;
  notes?: string;
  item_count: number;
  total_amount: number;
  discount_amount: number;
}

export interface HotDealItem {
  id: number;
  deal_id: number;
  item_id: number;
  item_name?: string;
  item_unit?: string;
  quantity: number;
  regular_unit_rate: number;
  deal_unit_rate: number;
  discount_amount: number;
  total_amount: number;
}

export interface HotDealLineInput {
  item_id: number;
  quantity: number;
  regular_unit_rate: number;
  deal_unit_rate: number;
}

export interface ActiveShift {
  id: number;
  shift_name: string;
  user_id: number;
  user_name?: string; // joined
  start_time: string;
  status: 'active' | 'closed';
}
