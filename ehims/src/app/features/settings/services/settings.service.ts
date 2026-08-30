import { Injectable, inject } from '@angular/core';
import { ElectronService } from '../../../core/services/electron.service';
import {
  CompanySettings,
  PrinterSettings,
  SettingsResponse,
} from '../../../core/models/settings.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private electronService = inject(ElectronService);

  async getCompanySettings(): Promise<SettingsResponse<CompanySettings>> {
    return this.electronService.invoke<SettingsResponse<CompanySettings>>(
      'settings:get-company',
    );
  }

  async updateCompanySettings(
    data: Partial<CompanySettings>,
  ): Promise<SettingsResponse<CompanySettings>> {
    return this.electronService.invoke<SettingsResponse<CompanySettings>>(
      'settings:update-company',
      data,
    );
  }

  async getPrinterSettings(): Promise<SettingsResponse<PrinterSettings>> {
    return this.electronService.invoke<SettingsResponse<PrinterSettings>>(
      'settings:get-printer',
    );
  }

  async updatePrinterSettings(
    data: Partial<PrinterSettings>,
  ): Promise<SettingsResponse<PrinterSettings>> {
    return this.electronService.invoke<SettingsResponse<PrinterSettings>>(
      'settings:update-printer',
      data,
    );
  }
}
