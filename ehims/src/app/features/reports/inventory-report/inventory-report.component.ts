import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { ReportsService } from '../services/reports.service';
import {
  InventoryMovement,
  InventoryAlert,
} from '../../../core/models/report.model';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-inventory-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './inventory-report.component.html',
  styleUrls: ['./inventory-report.component.scss'],
})
export class InventoryReportComponent implements OnInit {
  private reportsService = inject(ReportsService);

  isLoading = signal(true);
  inventory = signal<InventoryMovement[]>([]);
  alerts = signal<InventoryAlert[]>([]);
  totalValuation = signal(0);
  showAlerts = signal(true);

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

  async onFilterChange() {
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
}
