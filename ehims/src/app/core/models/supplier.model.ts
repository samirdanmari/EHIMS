export type PaymentTerms = 'cash_on_delivery' | 'net_15' | 'net_30' | 'net_60';

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_terms?: PaymentTerms;
  is_active: number;
  created_at: string;
  updated_at: string;
  synced: number;
}

export interface SupplierPayment {
  id: number;
  supplier_id: number;
  purchase_id?: number;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'transfer' | 'cheque';
  reference_number?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  synced: number;
}
