import { Injectable, inject } from '@angular/core';
import { ElectronService } from '../../../core/services/electron.service';
import {
  Supplier,
  SupplierInput,
  SupplierPayment,
  SupplierCreditSummary,
  SupplierPaymentInput,
} from '../../../core/models/supplier.model';

interface ListSuppliersResponse {
  success: boolean;
  suppliers: Supplier[];
  error?: string;
}
interface SupplierResponse {
  success: boolean;
  supplier?: Supplier;
  error?: string;
}
interface DeleteResponse {
  success: boolean;
  error?: string;
}
interface PaymentResponse {
  success: boolean;
  payment?: SupplierPayment;
  error?: string;
}
interface PaymentHistoryResponse {
  success: boolean;
  payments: SupplierPayment[];
  error?: string;
}
interface CreditSummaryResponse {
  success: boolean;
  credit_summary?: SupplierCreditSummary;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class SupplierService {
  private electronService = inject(ElectronService);

  listSuppliers(
    params: { search?: string; includeInactive?: boolean } = {},
  ): Promise<ListSuppliersResponse> {
    return this.electronService.invoke<ListSuppliersResponse>(
      'supplier:list',
      params,
    );
  }

  getSupplier(id: number): Promise<SupplierResponse> {
    return this.electronService.invoke<SupplierResponse>('supplier:get', {
      id,
    });
  }

  createSupplier(payload: SupplierInput): Promise<SupplierResponse> {
    return this.electronService.invoke<SupplierResponse>(
      'supplier:create',
      payload,
    );
  }

  updateSupplier(
    payload: { id: number } & Partial<SupplierInput> & { is_active?: boolean },
  ): Promise<SupplierResponse> {
    return this.electronService.invoke<SupplierResponse>(
      'supplier:update',
      payload,
    );
  }

  deactivateSupplier(id: number): Promise<DeleteResponse> {
    return this.electronService.invoke<DeleteResponse>('supplier:deactivate', {
      id,
    });
  }

  recordPayment(payload: SupplierPaymentInput): Promise<PaymentResponse> {
    return this.electronService.invoke<PaymentResponse>(
      'supplier:record-payment',
      payload,
    );
  }

  getPaymentHistory(
    supplierId: number,
    limit = 50,
  ): Promise<PaymentHistoryResponse> {
    return this.electronService.invoke<PaymentHistoryResponse>(
      'supplier:payment-history',
      { supplier_id: supplierId, limit },
    );
  }

  getCreditSummary(supplierId: number): Promise<CreditSummaryResponse> {
    return this.electronService.invoke<CreditSummaryResponse>(
      'supplier:credit-summary',
      { supplier_id: supplierId },
    );
  }
}
