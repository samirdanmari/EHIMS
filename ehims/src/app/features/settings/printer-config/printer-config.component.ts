import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { SettingsService } from '../services/settings.service';
import { PrinterService } from '../services/printer.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  PrinterSettings,
  PrinterInfo,
} from '../../../core/models/settings.model';

@Component({
  selector: 'app-printer-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './printer-config.component.html',
  styleUrls: ['./printer-config.component.scss'],
})
export class PrinterConfigComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private printerService = inject(PrinterService);
  private notificationService = inject(NotificationService);

  isLoading = signal(false);
  isSaving = signal(false);
  isTesting = signal(false);
  availablePrinters = signal<PrinterInfo[]>([]);
  previewContent = signal('');

  printerForm = new FormGroup({
    default_printer: new FormControl(''),
    paper_width: new FormControl('58mm', { nonNullable: true }),
    font_size_normal: new FormControl(12, { nonNullable: true }),
    font_size_small: new FormControl(10, { nonNullable: true }),
    font_size_large: new FormControl(14, { nonNullable: true }),
    logo_on_receipt: new FormControl(true, { nonNullable: true }),
    line_width: new FormControl(32, { nonNullable: true }),
  });

  paperWidths = ['58mm', '80mm'];

  async ngOnInit() {
    await this.loadSettings();
    await this.loadPrinters();
    this.updatePreview();
  }

  async loadSettings() {
    this.isLoading.set(true);
    const res = await this.settingsService.getPrinterSettings();
    if (res.success && res.data) {
      this.printerForm.patchValue(res.data);
    }
    this.isLoading.set(false);
  }

  async loadPrinters() {
    const res = await this.printerService.listAvailablePrinters();
    if (res.success && res.data) {
      this.availablePrinters.set(res.data);
      if (
        !this.printerForm.get('default_printer')?.value &&
        res.data.length > 0
      ) {
        this.printerForm.patchValue({ default_printer: res.data[0].name });
      }
    }
  }

  updatePreview() {
    const companyName = 'My Restaurant';
    const settings = this.printerForm.value;
    this.previewContent.set(
      this.printerService.getReceiptTemplate(companyName, settings),
    );
  }

  async onSave() {
    if (!this.printerForm.valid) {
      this.notificationService.error(
        'Validation Error',
        'Please check all fields',
      );
      return;
    }

    this.isSaving.set(true);
    const res = await this.settingsService.updatePrinterSettings(
      this.printerForm.value as Partial<PrinterSettings>,
    );
    this.isSaving.set(false);

    if (res.success) {
      this.notificationService.success(
        'Settings Saved',
        'Printer settings updated successfully',
      );
      this.updatePreview();
    } else {
      this.notificationService.error(
        'Failed to Save',
        res.error || 'Unknown error',
      );
    }
  }

  async onTestPrint() {
    const printerName = this.printerForm.get('default_printer')?.value || '';

    if (!printerName) {
      this.notificationService.error(
        'No Printer Selected',
        'Please select a printer first',
      );
      return;
    }

    this.isTesting.set(true);
    const content = this.previewContent();
    const res = await this.printerService.testPrint(printerName, content);
    this.isTesting.set(false);

    if (res.success) {
      this.notificationService.success(
        'Test Print Sent',
        res.message || 'Test page sent to printer',
      );
    } else {
      this.notificationService.error(
        'Test Print Failed',
        res.error || 'Could not send test print',
      );
    }
  }

  onReset() {
    this.loadSettings();
  }
}
