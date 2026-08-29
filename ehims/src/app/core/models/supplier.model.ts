export type PaymentTerms = 'COD' | 'Net7' | 'Net14' | 'Net30' | 'Net60';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque';

export interface Supplier {
  id: number;
  name: string;
  account_number?: string;
  bank_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_terms: PaymentTerms;
  credit_balance: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  synced: number;
}

export interface SupplierInput {
  name: string;
  account_number?: string;
  bank_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_terms?: PaymentTerms;
}

export interface SupplierPayment {
  id: number;
  supplier_id: number;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  recorded_by: number;
  recorded_by_name?: string; // joined
  payment_date: string;
  notes?: string;
  synced: number;
}

export interface SupplierCreditSummary {
  total_credit_purchases: number;
  total_payments: number;
  remaining_balance: number;
  current_balance: number;
}

export interface SupplierPaymentInput {
  supplier_id: number;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  recorded_by: number;
  notes?: string;
}
