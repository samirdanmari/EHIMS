import { Injectable, inject } from '@angular/core';
import { ElectronService } from '../../../core/services/electron.service';
import {
  SalesMetrics,
  SalesTrend,
  InventoryMovement,
  InventoryAlert,
  SupplierMetrics,
  StaffMetrics,
  ProfitLossStatement,
  DashboardSummary,
  ChartData,
} from '../../../core/models/report.model';

interface ReportResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private electronService = inject(ElectronService);

  // Dashboard Summary
  getDashboardSummary(): Promise<ReportResponse<DashboardSummary>> {
    return this.electronService.invoke('reports:dashboard-summary', {});
  }

  // Sales Reports
  getSalesMetrics(
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ReportResponse<SalesMetrics[]>> {
    return this.electronService.invoke('reports:sales-metrics', {
      date_from: dateFrom,
      date_to: dateTo,
    });
  }

  getSalesTrends(
    period: 'daily' | 'weekly' | 'monthly',
    limit?: number,
  ): Promise<ReportResponse<SalesTrend[]>> {
    return this.electronService.invoke('reports:sales-trends', {
      period,
      limit,
    });
  }

  // Inventory Reports
  getInventoryMovement(
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ReportResponse<InventoryMovement[]>> {
    return this.electronService.invoke('reports:inventory-movement', {
      date_from: dateFrom,
      date_to: dateTo,
    });
  }

  getInventoryAlerts(): Promise<ReportResponse<InventoryAlert[]>> {
    return this.electronService.invoke('reports:inventory-alerts', {});
  }

  getInventoryValuation(): Promise<
    ReportResponse<{ total_valuation: number; items: InventoryMovement[] }>
  > {
    return this.electronService.invoke('reports:inventory-valuation', {});
  }

  // Supplier Reports
  getSupplierMetrics(): Promise<ReportResponse<SupplierMetrics[]>> {
    return this.electronService.invoke('reports:supplier-metrics', {});
  }

  // Staff Reports
  getStaffMetrics(
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ReportResponse<StaffMetrics[]>> {
    return this.electronService.invoke('reports:staff-metrics', {
      date_from: dateFrom,
      date_to: dateTo,
    });
  }

  // Profit & Loss
  getProfitLossStatement(
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ReportResponse<ProfitLossStatement>> {
    return this.electronService.invoke('reports:profit-loss', {
      date_from: dateFrom,
      date_to: dateTo,
    });
  }

  // Purchase Report
  getPurchaseReport(
    status?: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ReportResponse<any[]>> {
    return this.electronService.invoke('reports:purchase-report', {
      status,
      date_from: dateFrom,
      date_to: dateTo,
    });
  }

  // Stock Issuance Report
  getStockIssuanceReport(
    shiftId?: number,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ReportResponse<any[]>> {
    return this.electronService.invoke('reports:stock-issuance-report', {
      shift_id: shiftId,
      date_from: dateFrom,
      date_to: dateTo,
    });
  }
}
