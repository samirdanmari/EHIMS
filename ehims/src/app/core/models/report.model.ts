export interface SalesMetrics {
  date: string;
  total_orders: number;
  total_sales: number;
  total_discounts: number;
  total_voids: number;
  net_sales: number;
  cash_collected: number;
  card_collected: number;
  transfer_collected: number;
  debt_clear: number;
}

export interface SalesTrend {
  period: string;
  sales: number;
  orders: number;
  average_order_value: number;
  growth_percent?: number;
}

export interface SalesItem {
  date: string;
  item_name: string;
  quantity: number;
  sales: number;
}

export interface InventoryMovement {
  item_id: number;
  item_name: string;
  category: string;
  opening_stock: number;
  purchases: number;
  issued: number;
  closing_stock: number;
  valuation: number;
}

export interface InventoryAlert {
  item_id: number;
  item_name: string;
  current_stock: number;
  low_stock_threshold: number;
  status: 'critical' | 'warning' | 'ok';
}

export interface SupplierMetrics {
  supplier_id: number;
  supplier_name: string;
  total_purchases: number;
  total_payments: number;
  credit_balance: number;
  on_time_rate: number;
  average_delivery_days: number;
}

export interface StaffMetrics {
  user_id: number;
  user_name: string;
  role: string;
  orders_created: number;
  total_sales: number;
  average_order_value: number;
  discounts_applied: number;
  orders_voided: number;
}

export interface ProfitLossStatement {
  period: string;
  total_revenue: number;
  gross_sales: number;
  net_sales: number;
  tax_collected: number;
  total_orders: number;
  total_cogs: number;
  gross_profit: number;
  total_discounts: number;
  total_purchases: number;
  total_issued_cost: number;
  total_operating_expenses: number;
  net_profit: number;
  profit_margin: number;
  items: ProfitLossInventoryItem[];
}

export interface ProfitLossInventoryItem {
  item_id: number;
  name: string;
  unit: string;
  purchased_quantity: number;
  purchase_cost: number;
  sold_quantity: number;
  sold_cost: number;
  issued_quantity: number;
  issued_cost: number;
}

export interface DashboardSummary {
  today_sales: number;
  today_orders: number;
  this_week_sales: number;
  this_month_sales: number;
  low_stock_items: number;
  pending_supplier_payments: number;
  top_selling_items: Array<{ name: string; quantity: number; sales: number }>;
  top_staff: Array<{ name: string; orders: number; sales: number }>;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    fill?: boolean;
  }>;
}
