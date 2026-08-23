export interface Shift {
  id: number;
  user_id: number;
  start_time: string;
  end_time?: string;
  opening_balance: number;
  closing_balance?: number;
  actual_balance?: number;
  variance?: number;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  synced: number;
}

export interface ShiftHandover {
  id: number;
  from_user_id: number;
  to_user_id: number;
  shift_id: number;
  amount_handed_over: number;
  notes?: string;
  handover_time: string;
  created_at: string;
  updated_at: string;
  synced: number;
}

export interface EodReport {
  id: number;
  report_date: string;
  generated_by: number;
  total_sales: number;
  cash_sales: number;
  pos_sales: number;
  transfer_sales: number;
  total_expenses: number;
  net_cash: number;
  created_at: string;
  updated_at: string;
  synced: number;
}
