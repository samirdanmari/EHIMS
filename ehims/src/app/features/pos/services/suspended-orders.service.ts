import { Injectable, inject } from '@angular/core';
import { ElectronService } from '../../../core/services/electron.service';

export interface SuspendedOrder {
  id: number;
  orderNumber: string;
  customerName?: string;
  tableNumber?: string;
  items: any[];
  subtotal: number;
  discount?: number;
  tax?: number;
  notes?: string;
  suspendedBy?: number;
  suspendedByName?: string;
  suspendedAt: string;
}

@Injectable({ providedIn: 'root' })
export class SuspendedOrdersService {
  private electronService = inject(ElectronService);

  async suspendOrder(data: {
    orderNumber: string;
    customerName?: string;
    tableNumber?: string;
    items: any[];
    subtotal: number;
    discount?: number;
    tax?: number;
    notes?: string;
    suspendedBy: number;
  }): Promise<{ success: boolean; error?: string; id?: number }> {
    return this.electronService.invoke('suspended-orders:suspend', data);
  }

  async listSuspendedOrders(): Promise<{
    success: boolean;
    data?: SuspendedOrder[];
    error?: string;
  }> {
    return this.electronService.invoke('suspended-orders:list', {});
  }

  async retrieveSuspendedOrder(
    id: number,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.electronService.invoke('suspended-orders:retrieve', { id });
  }

  async cancelSuspendedOrder(
    id: number,
  ): Promise<{ success: boolean; error?: string }> {
    return this.electronService.invoke('suspended-orders:cancel', { id });
  }
}
