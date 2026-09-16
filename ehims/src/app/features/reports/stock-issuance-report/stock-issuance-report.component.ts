import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { ReportsService } from '../services/reports.service';
import { EODService } from '../../eod/services/eod.service';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { NotificationService } from '../../../core/services/notification.service';
import { ReportTablePipe } from '../../../shared/pipes/report-table.pipe';

interface IssuanceRow {
  id: number;
  created_at: string;
  shift_name: string;
  issued_by: string;
  items: string;
  item_count: number;
  total_cost: number;
}

@Component({
  selector: 'app-stock-issuance-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, ReportTablePipe],
  templateUrl: './stock-issuance-report.component.html',
  styleUrls: ['./stock-issuance-report.component.scss'],
})
export class StockIssuanceReportComponent implements OnInit {
  private reportsService = inject(ReportsService);
  private eodService = inject(EODService);
  private notificationService = inject(NotificationService);

  isLoading = signal(true);
  issuances = signal<IssuanceRow[]>([]);
  shifts = signal<any[]>([]);
  totalCost = signal(0);
  totalItems = signal(0);
  searchTerm = signal('');
  sortKey = signal('created_at');
  sortDirection = signal<'asc' | 'desc'>('desc');

  form = new FormGroup({
    shiftId: new FormControl<number | null>(null),
    dateFrom: new FormControl(''),
    dateTo: new FormControl(''),
  });

  async ngOnInit() {
    await this.loadShifts();
    await this.loadData();
    this.isLoading.set(false);
  }

  async loadShifts() {
    const res = await this.eodService.listActiveShifts();
    if (res.success && res.shifts) {
      this.shifts.set(res.shifts);
    }
  }

  async loadData() {
    const shiftId = this.form.get('shiftId')?.value || undefined;
    const dateFrom = this.form.get('dateFrom')?.value || undefined;
    const dateTo = this.form.get('dateTo')?.value || undefined;

    const res = await this.reportsService.getStockIssuanceReport(
      shiftId,
      dateFrom,
      dateTo,
    );

    if (res.success && res.data) {
      this.issuances.set(res.data as IssuanceRow[]);
      this.calculateTotals();
    }
  }

  calculateTotals() {
    const issuances = this.issuances();

    const totalCost = issuances.reduce(
      (sum, i) => sum + (i.total_cost || 0),
      0,
    );

    const totalItems = issuances.reduce(
      (sum, i) => sum + (i.item_count || 0),
      0,
    );

    this.totalCost.set(totalCost);
    this.totalItems.set(totalItems);
  }

  async applyFilters() {
    this.isLoading.set(true);
    await this.loadData();
    this.isLoading.set(false);
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
      'Stock Issuance Report',
      [
        { key: 'created_at', label: 'Date' },
        { key: 'shift_name', label: 'Shift' },
        { key: 'issued_by', label: 'Issued By' },
        { key: 'item_count', label: 'Items' },
        { key: 'total_cost', label: 'Total Cost' },
      ],
      this.issuances() as unknown as Array<Record<string, unknown>>,
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
      'Stock Issuance Report',
      [
        { key: 'created_at', label: 'Date' },
        { key: 'shift_name', label: 'Shift' },
        { key: 'issued_by', label: 'Issued By' },
        { key: 'item_count', label: 'Items' },
        { key: 'total_cost', label: 'Total Cost' },
      ],
      this.issuances() as unknown as Array<Record<string, unknown>>,
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
