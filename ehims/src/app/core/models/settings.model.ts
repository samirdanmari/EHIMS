export interface CompanySettings {
  id?: number;
  company_name: string;
  company_logo?: string; // base64 encoded or URL
  registration_number?: string;
  tax_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  currency: string; // NGN, USD, etc
  timezone: string; // Africa/Lagos
  business_hours_open: string; // HH:MM
  business_hours_close: string; // HH:MM
  created_at?: string;
  updated_at?: string;
}

export interface PrinterSettings {
  id?: number;
  default_printer?: string;
  paper_width: '58mm' | '80mm';
  font_size_normal: number;
  font_size_small: number;
  font_size_large: number;
  logo_on_receipt: boolean;
  line_width: number;
  created_at?: string;
  updated_at?: string;
}

export interface PrinterInfo {
  name: string;
  displayName: string;
  isDefault: boolean;
}

export interface SettingsResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
