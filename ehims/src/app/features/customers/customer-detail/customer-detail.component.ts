import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { CustomerService } from '../../../core/services/customer.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  RegularCustomer,
  CustomerPurchase,
  CustomerPayment,
} from '../../../core/models/customer.model';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { CustomerFormComponent } from '../customer-form/customer-form.component';
import { ReportsService } from '../../reports/services/reports.service';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    CurrencyPipe,
    CustomerFormComponent,
  ],
  templateUrl: './customer-detail.component.html',
  styleUrls: ['./customer-detail.component.scss'],
})
export class CustomerDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private customerService = inject(CustomerService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private reportsService = inject(ReportsService);

  customer = signal<RegularCustomer | null>(null);
  purchases = signal<CustomerPurchase[]>([]);
  payments = signal<CustomerPayment[]>([]);
  isLoading = signal(true);
  isRecordingPayment = signal(false);
  showPaymentForm = signal(false);
  showEditForm = signal(false);
  isExporting = signal(false);

  activeTab = signal<'purchases' | 'payments'>('purchases');

  paymentForm = new FormGroup({
    amount: new FormControl<number>(0, [
      Validators.required,
      Validators.min(0.01),
    ]),
    payment_method: new FormControl<'cash' | 'card' | 'transfer'>(
      'cash',
      Validators.required,
    ),
    order_id: new FormControl<number | null>(null),
    reference: new FormControl(''),
    notes: new FormControl(''),
  });

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    await this.loadCustomer(id);
  }

  async loadCustomer(id: number) {
    this.isLoading.set(true);
    const res = await this.customerService.getCustomer(id);
    if (res.success && res.data) {
      this.customer.set(res.data.customer);
      this.purchases.set(res.data.purchases);
      this.payments.set(res.data.payments);
    } else {
      this.notificationService.error(
        'Error',
        res.error || 'Failed to load customer',
      );
    }
    this.isLoading.set(false);
  }

  async onRecordPayment() {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const cust = this.customer();
    if (!cust) return;

    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) {
      this.notificationService.error(
        'Error',
        'Could not identify current user',
      );
      return;
    }

    this.isRecordingPayment.set(true);
    try {
      const val = this.paymentForm.value;
      const res = await this.customerService.recordPayment({
        customer_id: cust.id,
        order_id: val.order_id || undefined,
        amount: val.amount!,
        payment_method: val.payment_method!,
        reference: val.reference || undefined,
        recorded_by: currentUserId,
        notes: val.notes || undefined,
      });

      if (res.success) {
        this.notificationService.success(
          'Payment Recorded',
          `₦${val.amount?.toLocaleString()} recorded successfully.`,
        );
        this.showPaymentForm.set(false);
        this.paymentForm.reset({ payment_method: 'cash', amount: 0 });
        await this.loadCustomer(cust.id);
      } else {
        this.notificationService.error(
          'Failed',
          res.error || 'Could not record payment',
        );
      }
    } finally {
      this.isRecordingPayment.set(false);
    }
  }

  onEditSaved() {
    this.showEditForm.set(false);
    const cust = this.customer();
    if (cust) this.loadCustomer(cust.id);
    this.notificationService.success('Updated', 'Customer profile updated.');
  }

  getCreditStatusClass(p: CustomerPurchase): string {
    if (!p.is_credit) return 'badge-paid';
    if (p.credit_status === 'paid') return 'badge-paid';
    if (p.credit_status === 'partial') return 'badge-partial';
    return 'badge-credit';
  }

  getCreditStatusLabel(p: CustomerPurchase): string {
    if (!p.is_credit) return 'Paid';
    if (p.credit_status === 'paid') return 'Credit — Settled';
    if (p.credit_status === 'partial') return 'Credit — Partial';
    return 'Credit — Unpaid';
  }

  get unpaidOrders(): CustomerPurchase[] {
    return this.purchases().filter(
      (p) => p.is_credit && p.credit_status !== 'paid',
    );
  }

  private getReportRows(): Array<Record<string, unknown>> {
    return this.purchases().map((purchase) => ({
      order_number: purchase.order_number,
      date: new Date(purchase.created_at).toLocaleDateString('en-GB'),
      items: purchase.items
        .map((item) => `${item.menu_item_name} x${item.quantity}`)
        .join(', '),
      total: purchase.total_amount,
      paid: purchase.amount_paid,
      status: this.getCreditStatusLabel(purchase),
    }));
  }

  async printReport() {
    await this.exportReport('print');
  }

  async savePdf() {
    await this.exportReport('pdf');
  }

  private async exportReport(type: 'print' | 'pdf') {
    const cust = this.customer();
    if (!cust || this.isExporting()) return;

    this.isExporting.set(true);
    const title = `Customer Report - ${cust.full_name}`;
    const columns = [
      { key: 'order_number', label: 'Order #' },
      { key: 'date', label: 'Date' },
      { key: 'items', label: 'Items' },
      { key: 'total', label: 'Total' },
      { key: 'paid', label: 'Paid' },
      { key: 'status', label: 'Status' },
    ];

    try {
      const result =
        type === 'pdf'
          ? await this.reportsService.saveReportPdf(
              title,
              columns,
              this.getReportRows(),
            )
          : await this.reportsService.printReport(
              title,
              columns,
              this.getReportRows(),
            );

      if (result.success) {
        this.notificationService.success(
          type === 'pdf' ? 'PDF Saved' : 'Report Printed',
          result.message ||
            (type === 'pdf'
              ? 'Customer report PDF saved.'
              : 'Customer report sent to printer.'),
        );
      } else if (!('cancelled' in result) || !result.cancelled) {
        this.notificationService.error(
          type === 'pdf' ? 'Export Failed' : 'Print Failed',
          result.error || 'Could not export customer report.',
        );
      }
    } finally {
      this.isExporting.set(false);
    }
  }
}
