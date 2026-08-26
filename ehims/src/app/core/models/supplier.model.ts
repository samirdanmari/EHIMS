export type PaymentTerms = 'COD' | 'Net7' | 'Net14' | 'Net30' | 'Net60';

export interface Supplier {
  id: number;
  name: string;
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

export interface SupplierPayment {
  id: number;
  supplier_id: number;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'cheque';
  reference_number?: string;
  recorded_by: number;
  payment_date: string;
  notes?: string;
  synced: number;
}
