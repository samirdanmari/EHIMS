import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { EODService } from '../services/eod.service';
import { ElectronService } from '../../../core/services/electron.service';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { ReportsService } from '../../reports/services/reports.service';
import { NotificationService } from '../../../core/services/notification.service';

interface ClosedShift {
  id: number;
  shift_name: string;
  user_id: number;
  user_name: string;
  username: string;
  start_time: string;
  end_time: string;
  shift_date: string;
  opening_cash: number;
  closing_cash: number;
  total_sales: number;
  total_orders: number;
  total_purchases: number;
  supplier_payments: number;
  notes?: string;
}

interface ShiftDateGroup {
  date: string;
  shifts: ClosedShift[];
}

@Component({
  selector: 'app-eod-reports',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './eod-reports.component.html',
  styleUrls: ['./eod-reports.component.scss'],
})
export class EODReportsComponent implements OnInit {
  private eodService = inject(EODService);
  private electronService = inject(ElectronService);
  private reportsService = inject(ReportsService);
  private notificationService = inject(NotificationService);

  isLoading = signal(true);
  closedShifts = signal<ClosedShift[]>([]);
  shiftDateGroups = computed<ShiftDateGroup[]>(() => {
    const groups = new Map<string, ClosedShift[]>();
    for (const shift of this.closedShifts()) {
      const date = shift.shift_date || shift.end_time?.slice(0, 10) || '';
      const shifts = groups.get(date) || [];
      shifts.push(shift);
      groups.set(date, shifts);
    }

    return [...groups.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([date, shifts]) => ({
        date,
        shifts: shifts.sort((left, right) =>
          left.shift_name.localeCompare(right.shift_name, undefined, {
            sensitivity: 'base',
            numeric: true,
          }),
        ),
      }));
  });
  allUsers = signal<any[]>([]);
  expandedShiftId = signal<number | null>(null);
  selectedShiftDetail = signal<any>(null);

  form = new FormGroup({
    dateFrom: new FormControl(''),
    dateTo: new FormControl(''),
    user_id: new FormControl(''),
  });

  async ngOnInit() {
    await this.loadUsers();
    await this.loadClosedShifts();
    this.isLoading.set(false);
  }

  async loadUsers() {
    try {
      const res = await this.electronService.invoke<any>('user:list', {
        includeInactive: false,
      });
      if (res.success && res.users) {
        this.allUsers.set(res.users);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }

  async loadClosedShifts() {
    try {
      const dateFrom = this.form.controls.dateFrom.value || undefined;
      const dateTo = this.form.controls.dateTo.value || undefined;
      const userId = this.form.controls.user_id.value
        ? Number(this.form.controls.user_id.value)
        : undefined;

      const res = await this.electronService.invoke<any>(
        'eod:list-closed-shifts',
        {
          limit: 100,
          dateFrom,
          dateTo,
          user_id: userId,
        },
      );

      if (res.success) {
        this.closedShifts.set(res.shifts);
      }
    } catch (err) {
      console.error('Failed to load closed shifts:', err);
    }
  }

  async onFilterChange() {
    this.isLoading.set(true);
    await this.loadClosedShifts();
    this.isLoading.set(false);
  }

  async expandShift(shift: ClosedShift) {
    if (this.expandedShiftId() === shift.id) {
      this.expandedShiftId.set(null);
      this.selectedShiftDetail.set(null);
      return;
    }

    try {
      const res = await this.electronService.invoke<any>(
        'eod:get-shift-detail',
        {
          shift_id: shift.id,
        },
      );

      if (res.success) {
        this.selectedShiftDetail.set(res.data);
        this.expandedShiftId.set(shift.id);
      }
    } catch (err) {
      console.error('Failed to load shift details:', err);
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return dateStr;
    }
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '—';
    try {
      const time = new Date(timeStr);
      return time.toLocaleTimeString();
    } catch (e) {
      return timeStr;
    }
  }

  async exportShiftReport(shift: ClosedShift) {
    const detail = await this.loadShiftDetail(shift);
    if (!detail) return;

    const rows = detail.orders.flatMap((order: any) =>
      (order.order_items || []).map((item: any) => ({
        shift_date: shift.shift_date,
        order: order.order_number,
        time: this.formatTime(order.created_at),
        item: item.menu_item_name || 'Item',
        quantity: item.quantity,
        amount: item.total_price,
      })),
    );
    const result = await this.reportsService.saveReportPdf(
      `EOD Report - ${shift.shift_name}`,
      [
        { key: 'order', label: 'Order #' },
        { key: 'shift_date', label: 'Shift Date' },
        { key: 'time', label: 'Time' },
        { key: 'item', label: 'Item' },
        { key: 'quantity', label: 'Qty' },
        { key: 'amount', label: 'Amount' },
      ],
      rows,
    );
    if (result.success) {
      this.notificationService.success(
        'EOD PDF Saved',
        result.message || 'EOD report saved as PDF.',
      );
    } else if (!result.cancelled) {
      this.notificationService.error(
        'Export Failed',
        result.error || 'Could not save EOD report.',
      );
    }
  }

  async printShiftReport(shift: ClosedShift) {
    const detail = await this.loadShiftDetail(shift);
    if (!detail) return;
    const rows = detail.orders.flatMap((order: any) =>
      (order.order_items || []).map((item: any) => ({
        shift_date: shift.shift_date,
        order: order.order_number,
        item: item.menu_item_name || 'Item',
        quantity: item.quantity,
        amount: item.total_price,
      })),
    );
    const result = await this.reportsService.printReport(
      `EOD Report - ${shift.shift_name}`,
      [
        { key: 'order', label: 'Order #' },
        { key: 'shift_date', label: 'Shift Date' },
        { key: 'item', label: 'Item' },
        { key: 'quantity', label: 'Qty' },
        { key: 'amount', label: 'Amount' },
      ],
      rows,
    );
    result.success
      ? this.notificationService.success(
          'EOD Report Printed',
          result.message || 'EOD report sent to printer.',
        )
      : this.notificationService.error(
          'Print Failed',
          result.error || 'Could not print EOD report.',
        );
  }

  private async loadShiftDetail(shift: ClosedShift) {
    if (this.expandedShiftId() === shift.id && this.selectedShiftDetail()) {
      return this.selectedShiftDetail();
    }
    const res = await this.electronService.invoke<any>('eod:get-shift-detail', {
      shift_id: shift.id,
    });
    if (!res.success) {
      this.notificationService.error(
        'Report Error',
        res.error || 'Could not load shift details.',
      );
      return null;
    }
    this.selectedShiftDetail.set(res.data);
    this.expandedShiftId.set(shift.id);
    return res.data;
  }

  onReset() {
    this.form.reset();
    this.expandedShiftId.set(null);
    this.selectedShiftDetail.set(null);
    this.loadClosedShifts();
  }

  getTotalSalesForPeriod(): number {
    return this.closedShifts().reduce(
      (sum, shift) => sum + (shift.total_sales || 0),
      0,
    );
  }

  getTotalOrdersForPeriod(): number {
    return this.closedShifts().reduce(
      (sum, shift) => sum + (shift.total_orders || 0),
      0,
    );
  }

  getAverageSalePerShift(): number {
    const shifts = this.closedShifts();
    if (shifts.length === 0) return 0;
    return this.getTotalSalesForPeriod() / shifts.length;
  }
}
