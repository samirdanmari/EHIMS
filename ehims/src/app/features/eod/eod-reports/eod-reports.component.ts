import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { EODService } from '../services/eod.service';
import { EODReport } from '../../../core/models/eod.model';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-eod-reports',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './eod-reports.component.html',
  styleUrls: ['./eod-reports.component.scss'],
})
export class EODReportsComponent implements OnInit {
  private eodService = inject(EODService);

  isLoading = signal(true);
  reports = signal<EODReport[]>([]);
  expandedReportId = signal<number | null>(null);

  form = new FormGroup({
    dateFrom: new FormControl(''),
    dateTo: new FormControl(''),
  });

  async ngOnInit() {
    await this.loadReports();
    this.isLoading.set(false);
  }

  async loadReports() {
    const dateFrom = this.form.controls.dateFrom.value || undefined;
    const dateTo = this.form.controls.dateTo.value || undefined;

    const res = await this.eodService.listEODReports({
      limit: 100,
      dateFrom,
      dateTo,
    });

    if (res.success) {
      this.reports.set(res.reports);
    }
  }

  async onFilterChange() {
    await this.loadReports();
  }

  toggleExpand(reportId: number) {
    this.expandedReportId.set(
      this.expandedReportId() === reportId ? null : reportId,
    );
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString([], { dateStyle: 'medium' });
  }
}
