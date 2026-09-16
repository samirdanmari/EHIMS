import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryService } from '../../../core/services/inventory.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ReportsService } from '../services/reports.service';
import { Category, StockAuditRow } from '../../../core/models/inventory.model';
import { ReportTablePipe } from '../../../shared/pipes/report-table.pipe';

function dateValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-stock-audit-report',
  standalone: true,
  imports: [CommonModule, ReportTablePipe],
  templateUrl: './stock-audit-report.component.html',
  styleUrls: ['./stock-audit-report.component.scss'],
})
export class StockAuditReportComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private reportsService = inject(ReportsService);
  private notificationService = inject(NotificationService);

  isLoading = signal(true);
  categories = signal<Category[]>([]);
  report = signal<StockAuditRow[]>([]);
  dateFrom = signal(dateValue(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)));
  dateTo = signal(dateValue(new Date()));
  categoryId = signal<number | null>(null);
  searchTerm = signal('');
  sortKey = signal('name');
  sortDirection = signal<'asc' | 'desc'>('asc');
  totalPurchased = computed(() =>
    this.report().reduce((sum, row) => sum + row.purchased, 0),
  );
  totalIssued = computed(() =>
    this.report().reduce((sum, row) => sum + row.issued, 0),
  );

  async ngOnInit() {
    const categories = await this.inventoryService.listCategories();
    if (categories.success) this.categories.set(categories.categories);
    await this.runAudit();
  }

  async runAudit() {
    this.isLoading.set(true);
    const result = await this.inventoryService.stockAudit({
      dateFrom: this.dateFrom(),
      dateTo: this.dateTo(),
      categoryId: this.categoryId(),
    });
    if (result.success) this.report.set(result.report);
    else
      this.notificationService.error(
        'Audit failed',
        result.error || 'Could not generate stock audit.',
      );
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

  rowClass(row: StockAuditRow): string {
    return row.closing <= 0
      ? 'row-critical'
      : row.closing <= row.low_stock_threshold
        ? 'row-low'
        : '';
  }

  async printReport() {
    this.notifyExport(
      await this.reportsService.printReport(
        'Stock Audit Report',
        this.columns(),
        this.reportRows(),
      ),
    );
  }

  async savePdf() {
    const result = await this.reportsService.saveReportPdf(
      'Stock Audit Report',
      this.columns(),
      this.reportRows(),
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

  private columns() {
    return [
      { key: 'name', label: 'Item' },
      { key: 'category_name', label: 'Category' },
      { key: 'opening', label: 'Opening' },
      { key: 'purchased', label: 'Purchased' },
      { key: 'issued', label: 'Issued' },
      { key: 'closing', label: 'Closing' },
    ];
  }

  private reportRows(): Array<Record<string, unknown>> {
    return this.report().map((row) => ({
      ...row,
      opening: `${row.opening} ${row.unit}`,
      purchased: `${row.purchased} ${row.unit}`,
      issued: `${row.issued} ${row.unit}`,
      closing: `${row.closing} ${row.unit}`,
    }));
  }

  private notifyExport(result: {
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
}
