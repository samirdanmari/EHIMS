import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { EODService, Shift } from '../services/eod.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { EODSummary } from '../../../core/models/eod.model';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-shift-close',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    ConfirmDialogComponent,
  ],
  templateUrl: './shift-close.component.html',
  styleUrls: ['./shift-close.component.scss'],
})
export class ShiftCloseComponent implements OnInit {
  private eodService = inject(EODService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;

  isLoading = signal(true);
  isProcessing = signal(false);
  activeShifts = signal<Shift[]>([]);
  closeResult = signal<EODSummary | null>(null);

  form = new FormGroup({
    shift_id: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    drawer_cash: new FormControl(0, {
      validators: [Validators.required, Validators.min(0)],
      nonNullable: true,
    }),
    expected_cash: new FormControl(0, { nonNullable: true }),
    stock_verified: new FormControl(false),
    notes: new FormControl(''),
  });

  async ngOnInit() {
    await this.loadShifts();
    this.isLoading.set(false);
  }

  async loadShifts() {
    const res = await this.eodService.listActiveShifts();
    if (res.success) {
      this.activeShifts.set(res.shifts);
      if (res.shifts.length === 1) {
        this.form.controls.shift_id.setValue(res.shifts[0].id);
        this.updateExpectedCash();
      }
    }
  }

  updateExpectedCash() {
    const shift = this.activeShifts().find(
      (item) => item.id === this.form.controls.shift_id.value,
    );
    if (shift) {
      this.form.controls.expected_cash.setValue(
        (shift.opening_cash || 0) + (shift.cash_collected || 0),
      );
    }
  }

  async onCloseShift() {
    if (this.form.invalid || this.isProcessing()) return;

    const confirmed = await this.confirmDialog.open({
      title: 'Close shift?',
      message:
        'This will finalize the shift, record cash variance, and generate EOD report.',
      confirmText: 'Close Shift',
      type: 'info',
    });

    if (!confirmed) return;

    this.isProcessing.set(true);
    try {
      const userId = this.authService.currentUser()?.id;
      if (!userId) {
        this.notificationService.error(
          'Not signed in',
          'Could not identify the current user.',
        );
        return;
      }

      const value = this.form.getRawValue();
      const res = await this.eodService.closeShift({
        shift_id: value.shift_id as number,
        drawer_cash: value.drawer_cash,
        expected_cash: value.expected_cash,
        stock_verified: value.stock_verified || undefined,
        notes: value.notes || undefined,
        outgoing_user: userId,
      });

      if (res.success) {
        this.closeResult.set(res.eodReport || null);
        this.notificationService.success(
          'Shift closed',
          'EOD report generated',
        );
        this.form.reset();
        await this.loadShifts();
      } else {
        this.notificationService.error(
          'Close failed',
          res.error || 'Could not close shift',
        );
      }
    } finally {
      this.isProcessing.set(false);
    }
  }

  resetForm() {
    this.closeResult.set(null);
    this.form.reset();
  }
}
