import { Injectable, inject } from '@angular/core';
import { ElectronService } from '../../../core/services/electron.service';
import { PrinterInfo } from '../../../core/models/settings.model';

interface PrinterResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class PrinterService {
  private electronService = inject(ElectronService);

  async listAvailablePrinters(): Promise<PrinterResponse<PrinterInfo[]>> {
    return this.electronService.invoke<PrinterResponse<PrinterInfo[]>>(
      'printer:list-available',
    );
  }

  async testPrint(
    printerName: string,
    content: string,
  ): Promise<PrinterResponse<void>> {
    return this.electronService.invoke<PrinterResponse<void>>(
      'printer:test-print',
      { printerName, content },
    );
  }

  async getDefaultPrinter(): Promise<PrinterResponse<string>> {
    return this.electronService.invoke<PrinterResponse<string>>(
      'printer:get-default',
    );
  }

  getReceiptTemplate(companyName: string, settings: any): string {
    const width = settings.line_width || 32;
    const line = '='.repeat(width);

    return `${line}
${this.centerText(companyName, width)}
${line}

Date: ${new Date().toLocaleString()}

${line}
Receipt
${line}

Item 1: ₦1,000.00
Item 2: ₦500.00

${line}
TOTAL: ₦1,500.00
${line}

Thank you for your purchase!

    `;
  }

  private centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }
}
