import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsService } from '../services/reports.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ProfitLossStatement } from '../../../core/models/report.model';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';

function dateValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-profit-loss',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './profit-loss.component.html',
  styleUrls: ['./profit-loss.component.scss'],
})
export class ProfitLossComponent implements OnInit {
  private reportsService = inject(ReportsService);
  private notificationService = inject(NotificationService);

  isLoading = signal(true);
  isSavingPdf = signal(false);
  dateFrom = signal(
    dateValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
  );
  dateTo = signal(dateValue(new Date()));
  statement = signal<ProfitLossStatement | null>(null);

  async ngOnInit() {
    await this.loadReport();
  }

  async loadReport() {
    this.isLoading.set(true);
    try {
      const response = await this.reportsService.getProfitLossStatement(
        this.dateFrom(),
        this.dateTo(),
      );
      if (response.success && response.data) {
        this.statement.set(response.data);
      } else {
        this.notificationService.error(
          'Report failed',
          response.error || 'Could not generate profit and loss report.',
        );
      }
    } catch {
      this.notificationService.error(
        'Report failed',
        'Could not generate profit and loss report.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async downloadPdf() {
    const report = this.statement();
    if (!report || this.isSavingPdf()) return;

    this.isSavingPdf.set(true);
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
      }).format(amount);
    const rows: Array<Record<string, string>> = [
      {
        section: 'Income statement',
        details: `Gross sales (${report.total_orders} orders)`,
        amount: formatCurrency(report.gross_sales),
      },
      {
        section: 'Income statement',
        details: 'Discounts',
        amount: `-${formatCurrency(report.total_discounts)}`,
      },
      {
        section: 'Income statement',
        details: 'Net sales',
        amount: formatCurrency(report.net_sales),
      },
      {
        section: 'Income statement',
        details: 'Tax collected',
        amount: formatCurrency(report.tax_collected),
      },
      {
        section: 'Income statement',
        details: 'Cost of goods sold',
        amount: `-${formatCurrency(report.total_cogs)}`,
      },
      {
        section: 'Income statement',
        details: 'Gross profit',
        amount: formatCurrency(report.gross_profit),
      },
      {
        section: 'Income statement',
        details: 'Non-sale stock issues',
        amount: `-${formatCurrency(report.total_issued_cost)}`,
      },
      {
        section: 'Income statement',
        details: 'Operating expenses',
        amount: `-${formatCurrency(report.total_operating_expenses)}`,
      },
      {
        section: 'Income statement',
        details: 'Profit / (Loss)',
        amount: formatCurrency(report.net_profit),
      },
      {
        section: 'Income statement',
        details: 'Profit margin',
        amount: `${report.profit_margin}%`,
      },
      {
        section: 'Inventory purchases',
        details: 'Inventory spend (not expensed until sold)',
        amount: formatCurrency(report.total_purchases),
      },
    ];

    for (const item of report.items) {
      if (item.purchased_quantity) {
        rows.push({
          section: 'Inventory purchase',
          details: `${item.name}: ${item.purchased_quantity} ${item.unit}`,
          amount: formatCurrency(item.purchase_cost),
        });
      }
      if (item.sold_quantity) {
        rows.push({
          section: 'Sold inventory usage',
          details: `${item.name}: ${item.sold_quantity} ${item.unit}`,
          amount: formatCurrency(item.sold_cost),
        });
      }
      if (item.issued_quantity) {
        rows.push({
          section: 'Non-sale stock issue',
          details: `${item.name}: ${item.issued_quantity} ${item.unit}`,
          amount: formatCurrency(item.issued_cost),
        });
      }
    }

    try {
      const result = await this.reportsService.saveReportPdf(
        'Profit & Loss Report',
        [
          { key: 'section', label: 'Section' },
          { key: 'details', label: 'Description' },
          { key: 'amount', label: 'Amount' },
        ],
        rows,
        { dateFrom: this.dateFrom(), dateTo: this.dateTo() },
      );
      if (result.success) {
        this.notificationService.success(
          'PDF Saved',
          result.message || 'Profit and loss report PDF saved.',
        );
      } else if (!result.cancelled) {
        this.notificationService.error(
          'Export Failed',
          result.error || 'Could not save profit and loss report.',
        );
      }
    } catch {
      this.notificationService.error(
        'Export Failed',
        'Could not save profit and loss report.',
      );
    } finally {
      this.isSavingPdf.set(false);
    }
  }
}
