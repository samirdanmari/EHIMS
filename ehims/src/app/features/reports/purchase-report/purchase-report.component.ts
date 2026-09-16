import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { ReportsService } from '../services/reports.service';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { NotificationService } from '../../../core/services/notification.service';
import { ReportTablePipe } from '../../../shared/pipes/report-table.pipe';

interface PurchaseRow {
  id: number;
  purchase_date: string;
  supplier_name: string;
  account_number?: string;
  total_cost: number;
  total_paid: number;
  outstanding: number;
  credit_status: string;
}

@Component({
  selector: 'app-purchase-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, ReportTablePipe],
  templateUrl: './purchase-report.component.html',
  styleUrls: ['./purchase-report.component.scss'],
})
export class PurchaseReportComponent implements OnInit {
  private reportsService = inject(ReportsService);
  private notificationService = inject(NotificationService);

  isLoading = signal(true);
  purchases = signal<PurchaseRow[]>([]);
  totalCost = signal(0);
  totalPaid = signal(0);
  totalOutstanding = signal(0);
  searchTerm = signal('');
  sortKey = signal('purchase_date');
  sortDirection = signal<'asc' | 'desc'>('desc');

  form = new FormGroup({
    status: new FormControl('all'),
    dateFrom: new FormControl(''),
    dateTo: new FormControl(''),
  });

  async ngOnInit() {
    await this.loadData();
    this.isLoading.set(false);
  }

  async loadData() {
    const status = this.form.get('status')?.value || 'all';
    const dateFrom = this.form.get('dateFrom')?.value || undefined;
    const dateTo = this.form.get('dateTo')?.value || undefined;

    const res = await this.reportsService.getPurchaseReport(
      status,
      dateFrom,
      dateTo,
    );
    if (res.success && res.data) {
      this.purchases.set(res.data as PurchaseRow[]);
      this.calculateTotals();
    }
  }

  calculateTotals() {
    const purchases = this.purchases();
    const totalCost = purchases.reduce(
      (sum, p) => sum + (p.total_cost || 0),
      0,
    );
    const totalPaid = purchases.reduce(
      (sum, p) => sum + (p.total_paid || 0),
      0,
    );

    this.totalCost.set(totalCost);
    this.totalPaid.set(totalPaid);
    this.totalOutstanding.set(totalCost - totalPaid);
  }

  async applyFilters() {
    this.isLoading.set(true);
    await this.loadData();
    this.isLoading.set(false);
  }

  getStatusClass(status: string): string {
    return status === 'paid' ? 'status-paid' : 'status-credit';
  }

  sortBy(key: string) {
    if (this.sortKey() === key)
      this.sortDirection.update((direction) =>
        direction === 'asc' ? 'desc' : 'asc',
      );
    else {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
    }
  }

  async printReport() {
    const result = await this.reportsService.printReport(
      'Purchase Report',
      [
        { key: 'purchase_date', label: 'Date' },
        { key: 'supplier_name', label: 'Supplier' },
        { key: 'total_cost', label: 'Total Cost' },
        { key: 'total_paid', label: 'Paid' },
        { key: 'outstanding', label: 'Outstanding' },
        { key: 'credit_status', label: 'Status' },
      ],
      this.purchases() as unknown as Array<Record<string, unknown>>,
    );
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
      'Purchase Report',
      [
        { key: 'purchase_date', label: 'Date' },
        { key: 'supplier_name', label: 'Supplier' },
        { key: 'total_cost', label: 'Total Cost' },
        { key: 'total_paid', label: 'Paid' },
        { key: 'outstanding', label: 'Outstanding' },
        { key: 'credit_status', label: 'Status' },
      ],
      this.purchases() as unknown as Array<Record<string, unknown>>,
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
