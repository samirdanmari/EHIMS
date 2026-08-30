import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { SettingsService } from '../services/settings.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CompanySettings } from '../../../core/models/settings.model';

@Component({
  selector: 'app-company-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './company-profile.component.html',
  styleUrls: ['./company-profile.component.scss'],
})
export class CompanyProfileComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private notificationService = inject(NotificationService);

  isLoading = signal(false);
  isSaving = signal(false);
  logoPreview = signal<string>('');

  companyForm = new FormGroup({
    company_name: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    registration_number: new FormControl(''),
    tax_id: new FormControl(''),
    address: new FormControl(''),
    phone: new FormControl(''),
    email: new FormControl('', {
      validators: [Validators.email],
      nonNullable: true,
    }),
    website: new FormControl(''),
    currency: new FormControl('NGN', { nonNullable: true }),
    timezone: new FormControl('Africa/Lagos', { nonNullable: true }),
    business_hours_open: new FormControl('08:00', { nonNullable: true }),
    business_hours_close: new FormControl('20:00', { nonNullable: true }),
  });

  currencies = ['NGN', 'USD', 'EUR', 'GBP'];
  timezones = ['Africa/Lagos', 'Africa/Johannesburg', 'Africa/Cairo', 'UTC'];

  async ngOnInit() {
    await this.loadSettings();
  }

  async loadSettings() {
    this.isLoading.set(true);
    const res = await this.settingsService.getCompanySettings();
    if (res.success && res.data) {
      this.companyForm.patchValue(res.data);
    }
    this.isLoading.set(false);
  }

  async onSave() {
    if (!this.companyForm.valid) {
      this.notificationService.error(
        'Validation Error',
        'Please check all required fields',
      );
      return;
    }

    this.isSaving.set(true);
    const res = await this.settingsService.updateCompanySettings(
      this.companyForm.value as Partial<CompanySettings>,
    );
    this.isSaving.set(false);

    if (res.success) {
      this.notificationService.success(
        'Settings Saved',
        'Company settings have been updated successfully',
      );
    } else {
      this.notificationService.error(
        'Failed to Save',
        res.error || 'Unknown error',
      );
    }
  }

  onReset() {
    this.loadSettings();
  }
}
