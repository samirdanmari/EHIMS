import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { EODService } from '../services/eod.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { Router } from '@angular/router';

interface Shift {
  id: number;
  shift_name: string;
  user_id: number;
  user_name?: string;
  opening_cash: number;
  start_time: string;
  status: string;
}

@Component({
  selector: 'app-open-shift',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    ConfirmDialogComponent,
  ],
  templateUrl: './open-shift.component.html',
  styleUrls: ['./open-shift.component.scss'],
})
export class OpenShiftComponent implements OnInit {
  authService = inject(AuthService);
  private eodService = inject(EODService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;

  isLoading = signal(false);
  isSaving = signal(false);
  activeShifts = signal<Shift[]>([]);
  activeTab = signal<'open' | 'active'>('open');

  openShiftForm = new FormGroup({
    shift_name: new FormControl('', {
      validators: [Validators.required, Validators.minLength(3)],
      nonNullable: true,
    }),
    opening_cash: new FormControl(0, {
      validators: [Validators.required, Validators.min(0)],
      nonNullable: true,
    }),
  });

  async ngOnInit() {
    await this.loadActiveShifts();
  }

  async loadActiveShifts() {
    this.isLoading.set(true);
    const res = await this.eodService.listActiveShifts();
    if (res.success && res.shifts) {
      this.activeShifts.set(res.shifts);
    }
    this.isLoading.set(false);
  }

  async onOpenShift() {
    if (!this.openShiftForm.valid) {
      this.notificationService.error(
        'Validation Error',
        'Please fill in all required fields',
      );
      return;
    }

    this.isSaving.set(true);
    const currentUser = this.authService.currentUser();

    const res = await this.eodService.openShift({
      shift_name: this.openShiftForm.value.shift_name || '',
      user_id: currentUser?.id || 1,
      opening_cash: this.openShiftForm.value.opening_cash || 0,
    });

    this.isSaving.set(false);

    if (res.success) {
      this.notificationService.success(
        'Shift Opened',
        `Shift "${this.openShiftForm.value.shift_name}" has been opened successfully.`,
      );
      this.openShiftForm.reset();
      await this.loadActiveShifts();
      this.activeTab.set('active');
    } else {
      this.notificationService.error(
        'Failed to open shift',
        res.error || 'Unknown error',
      );
    }
  }

  goToCloseShift() {
    this.router.navigate(['/eod/close-shift']);
  }

  setTab(tab: 'open' | 'active') {
    this.activeTab.set(tab);
  }
}
