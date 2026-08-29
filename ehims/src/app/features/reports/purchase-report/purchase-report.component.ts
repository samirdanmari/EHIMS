import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { ReportsService } from '../services/reports.service';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';

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
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './purchase-report.component.html',
  styleUrls: ['./purchase-report.component.scss'],
})
export class PurchaseReportComponent implements OnInit {
  private reportsService = inject(ReportsService);

  isLoading = signal(true);
  purchases = signal<PurchaseRow[]>([]);
  totalCost = signal(0);
  totalPaid = signal(0);
  totalOutstanding = signal(0);

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

  async onFilterChange() {
    this.isLoading.set(true);
    await this.loadData();
    this.isLoading.set(false);
  }

  getStatusClass(status: string): string {
    return status === 'paid' ? 'status-paid' : 'status-credit';
  }
}
