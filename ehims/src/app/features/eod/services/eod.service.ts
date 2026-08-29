import { Injectable, inject } from '@angular/core';
import { ElectronService } from '../../../core/services/electron.service';
import {
  EODReport,
  ShiftHandover,
  ShiftCloseInput,
  EODSummary,
} from '../../../core/models/eod.model';

interface CloseShiftResponse {
  success: boolean;
  handoverId?: number;
  eodReport?: EODSummary;
  error?: string;
}
interface EODReportResponse {
  success: boolean;
  report?: EODReport;
  error?: string;
}
interface ListReportsResponse {
  success: boolean;
  reports: EODReport[];
  error?: string;
}
interface HandoverResponse {
  success: boolean;
  handover?: ShiftHandover;
  error?: string;
}
interface ListHandoversResponse {
  success: boolean;
  handovers: ShiftHandover[];
  error?: string;
}
interface Shift {
  id: number;
  shift_name: string;
  user_id: number;
  start_time: string;
  status: string;
  opening_cash: number;
}
interface OpenShiftResponse {
  success: boolean;
  shift?: Shift;
  error?: string;
}
interface ListShiftsResponse {
  success: boolean;
  shifts: (Shift & { user_name?: string })[];
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class EODService {
  private electronService = inject(ElectronService);

  // ============ SHIFT MANAGEMENT ============
  openShift(payload: {
    shift_name: string;
    user_id: number;
    opening_cash?: number;
  }): Promise<OpenShiftResponse> {
    return this.electronService.invoke<OpenShiftResponse>(
      'shift:open',
      payload,
    );
  }

  listActiveShifts(): Promise<ListShiftsResponse> {
    return this.electronService.invoke<ListShiftsResponse>('shift:list-active');
  }

  closeShift(payload: ShiftCloseInput): Promise<CloseShiftResponse> {
    return this.electronService.invoke<CloseShiftResponse>(
      'eod:close-shift',
      payload,
    );
  }

  getEODReport(reportDate: string): Promise<EODReportResponse> {
    return this.electronService.invoke<EODReportResponse>('eod:get-report', {
      report_date: reportDate,
    });
  }

  listEODReports(
    params: { limit?: number; dateFrom?: string; dateTo?: string } = {},
  ): Promise<ListReportsResponse> {
    return this.electronService.invoke<ListReportsResponse>(
      'eod:list-reports',
      params,
    );
  }

  getHandover(handoverId: number): Promise<HandoverResponse> {
    return this.electronService.invoke<HandoverResponse>('eod:get-handover', {
      handover_id: handoverId,
    });
  }

  listHandovers(limit = 50): Promise<ListHandoversResponse> {
    return this.electronService.invoke<ListHandoversResponse>(
      'eod:list-handovers',
      { limit },
    );
  }

  signHandover(
    handoverId: number,
    signature: string,
    isIncoming = false,
  ): Promise<HandoverResponse> {
    return this.electronService.invoke<HandoverResponse>('eod:sign-handover', {
      handover_id: handoverId,
      signature,
      is_incoming: isIncoming,
    });
  }
}
