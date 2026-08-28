import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { ReportsService } from '../services/reports.service';
import { SalesMetrics, SalesTrend } from '../../../core/models/report.model';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-sales-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './sales-report.component.html',
  styleUrls: ['./sales-report.component.scss'],
})
export class SalesReportComponent implements OnInit {
  private reportsService = inject(ReportsService);

  isLoading = signal(true);
  salesMetrics = signal<SalesMetrics[]>([]);
  salesTrends = signal<SalesTrend[]>([]);
  selectedPeriod = signal<'daily' | 'weekly' | 'monthly'>('daily');

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
    );
    if (trendsRes.success && trendsRes.data) {
      this.salesTrends.set(trendsRes.data);
    }
  }

  async onFilterChange() {
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
}
