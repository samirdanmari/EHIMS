import { Injectable, inject } from '@angular/core';
import { ElectronService } from './electron.service';
import {
  RegularCustomer,
  CustomerDetails,
  CustomerCreateInput,
  CustomerUpdateInput,
  CustomerPaymentInput,
  CustomerSearchResult,
} from '../models/customer.model';

interface CustomerResponse<T = RegularCustomer> {
  success: boolean;
  data?: T;
  error?: string;
}

interface CustomerListResponse {
  success: boolean;
  data: RegularCustomer[];
  error?: string;
}

interface CustomerSearchResponse {
  success: boolean;
  data: CustomerSearchResult[];
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private electronService = inject(ElectronService);

  createCustomer(payload: CustomerCreateInput): Promise<CustomerResponse> {
    return this.electronService.invoke('customer:create', payload);
  }

  listCustomers(params: { search?: string; includeInactive?: boolean } = {}): Promise<CustomerListResponse> {
    return this.electronService.invoke('customer:list', params);
  }

  getCustomer(id: number): Promise<CustomerResponse<CustomerDetails>> {
    return this.electronService.invoke('customer:get', { id });
  }

  updateCustomer(payload: CustomerUpdateInput): Promise<CustomerResponse> {
    return this.electronService.invoke('customer:update', payload);
  }

  deactivateCustomer(id: number): Promise<CustomerResponse<void>> {
    return this.electronService.invoke('customer:deactivate', { id });
  }

  recordPayment(payload: CustomerPaymentInput): Promise<CustomerResponse<{ paymentId: number; customer: RegularCustomer }>> {
    return this.electronService.invoke('customer:record-payment', payload);
  }

  searchCustomers(query: string): Promise<CustomerSearchResponse> {
    return this.electronService.invoke('customer:search', { query });
  }
}
