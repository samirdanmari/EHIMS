import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../../core/services/customer.service';
import { NotificationService } from '../../../core/services/notification.service';
import { RegularCustomer } from '../../../core/models/customer.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { CustomerFormComponent } from '../customer-form/customer-form.component';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    CurrencyPipe,
    ConfirmDialogComponent,
    CustomerFormComponent,
  ],
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.scss'],
})
export class CustomerListComponent implements OnInit {
  private customerService = inject(CustomerService);
  private notificationService = inject(NotificationService);

  customers = signal<RegularCustomer[]>([]);
  isLoading = signal(true);
  searchTerm = signal('');
  showForm = signal(false);
  editingCustomer = signal<RegularCustomer | null>(null);

  filteredCustomers = computed(() => {
    const q = this.searchTerm().toLowerCase();
    if (!q) return this.customers();
    return this.customers().filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)),
    );
  });

  async ngOnInit() {
    await this.loadCustomers();
  }

  async loadCustomers() {
    this.isLoading.set(true);
    const res = await this.customerService.listCustomers();
    if (res.success) {
      this.customers.set(res.data);
    } else {
      this.notificationService.error('Error', res.error || 'Failed to load customers');
    }
    this.isLoading.set(false);
  }

  openCreateForm() {
    this.editingCustomer.set(null);
    this.showForm.set(true);
  }

  openEditForm(customer: RegularCustomer) {
    this.editingCustomer.set(customer);
    this.showForm.set(true);
  }

  async onFormSaved() {
    this.showForm.set(false);
    await this.loadCustomers();
    this.notificationService.success(
      'Saved',
      this.editingCustomer() ? 'Customer updated.' : 'Customer created.',
    );
  }

  onFormCancelled() {
    this.showForm.set(false);
  }

  getStatusClass(customer: RegularCustomer): string {
    if (customer.outstanding_balance > 0) return 'badge-credit';
    return 'badge-paid';
  }

  getStatusLabel(customer: RegularCustomer): string {
    if (customer.outstanding_balance > 0)
      return `Credit ₦${customer.outstanding_balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    return 'Paid Up';
  }
}
