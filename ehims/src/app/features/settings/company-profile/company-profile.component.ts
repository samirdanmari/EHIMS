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
  isUploadingLogo = signal(false);
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
      // Set logo preview if exists
      if (res.data.company_logo) {
        // If it's already base64, use it directly
        if (typeof res.data.company_logo === 'string') {
          this.logoPreview.set(res.data.company_logo);
        } else {
          // If it's a buffer/blob, convert to base64
          const logoBlob = new Blob([res.data.company_logo], {
            type: 'image/png',
          });
          const reader = new FileReader();
          reader.onload = () => {
            this.logoPreview.set(reader.result as string);
          };
          reader.readAsDataURL(logoBlob);
        }
      }
    }
    this.isLoading.set(false);
  }

  onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.notificationService.error(
          'Invalid File',
          'Please select an image file',
        );
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.notificationService.error(
          'File Too Large',
          'Image must be smaller than 5MB',
        );
        return;
      }

      // Read and preview
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        this.logoPreview.set(base64);

        // Upload immediately
        await this.uploadLogo(base64);
      };
      reader.readAsDataURL(file);
    }
  }

  async uploadLogo(logoBase64: string) {
    this.isUploadingLogo.set(true);
    const res = await this.settingsService.uploadLogo(logoBase64);
    this.isUploadingLogo.set(false);

    if (res.success) {
      this.notificationService.success(
        'Logo Uploaded',
        'Company logo has been updated successfully',
      );
    } else {
      this.notificationService.error(
        'Upload Failed',
        res.error || 'Could not upload logo',
      );
    }
  }

  async deleteLogo() {
    if (!this.logoPreview()) {
      this.notificationService.warning('No Logo', 'There is no logo to delete');
      return;
    }

    this.isUploadingLogo.set(true);
    const res = await this.settingsService.deleteLogo();
    this.isUploadingLogo.set(false);

    if (res.success) {
      this.logoPreview.set('');
      this.notificationService.success(
        'Logo Deleted',
        'Company logo has been removed',
      );
    } else {
      this.notificationService.error(
        'Delete Failed',
        res.error || 'Could not delete logo',
      );
    }
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
