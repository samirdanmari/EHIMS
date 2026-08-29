import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { ReportsService } from '../services/reports.service';
import { EODService } from '../../eod/services/eod.service';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';

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
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './stock-issuance-report.component.html',
  styleUrls: ['./stock-issuance-report.component.scss'],
})
export class StockIssuanceReportComponent implements OnInit {
  private reportsService = inject(ReportsService);
  private eodService = inject(EODService);

  isLoading = signal(true);
  issuances = signal<IssuanceRow[]>([]);
  shifts = signal<any[]>([]);
  totalCost = signal(0);
  totalItems = signal(0);

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

  async onFilterChange() {
    this.isLoading.set(true);
    await this.loadData();
    this.isLoading.set(false);
  }
}
