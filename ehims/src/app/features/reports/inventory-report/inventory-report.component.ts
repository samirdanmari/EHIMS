import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { ReportsService } from '../services/reports.service';
import {
  InventoryMovement,
  InventoryAlert,
} from '../../../core/models/report.model';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { NotificationService } from '../../../core/services/notification.service';
import { ReportTablePipe } from '../../../shared/pipes/report-table.pipe';

@Component({
  selector: 'app-inventory-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, ReportTablePipe],
  templateUrl: './inventory-report.component.html',
  styleUrls: ['./inventory-report.component.scss'],
})
export class InventoryReportComponent implements OnInit {
  private reportsService = inject(ReportsService);
  private notificationService = inject(NotificationService);

  isLoading = signal(true);
  inventory = signal<InventoryMovement[]>([]);
  alerts = signal<InventoryAlert[]>([]);
  totalValuation = signal(0);
  showAlerts = signal(true);
  searchTerm = signal('');
  sortKey = signal('item_name');
  sortDirection = signal<'asc' | 'desc'>('asc');

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

    // Load inventory movement
    const movementRes = await this.reportsService.getInventoryMovement(
      dateFrom,
      dateTo,
    );
    if (movementRes.success && movementRes.data) {
      this.inventory.set(movementRes.data);
    }

    // Load alerts
    const alertsRes = await this.reportsService.getInventoryAlerts();
    if (alertsRes.success && alertsRes.data) {
      this.alerts.set(alertsRes.data);
    }

    // Load valuation
    const valuationRes = await this.reportsService.getInventoryValuation();
    if (valuationRes.success && valuationRes.data) {
      this.totalValuation.set(valuationRes.data.total_valuation || 0);
    }
  }

  async applyFilters() {
    this.isLoading.set(true);
    await this.loadData();
    this.isLoading.set(false);
  }

  getCriticalItems(): number {
    return this.alerts().filter((a) => a.status === 'critical').length;
  }

  getWarningItems(): number {
    return this.alerts().filter((a) => a.status === 'warning').length;
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
      'Inventory Report',
      [
        { key: 'item_name', label: 'Item' },
        { key: 'category', label: 'Category' },
        { key: 'closing_stock', label: 'Stock' },
        { key: 'purchases', label: 'Purchases' },
        { key: 'issued', label: 'Issued' },
        { key: 'valuation', label: 'Valuation' },
      ],
      this.inventory() as unknown as Array<Record<string, unknown>>,
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
      'Inventory Report',
      [
        { key: 'item_name', label: 'Item' },
        { key: 'category', label: 'Category' },
        { key: 'closing_stock', label: 'Stock' },
        { key: 'purchases', label: 'Purchases' },
        { key: 'issued', label: 'Issued' },
        { key: 'valuation', label: 'Valuation' },
      ],
      this.inventory() as unknown as Array<Record<string, unknown>>,
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
