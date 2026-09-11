import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { CustomerService } from '../../../core/services/customer.service';
import { NotificationService } from '../../../core/services/notification.service';
import { RegularCustomer } from '../../../core/models/customer.model';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './customer-form.component.html',
  styleUrls: ['./customer-form.component.scss'],
})
export class CustomerFormComponent implements OnInit {
  @Input() customer: RegularCustomer | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private customerService = inject(CustomerService);
  private notificationService = inject(NotificationService);

  isSaving = signal(false);

  form = new FormGroup({
    full_name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    phone: new FormControl(''),
    email: new FormControl('', [Validators.email]),
    address: new FormControl(''),
    credit_limit: new FormControl<number>(0, [Validators.min(0)]),
    notes: new FormControl(''),
  });

  get isEdit(): boolean {
    return !!this.customer;
  }

  ngOnInit() {
    if (this.customer) {
      this.form.patchValue({
        full_name: this.customer.full_name,
        phone: this.customer.phone || '',
        email: this.customer.email || '',
        address: this.customer.address || '',
        credit_limit: this.customer.credit_limit,
        notes: this.customer.notes || '',
      });
    }
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    try {
      const value = this.form.value;

      if (this.isEdit && this.customer) {
        const res = await this.customerService.updateCustomer({
          id: this.customer.id,
          full_name: value.full_name ?? undefined,
          phone: value.phone || undefined,
          email: value.email || undefined,
          address: value.address || undefined,
          credit_limit: value.credit_limit ?? 0,
          notes: value.notes || undefined,
        });

        if (!res.success) {
          this.notificationService.error('Update failed', res.error || 'Could not update customer');
          return;
        }
      } else {
        const res = await this.customerService.createCustomer({
          full_name: value.full_name!,
          phone: value.phone || undefined,
          email: value.email || undefined,
          address: value.address || undefined,
          credit_limit: value.credit_limit ?? 0,
          notes: value.notes || undefined,
        });

        if (!res.success) {
          this.notificationService.error('Create failed', res.error || 'Could not create customer');
          return;
        }
      }

      this.saved.emit();
    } finally {
      this.isSaving.set(false);
    }
  }

  onCancel() {
    this.cancelled.emit();
  }

  hasError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }
}
