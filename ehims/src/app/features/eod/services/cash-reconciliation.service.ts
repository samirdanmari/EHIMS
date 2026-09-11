import { Injectable, inject } from '@angular/core';
import { ElectronService } from '../../../core/services/electron.service';

export interface DenominationBreakdown {
  [key: string]: number; // e.g., "1000": 5, "500": 3, etc.
}

export interface CashReconciliation {
  id?: number;
  shift_id: number;
  reconciled_by: number;
  expected_cash: number;
  actual_cash: number;
  discrepancy?: number;
  discrepancy_reason?: string;
  variance_percentage?: number;
  denomination_breakdown?: DenominationBreakdown;
  notes?: string;
  status?: string;
  reconciled_at?: string;
  reconciled_by_name?: string;
}

export interface VarianceReport {
  id?: number;
  report_date: string;
  total_shifts: number;
  total_expected_cash: number;
  total_actual_cash: number;
  total_discrepancy: number;
  average_variance: number;
  over_count: number;
  short_count: number;
  generated_by_name?: string;
  generated_at?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CashReconciliationService {
  private electronService = inject(ElectronService);

  reconcileShift(data: CashReconciliation) {
    return this.electronService.invoke<any>('cash:reconcile-shift', data);
  }

  getReconciliation(shift_id: number) {
    return this.electronService.invoke<any>('cash:get-reconciliation', {
      shift_id,
    });
  }

  listReconciliations(dateFrom?: string, dateTo?: string, limit?: number) {
    return this.electronService.invoke<any>('cash:list-reconciliations', {
      dateFrom,
      dateTo,
      limit: limit || 50,
    });
  }

  generateVarianceReport(report_date: string, generated_by: number) {
    return this.electronService.invoke<any>('cash:generate-variance-report', {
      report_date,
      generated_by,
    });
  }

  getVarianceReports(dateFrom?: string, dateTo?: string, limit?: number) {
    return this.electronService.invoke<any>('cash:get-variance-reports', {
      dateFrom,
      dateTo,
      limit: limit || 30,
    });
  }

  approveReconciliation(
    reconciliation_id: number,
    status: string,
    notes?: string,
  ) {
    return this.electronService.invoke<any>('cash:approve-reconciliation', {
      reconciliation_id,
      status,
      notes,
    });
  }
}
