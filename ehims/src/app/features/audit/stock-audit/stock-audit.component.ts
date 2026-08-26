import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../../core/services/inventory.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Category, StockAuditRow } from '../../../core/models/inventory.model';
import { InventoryTabComponent } from '../../../shared/components/inventory/inventory-tab/inventory-tab.component';

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-stock-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, InventoryTabComponent],
  templateUrl: './stock-audit.component.html',
  styleUrls: ['./stock-audit.component.scss'],
})
export class StockAuditComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private notificationService = inject(NotificationService);

  isLoading = signal(true);
  categories = signal<Category[]>([]);
  report = signal<StockAuditRow[]>([]);

  // Default to a "last 30 days, up to today" window
  dateFrom = signal(
    toDateInputValue(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)),
  );
  dateTo = signal(toDateInputValue(new Date()));
  selectedCategoryId = signal<number | null>(null);

  totalPurchased = computed(() =>
    this.report().reduce((sum, r) => sum + r.purchased, 0),
  );
  totalIssued = computed(() =>
    this.report().reduce((sum, r) => sum + r.issued, 0),
  );
  lowStockRows = computed(() =>
    this.report().filter((r) => r.closing <= r.low_stock_threshold),
  );

  async ngOnInit() {
    const catRes = await this.inventoryService.listCategories();
    if (catRes.success) this.categories.set(catRes.categories);
    await this.runAudit();
  }

  async runAudit() {
    this.isLoading.set(true);
    try {
      const res = await this.inventoryService.stockAudit({
        dateFrom: this.dateFrom(),
        dateTo: this.dateTo(),
        categoryId: this.selectedCategoryId(),
      });
      if (res.success) {
        this.report.set(res.report);
      } else {
        this.notificationService.error(
          'Audit failed',
          res.error || 'Could not generate stock audit',
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  onDateFromChange(value: string) {
    this.dateFrom.set(value);
    this.runAudit();
  }

  onDateToChange(value: string) {
    this.dateTo.set(value);
    this.runAudit();
  }

  onCategoryChange(value: string) {
    this.selectedCategoryId.set(value ? Number(value) : null);
    this.runAudit();
  }

  rowClass(row: StockAuditRow): string {
    if (row.closing <= 0) return 'row-critical';
    if (row.closing <= row.low_stock_threshold) return 'row-low';
    return '';
  }
}
