import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { NotificationService } from '../../../core/services/notification.service';
import { ReportsService } from '../services/reports.service';

interface CreditClearanceRow {
  id: number;
  customer_id: number;
  customer_name: string;
  order_id: number | null;
  order_number: string | null;
  purchase_dates: string | null;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  remaining_balance: number;
  reference_number?: string | null;
}

@Component({
  selector: 'app-credit-clearance-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './credit-clearance-report.component.html',
  styleUrls: ['./credit-clearance-report.component.scss'],
})
export class CreditClearanceReportComponent implements OnInit {
  private reportsService = inject(ReportsService);
  private notificationService = inject(NotificationService);

  isLoading = signal(true);
  rows = signal<CreditClearanceRow[]>([]);

  form = new FormGroup({
    dateFrom: new FormControl(''),
    dateTo: new FormControl(''),
  });

  async ngOnInit() {
    await this.loadData();
    this.isLoading.set(false);
  }

  async loadData() {
    try {
      const result = await this.reportsService.getCreditClearanceReport(
        this.form.controls.dateFrom.value || undefined,
        this.form.controls.dateTo.value || undefined,
      );
      if (result.success) {
        this.rows.set((result.data || []) as CreditClearanceRow[]);
      } else {
        this.notificationService.error(
          'Report Error',
          result.error || 'Could not load credit clearance.',
        );
      }
    } catch (error) {
      this.notificationService.error(
        'Report Error',
        error instanceof Error
          ? error.message
          : 'Could not load credit clearance.',
      );
    }
  }

  async applyFilters() {
    this.isLoading.set(true);
    await this.loadData();
    this.isLoading.set(false);
  }

  totalPaid(): number {
    return this.rows().reduce(
      (total, row) => total + (row.amount_paid || 0),
      0,
    );
  }

  formatPurchaseDates(dates: string | null): string {
    if (!dates) return '—';
    return dates
      .split(',')
      .map((date) => new Date(`${date}T00:00:00`).toLocaleDateString())
      .join(', ');
  }

  private columns() {
    return [
      { key: 'customer_name', label: 'Customer' },
      { key: 'order_number', label: 'Order #' },
      { key: 'purchase_dates', label: 'Purchase Date(s)' },
      { key: 'amount_paid', label: 'Amount Paid' },
      { key: 'payment_date', label: 'Payment Date' },
      { key: 'payment_method', label: 'Payment Method' },
      { key: 'remaining_balance', label: 'Balance After Payment' },
    ];
  }

  async printReport() {
    const result = await this.reportsService.printReport(
      'Credit Clearance Report',
      this.columns(),
      this.rows() as unknown as Array<Record<string, unknown>>,
      {
        dateFrom: this.form.controls.dateFrom.value || undefined,
        dateTo: this.form.controls.dateTo.value || undefined,
      },
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
      'Credit Clearance Report',
      this.columns(),
      this.rows() as unknown as Array<Record<string, unknown>>,
      {
        dateFrom: this.form.controls.dateFrom.value || undefined,
        dateTo: this.form.controls.dateTo.value || undefined,
      },
    );
    if (result.success) {
      this.notificationService.success(
        'PDF Saved',
        result.message || 'Report PDF saved.',
      );
    } else if (!result.cancelled) {
      this.notificationService.error(
        'Export Failed',
        result.error || 'Could not save PDF.',
      );
    }
  }
}
