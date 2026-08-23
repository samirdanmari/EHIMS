export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: number;
  category_id: number;
  name: string;
  description?: string;
  sku?: string;
  unit: string;
  unit_price: number;
  reorder_level: number;
  current_stock: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  synced: number;
}

export interface PurchaseEntry {
  id: number;
  supplier_id: number;
  invoice_number?: string;
  purchase_date: string;
  total_amount: number;
  payment_status: 'pending' | 'partial' | 'paid';
  created_by: number;
  created_at: string;
  updated_at: string;
  synced: number;
}

export interface StockIssuance {
  id: number;
  issued_to: number;
  issue_date: string;
  department: string;
  remarks?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  synced: number;
}

export interface StockIssuanceItem {
  id: number;
  issuance_id: number;
  item_id: number;
  quantity: number;
}
