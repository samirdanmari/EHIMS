export interface RegularCustomer {
  id: number;
  full_name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  credit_limit: number;
  outstanding_balance: number;
  is_active: number;
  total_orders?: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerPurchase {
  id: number;
  order_number: string;
  total_amount: number;
  payment_method: string;
  is_credit: number;
  credit_status: 'paid' | 'unpaid' | 'partial';
  created_at: string;
  completed_at?: string;
  status: string;
  cashier_name?: string;
  amount_paid: number;
  items: CustomerPurchaseItem[];
}

export interface CustomerPurchaseItem {
  id: number;
  menu_item_id: number;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
}

export interface CustomerPayment {
  id: number;
  customer_id: number;
  order_id?: number;
  amount: number;
  payment_method: string;
  reference?: string;
  recorded_by: number;
  recorded_by_name?: string;
  payment_date: string;
  notes?: string;
}

export interface CustomerDetails {
  customer: RegularCustomer;
  purchases: CustomerPurchase[];
  payments: CustomerPayment[];
}

export interface CustomerCreateInput {
  full_name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  credit_limit?: number;
}

export interface CustomerUpdateInput extends Partial<CustomerCreateInput> {
  id: number;
}

export interface CustomerPaymentInput {
  customer_id: number;
  order_id?: number;
  amount: number;
  payment_method: 'cash' | 'card' | 'transfer';
  reference?: string;
  recorded_by: number;
  notes?: string;
}

export interface CustomerSearchResult {
  id: number;
  full_name: string;
  phone?: string;
  outstanding_balance: number;
  credit_limit: number;
}
