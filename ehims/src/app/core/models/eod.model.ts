export interface EODReport {
  id: number;
  report_date: string;
  total_sales: number;
  total_cogs: number;
  gross_profit: number;
  total_discounts: number;
  total_voids: number;
  net_profit: number;
  total_orders: number;
  total_purchases: number;
  cash_collected: number;
  card_collected: number;
  transfer_collected: number;
  low_stock_items?: string; // comma-separated
  generated_by: number;
  generated_by_name?: string; // joined
  generated_at: string;
  notes?: string;
}

export interface ShiftHandover {
  id: number;
  shift_id: number;
  outgoing_user: number;
  outgoing_user_name?: string; // joined
  incoming_user?: number;
  incoming_user_name?: string; // joined
  drawer_cash: number;
  expected_cash: number;
  variance: number;
  stock_verified: number;
  outgoing_signature?: string;
  incoming_signature?: string;
  handover_at: string;
  notes?: string;
  synced: number;
}

export interface ShiftCloseInput {
  shift_id: number;
  drawer_cash: number;
  expected_cash?: number;
  stock_verified?: boolean;
  notes?: string;
  outgoing_user: number;
  incoming_user?: number;
}

export interface EODSummary {
  date: string;
  totalSales: number;
  totalCOGS: number;
  grossProfit: number;
  totalDiscounts: number;
  totalVoids: number;
  netProfit: number;
  totalOrders: number;
  totalPurchases: number;
  cashCollected: number;
  cardCollected: number;
  transferCollected: number;
  variance: number;
}
