import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { ReportsService } from '../services/reports.service';
import {
  SalesItem,
  SalesMetrics,
  SalesTrend,
} from '../../../core/models/report.model';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { NotificationService } from '../../../core/services/notification.service';
import { ReportTablePipe } from '../../../shared/pipes/report-table.pipe';

@Component({
  selector: 'app-sales-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, ReportTablePipe],
  templateUrl: './sales-report.component.html',
  styleUrls: ['./sales-report.component.scss'],
})
export class SalesReportComponent implements OnInit {
  private reportsService = inject(ReportsService);
  private notificationService = inject(NotificationService);

  isLoading = signal(true);
  salesMetrics = signal<SalesMetrics[]>([]);
  salesTrends = signal<SalesTrend[]>([]);
  salesItems = signal<SalesItem[]>([]);
  selectedPeriod = signal<'daily' | 'weekly' | 'monthly'>('daily');
  searchTerm = signal('');
  sortKey = signal('date');
  sortDirection = signal<'asc' | 'desc'>('desc');

  form = new FormGroup({
    dateFrom: new FormControl(''),
    dateTo: new FormControl(''),
  });

  async ngOnInit() {
    await this.loadData();
    this.isLoading.set(false);
  }

  async loadData() {
    const dateFrom = this.form.get('dateFrom')?.value || undefined;
    const dateTo = this.form.get('dateTo')?.value || undefined;

    // Load metrics
    const metricsRes = await this.reportsService.getSalesMetrics(
      dateFrom,
      dateTo,
    );
    if (metricsRes.success && metricsRes.data) {
      this.salesMetrics.set(metricsRes.data);
    }

    // Load trends
    const trendsRes = await this.reportsService.getSalesTrends(
      this.selectedPeriod(),
      30,
      dateFrom,
      dateTo,
    );
    if (trendsRes.success && trendsRes.data) {
      this.salesTrends.set(trendsRes.data);
    }

    const itemsRes = await this.reportsService.getSalesItems(dateFrom, dateTo);
    if (itemsRes.success && itemsRes.data) {
      this.salesItems.set(itemsRes.data);
    }
  }

  async applyFilters() {
    this.isLoading.set(true);
    await this.loadData();
    this.isLoading.set(false);
  }

  async changePeriod(period: 'daily' | 'weekly' | 'monthly') {
    this.selectedPeriod.set(period);
    this.isLoading.set(true);
    await this.loadData();
    this.isLoading.set(false);
  }

  getTotalSales(): number {
    return this.salesMetrics().reduce(
      (sum, m) => sum + (m.total_sales || 0),
      0,
    );
  }

  getTotalOrders(): number {
    return this.salesMetrics().reduce(
      (sum, m) => sum + (m.total_orders || 0),
      0,
    );
  }

  getAverageOrderValue(): number {
    const total = this.getTotalSales();
    const orders = this.getTotalOrders();
    return orders > 0 ? total / orders : 0;
  }

  sortBy(key: string) {
    if (this.sortKey() === key) {
      this.sortDirection.update((direction) =>
        direction === 'asc' ? 'desc' : 'asc',
      );
    } else {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
    }
  }

  async printReport() {
    const result = await this.reportsService.printReport(
      'Sales Report',
      [
        { key: 'date', label: 'Date' },
        { key: 'total_orders', label: 'Orders' },
        { key: 'total_sales', label: 'Sales' },
        { key: 'net_sales', label: 'Net Sales' },
        { key: 'cash_collected', label: 'Cash' },
        { key: 'card_collected', label: 'Card' },
        { key: 'transfer_collected', label: 'Transfer' },
      ],
      this.salesMetrics() as unknown as Array<Record<string, unknown>>,
    );
    this.notifyPrintResult(result);
  }

  private notifyPrintResult(result: {
    success: boolean;
    message?: string;
    error?: string;
  }) {
    result.success
      ? this.notificationService.success(
          'Report Printed',
          result.message || 'Report sent to printer.',
        )
      : this.notificationService.error(
          'Print Failed',
          result.error || 'Could not print report.',
        );
  }

  async savePdf() {
    const result = await this.reportsService.saveReportPdf(
      'Sales Report',
      [
        { key: 'date', label: 'Date' },
        { key: 'total_orders', label: 'Orders' },
        { key: 'total_sales', label: 'Sales' },
        { key: 'net_sales', label: 'Net Sales' },
        { key: 'cash_collected', label: 'Cash' },
        { key: 'card_collected', label: 'Card' },
        { key: 'transfer_collected', label: 'Transfer' },
      ],
      this.salesMetrics() as unknown as Array<Record<string, unknown>>,
    );
    if (result.success)
      this.notificationService.success(
        'PDF Saved',
        result.message || 'Report PDF saved.',
      );
    else if (!result.cancelled)
      this.notificationService.error(
        'Export Failed',
        result.error || 'Could not save PDF.',
      );
  }
}
