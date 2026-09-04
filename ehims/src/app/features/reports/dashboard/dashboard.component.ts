import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsService } from '../services/reports.service';
import { DashboardSummary } from '../../../core/models/report.model';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class ReportsDashboardComponent implements OnInit {
  private reportsService = inject(ReportsService);

  isLoading = signal(true);
  error = signal<string | null>(null);
  summary = signal<DashboardSummary | null>(null);

  async ngOnInit() {
    await this.loadDashboard();
  }

  async loadDashboard() {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const res = await this.reportsService.getDashboardSummary();

      if (res.success && res.data) {
        this.summary.set(res.data);
      } else {
        this.error.set(res.error || 'Failed to load dashboard data');
        console.warn('Dashboard error:', res.error);
      }
    } catch (err) {
      this.error.set('Error loading dashboard');
      console.error('Dashboard load error:', err);
    } finally {
      this.isLoading.set(false);
    }
  }
}
