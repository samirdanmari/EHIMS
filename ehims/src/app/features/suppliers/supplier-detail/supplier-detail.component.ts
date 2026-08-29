import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { SupplierService } from '../services/supplier.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { Supplier } from '../../../core/models/supplier.model';

interface Purchase {
  id: number;
  purchase_date: string;
  total_cost: number;
  items: string;
}

interface Payment {
  id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference_number?: string;
  recorded_by_name?: string;
  notes?: string;
}

interface SupplierDetail {
  supplier: Supplier;
  purchases: Purchase[];
  payments: Payment[];
}

@Component({
  selector: 'app-supplier-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    CurrencyPipe,
    ConfirmDialogComponent,
  ],
  templateUrl: './supplier-detail.component.html',
  styleUrls: ['./supplier-detail.component.scss'],
})
export class SupplierDetailComponent implements OnInit {
  private supplierService = inject(SupplierService);
  private notificationService = inject(NotificationService);
  private route = inject(ActivatedRoute);

  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;

  isLoading = signal(true);
  isSaving = signal(false);
  activeTab = signal<'overview' | 'purchases' | 'payments'>('overview');
  supplier = signal<Supplier | null>(null);
  purchases = signal<Purchase[]>([]);
  payments = signal<Payment[]>([]);

  paymentForm = new FormGroup({
    amount: new FormControl(0, {
      validators: [Validators.required, Validators.min(1)],
      nonNullable: true,
    }),
    payment_method: new FormControl('bank_transfer', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    reference_number: new FormControl(''),
    notes: new FormControl(''),
  });

  isAddingPayment = signal(false);
  totalPurchases = signal(0);
  totalPaid = signal(0);
  balanceOutstanding = signal(0);

  async ngOnInit() {
    const supplierId = this.route.snapshot.paramMap.get('id');
    if (supplierId) {
      await this.loadSupplierDetails(parseInt(supplierId));
    }
    this.isLoading.set(false);
  }

  async loadSupplierDetails(supplierId: number) {
    const res = await this.supplierService.getSupplierWithItems(supplierId);
    if (res.success && res.data) {
      const data = res.data as SupplierDetail;
      this.supplier.set(data.supplier);
      this.purchases.set(data.purchases);
      this.payments.set(data.payments);
      this.calculateTotals();
    }
  }

  calculateTotals() {
    const purchases = this.purchases();
    const payments = this.payments();

    const totalPurchases = purchases.reduce(
      (sum, p) => sum + (p.total_cost || 0),
      0,
    );
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    this.totalPurchases.set(totalPurchases);
    this.totalPaid.set(totalPaid);
    this.balanceOutstanding.set(totalPurchases - totalPaid);
  }

  async addPayment() {
    if (!this.paymentForm.valid || !this.supplier()) return;

    this.isSaving.set(true);
    const supplierId = this.supplier()!.id;
    const payload = {
      supplier_id: supplierId,
      ...this.paymentForm.value,
      recorded_by: 1, // Current user ID - should be from auth service
    } as any;

    const res = await this.supplierService.recordPayment(payload);
    this.isSaving.set(false);

    if (res.success) {
      this.notificationService.success(
        'Payment recorded',
        'Payment has been recorded successfully.',
      );
      this.paymentForm.reset({ payment_method: 'bank_transfer', amount: 0 });
      this.isAddingPayment.set(false);
      await this.loadSupplierDetails(supplierId);
    } else {
      this.notificationService.error(
        'Failed to record payment',
        res.error || 'Unknown error',
      );
    }
  }

  setTab(tab: 'overview' | 'purchases' | 'payments') {
    this.activeTab.set(tab);
  }
}
