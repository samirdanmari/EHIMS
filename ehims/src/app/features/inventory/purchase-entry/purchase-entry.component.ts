import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  FormArray,
  Validators,
} from '@angular/forms';
import { InventoryService } from '../../../core/services/inventory.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  InventoryItem,
  PaymentMethod,
  PurchaseEntry,
} from '../../../core/models/inventory.model';
import { Supplier } from '../../../core/models/supplier.model';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { InventoryTabComponent } from '../../../shared/components/inventory/inventory-tab/inventory-tab.component';

interface PurchaseLineForm {
  item_id: FormControl<number | null>;
  quantity: FormControl<number>;
  unit_cost: FormControl<number>;
}

@Component({
  selector: 'app-purchase-entry',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    InventoryTabComponent,
  ],
  templateUrl: './purchase-entry.component.html',
  styleUrls: ['./purchase-entry.component.scss'],
})
export class PurchaseEntryComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  isLoading = signal(true);
  isSaving = signal(false);
  items = signal<InventoryItem[]>([]);
  suppliers = signal<Supplier[]>([]);
  recentPurchases = signal<PurchaseEntry[]>([]);

  paymentMethods: PaymentMethod[] = [
    'cash',
    'credit',
    'bank_transfer',
    'cheque',
  ];

  form = new FormGroup({
    supplier_id: new FormControl<number | null>(null),
    payment_method: new FormControl<PaymentMethod>('cash', {
      nonNullable: true,
    }),
    notes: new FormControl(''),
    lines: new FormArray<FormGroup<PurchaseLineForm>>([]),
  });

  get lines(): FormArray<FormGroup<PurchaseLineForm>> {
    return this.form.controls.lines;
  }

  isCredit(): boolean {
    return this.form.controls.payment_method.value === 'credit';
  }

  async ngOnInit() {
    this.addLine();
    await Promise.all([
      this.loadItems(),
      this.loadSuppliers(),
      this.loadRecentPurchases(),
    ]);
    this.isLoading.set(false);
  }

  /** Reactive forms aren't signal-based, so this is called directly from the template
   *  on each change-detection pass rather than memoized as a computed signal. */
  grandTotal(): number {
    return this.lines.controls.reduce((sum, line) => {
      const qty = Number(line.controls.quantity.value) || 0;
      const cost = Number(line.controls.unit_cost.value) || 0;
      return sum + qty * cost;
    }, 0);
  }

  async loadItems() {
    const res = await this.inventoryService.listItems();
    if (res.success) this.items.set(res.items);
  }

  async loadSuppliers() {
    const res = await this.inventoryService.listSuppliers();
    if (res.success) this.suppliers.set(res.suppliers);
  }

  async loadRecentPurchases() {
    const res = await this.inventoryService.listPurchases({ limit: 20 });
    if (res.success) this.recentPurchases.set(res.purchases);
  }

  makeLine(): FormGroup<PurchaseLineForm> {
    return new FormGroup<PurchaseLineForm>({
      item_id: new FormControl<number | null>(null, {
        validators: [Validators.required],
      }),
      quantity: new FormControl(1, {
        validators: [Validators.required, Validators.min(0.01)],
        nonNullable: true,
      }),
      unit_cost: new FormControl(0, {
        validators: [Validators.required, Validators.min(0)],
        nonNullable: true,
      }),
    });
  }

  addLine() {
    this.lines.push(this.makeLine());
  }

  removeLine(index: number) {
    if (this.lines.length > 1) {
      this.lines.removeAt(index);
    }
  }

  onItemSelected(index: number, itemId: string) {
    const id = Number(itemId);
    const item = this.items().find((i) => i.id === id);
    const line = this.lines.at(index);
    line.controls.item_id.setValue(id);
    if (item) {
      line.controls.unit_cost.setValue(item.cost_price);
    }
  }

  lineTotal(index: number): number {
    const line = this.lines.at(index);
    return (
      (Number(line.controls.quantity.value) || 0) *
      (Number(line.controls.unit_cost.value) || 0)
    );
  }

  async onSubmit() {
    if (this.form.invalid || this.lines.length === 0 || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.notificationService.error(
        'Not signed in',
        'Could not identify the current user.',
      );
      return;
    }

    this.isSaving.set(true);
    try {
      const value = this.form.getRawValue();
      const res = await this.inventoryService.createPurchase({
        supplier_id: value.supplier_id,
        payment_method: value.payment_method,
        is_credit: value.payment_method === 'credit',
        received_by: userId,
        notes: value.notes || undefined,
        items: value.lines.map((l) => ({
          item_id: l.item_id as number,
          quantity: l.quantity,
          unit_cost: l.unit_cost,
        })),
      });

      if (res.success) {
        this.notificationService.success(
          'Purchase recorded',
          `Total ${res.grandTotal?.toLocaleString('en-NG', { minimumFractionDigits: 2 })} added to stock.`,
        );
        this.resetForm();
        await Promise.all([this.loadItems(), this.loadRecentPurchases()]);
      } else {
        this.notificationService.error(
          'Purchase failed',
          res.error || 'Could not save purchase entry',
        );
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  resetForm() {
    this.lines.clear();
    this.addLine();
    this.form.patchValue({
      supplier_id: null,
      payment_method: 'cash',
      notes: '',
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }
}
