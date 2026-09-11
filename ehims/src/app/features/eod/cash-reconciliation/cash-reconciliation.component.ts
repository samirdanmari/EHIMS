import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { CashReconciliationService } from '../services/cash-reconciliation.service';
import { EODService } from '../services/eod.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

interface Denomination {
  value: number;
  count: number;
  total: number;
}

@Component({
  selector: 'app-cash-reconciliation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './cash-reconciliation.component.html',
  styleUrls: ['./cash-reconciliation.component.scss'],
})
export class CashReconciliationComponent implements OnInit {
  private reconciliationService = inject(CashReconciliationService);
  private eodService = inject(EODService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  isLoading = signal(false);
  isProcessing = signal(false);
  activeShift = signal<any>(null);
  reconciliationHistory = signal<any[]>([]);
  varianceReports = signal<any[]>([]);
  expandedHistoryId = signal<number | null>(null);

  denominations = signal<Denomination[]>([
    { value: 1000, count: 0, total: 0 },
    { value: 500, count: 0, total: 0 },
    { value: 200, count: 0, total: 0 },
    { value: 100, count: 0, total: 0 },
    { value: 50, count: 0, total: 0 },
    { value: 20, count: 0, total: 0 },
    { value: 10, count: 0, total: 0 },
    { value: 5, count: 0, total: 0 },
    { value: 1, count: 0, total: 0 },
  ]);

  reconciliationForm = new FormGroup({
    discrepancy_reason: new FormControl(''),
    notes: new FormControl(''),
  });

  totalCounted = computed(() => {
    return this.denominations().reduce((sum, d) => sum + d.total, 0);
  });

  expectedCash = computed(() => {
    const shift = this.activeShift();
    if (!shift) return 0;
    return (shift.opening_cash || 0) + (shift.total_sales || 0);
  });

  discrepancy = computed(() => {
    return this.totalCounted() - this.expectedCash();
  });

  variancePercentage = computed(() => {
    const expected = this.expectedCash();
    if (expected === 0) return 0;
    return (Math.abs(this.discrepancy()) / expected) * 100;
  });

  isOver = computed(() => this.discrepancy() > 0);
  isShort = computed(() => this.discrepancy() < 0);
  isBalanced = computed(() => Math.abs(this.discrepancy()) < 0.01);

  async ngOnInit() {
    await this.loadActiveShift();
    await this.loadReconciliationHistory();
    await this.loadVarianceReports();
  }

  async loadActiveShift() {
    try {
      const currentUser = this.authService.currentUser();
      if (!currentUser) return;

      const res = await this.eodService.getActiveShift(currentUser.id);
      if (res.success && res.shift) {
        this.activeShift.set(res.shift);
      }
    } catch (err) {
      console.error('Error loading active shift:', err);
    }
  }

  async loadReconciliationHistory() {
    try {
      const res = await this.reconciliationService.listReconciliations();
      if (res.success) {
        this.reconciliationHistory.set(res.reconciliations);
      }
    } catch (err) {
      console.error('Error loading reconciliation history:', err);
    }
  }

  async loadVarianceReports() {
    try {
      const res = await this.reconciliationService.getVarianceReports();
      if (res.success) {
        this.varianceReports.set(res.reports);
      }
    } catch (err) {
      console.error('Error loading variance reports:', err);
    }
  }

  updateDenominationCount(index: number, count: number) {
    const updated = [...this.denominations()];
    updated[index].count = Math.max(0, count);
    updated[index].total = updated[index].count * updated[index].value;
    this.denominations.set(updated);
  }

  async submitReconciliation() {
    try {
      if (!this.activeShift()) {
        this.notificationService.error('Error', 'No active shift found');
        return;
      }

      const currentUser = this.authService.currentUser();
      if (!currentUser) {
        this.notificationService.error('Error', 'User not authenticated');
        return;
      }

      const denominationBreakdown = this.denominations().reduce((acc, d) => {
        if (d.count > 0) {
          acc[d.value.toString()] = d.count;
        }
        return acc;
      }, {} as any);

      this.isProcessing.set(true);

      const res = await this.reconciliationService.reconcileShift({
        shift_id: this.activeShift().id,
        reconciled_by: currentUser.id,
        expected_cash: this.expectedCash(),
        actual_cash: this.totalCounted(),
        discrepancy_reason:
          this.reconciliationForm.get('discrepancy_reason')?.value || undefined,
        denomination_breakdown: denominationBreakdown,
        notes: this.reconciliationForm.get('notes')?.value || undefined,
      });

      if (res.success) {
        this.notificationService.success(
          'Reconciliation Submitted',
          `Discrepancy: ${this.discrepancy() >= 0 ? '+' : ''}${this.discrepancy().toFixed(2)} (${this.variancePercentage().toFixed(2)}%)`,
        );
        await this.loadReconciliationHistory();
        this.resetForm();
      } else {
        this.notificationService.error(
          'Failed',
          res.error || 'Could not save reconciliation',
        );
      }
    } catch (err) {
      console.error('Reconciliation error:', err);
      this.notificationService.error(
        'Error',
        'Failed to submit reconciliation',
      );
    } finally {
      this.isProcessing.set(false);
    }
  }

  resetForm() {
    this.denominations.set(
      this.denominations().map((d) => ({ ...d, count: 0, total: 0 })),
    );
    this.reconciliationForm.reset();
  }

  expandReconciliation(id: number) {
    this.expandedHistoryId.set(this.expandedHistoryId() === id ? null : id);
  }

  async approveReconciliation(id: number) {
    try {
      const res = await this.reconciliationService.approveReconciliation(
        id,
        'approved',
      );
      if (res.success) {
        this.notificationService.success('Approved', 'Reconciliation approved');
        await this.loadReconciliationHistory();
      }
    } catch (err) {
      this.notificationService.error('Error', 'Failed to approve');
    }
  }

  formatCurrency(value: number): string {
    return `₦${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
