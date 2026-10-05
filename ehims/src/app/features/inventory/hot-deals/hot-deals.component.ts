import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  HotDeal,
  HotDealDirection,
  HotDealItem,
  HotDealPaymentMethod,
  InventoryItem,
} from '../../../core/models/inventory.model';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { InventoryTabComponent } from '../../../shared/components/inventory/inventory-tab/inventory-tab.component';

interface HotDealLineForm {
  item_id: FormControl<number | null>;
  quantity: FormControl<number>;
  regular_unit_rate: FormControl<number>;
  deal_unit_rate: FormControl<number>;
}

@Component({
  selector: 'app-hot-deals',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    InventoryTabComponent,
  ],
  templateUrl: './hot-deals.component.html',
  styleUrls: ['./hot-deals.component.scss'],
})
export class HotDealsComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  isLoading = signal(true);
  isSaving = signal(false);
  items = signal<InventoryItem[]>([]);
  deals = signal<HotDeal[]>([]);
  expandedDealId = signal<number | null>(null);
  expandedItems = signal<HotDealItem[]>([]);

  form = new FormGroup({
    partner_name: new FormControl('', {
      validators: [Validators.required, Validators.maxLength(120)],
      nonNullable: true,
    }),
    direction: new FormControl<HotDealDirection>('out', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    payment_method: new FormControl<HotDealPaymentMethod>('cash', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    notes: new FormControl('', { nonNullable: true }),
    lines: new FormArray<FormGroup<HotDealLineForm>>([]),
  });

  get lines(): FormArray<FormGroup<HotDealLineForm>> {
    return this.form.controls.lines;
  }

  async ngOnInit() {
    this.addLine();
    try {
      await Promise.all([this.loadItems(), this.loadDeals()]);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadItems() {
    const result = await this.inventoryService.listItems();
    if (result.success) this.items.set(result.items);
  }

  async loadDeals() {
    const result = await this.inventoryService.listHotDeals(30);
    if (result.success) this.deals.set(result.deals);
  }

  makeLine(): FormGroup<HotDealLineForm> {
    return new FormGroup<HotDealLineForm>({
      item_id: new FormControl<number | null>(null, {
        validators: [Validators.required],
      }),
      quantity: new FormControl(1, {
        validators: [Validators.required, Validators.min(0.01)],
        nonNullable: true,
      }),
      regular_unit_rate: new FormControl(0, {
        validators: [Validators.required, Validators.min(0)],
        nonNullable: true,
      }),
      deal_unit_rate: new FormControl(0, {
        validators: [Validators.required, Validators.min(0)],
        nonNullable: true,
      }),
    });
  }

  addLine() {
    this.lines.push(this.makeLine());
  }

  removeLine(index: number) {
    if (this.lines.length > 1) this.lines.removeAt(index);
  }

  setDirection(direction: HotDealDirection) {
    this.form.controls.direction.setValue(direction);
  }

  onItemSelected(index: number) {
    const line = this.lines.at(index);
    const item = this.items().find(
      (candidate) => candidate.id === line.controls.item_id.value,
    );
    if (!item) return;
    line.patchValue({
      regular_unit_rate: item.cost_price,
      deal_unit_rate: item.cost_price,
    });
  }

  availableStock(itemId: number | null): number {
    return this.items().find((item) => item.id === itemId)?.current_stock ?? 0;
  }

  outgoingStockIsAvailable(): boolean {
    if (this.form.controls.direction.value === 'in') return true;
    const requested = new Map<number, number>();
    for (const line of this.lines.controls) {
      const itemId = line.controls.item_id.value;
      if (itemId === null) continue;
      requested.set(
        itemId,
        (requested.get(itemId) || 0) + line.controls.quantity.value,
      );
    }
    return [...requested].every(
      ([itemId, quantity]) => quantity <= this.availableStock(itemId),
    );
  }

  lineDiscount(line: FormGroup<HotDealLineForm>): number {
    const value = line.getRawValue();
    return Math.max(
      0,
      value.quantity * (value.regular_unit_rate - value.deal_unit_rate),
    );
  }

  lineTotal(line: FormGroup<HotDealLineForm>): number {
    const value = line.getRawValue();
    return value.quantity * value.deal_unit_rate;
  }

  totalDiscount(): number {
    return this.lines.controls.reduce(
      (total, line) => total + this.lineDiscount(line),
      0,
    );
  }

  totalAmount(): number {
    return this.lines.controls.reduce(
      (total, line) => total + this.lineTotal(line),
      0,
    );
  }

  ratesAreValid(): boolean {
    return this.lines.controls.every(
      (line) =>
        line.controls.deal_unit_rate.value <=
        line.controls.regular_unit_rate.value,
    );
  }

  async onSubmit() {
    if (this.form.invalid || !this.ratesAreValid() || this.isSaving()) {
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
      const result = await this.inventoryService.createHotDeal({
        partner_name: value.partner_name.trim(),
        direction: value.direction,
        payment_method: value.payment_method,
        recorded_by: userId,
        notes: value.notes || undefined,
        items: value.lines.map((line) => ({
          item_id: line.item_id as number,
          quantity: line.quantity,
          regular_unit_rate: line.regular_unit_rate,
          deal_unit_rate: line.deal_unit_rate,
        })),
      });
      if (!result.success) {
        this.notificationService.error(
          'Deal not saved',
          result.error || 'Could not record this deal.',
        );
        return;
      }

      this.notificationService.success(
        'Deal recorded',
        `Inventory ${value.direction === 'in' ? 'received from' : 'issued to'} ${value.partner_name.trim()}.`,
      );
      this.resetForm();
      await Promise.all([this.loadItems(), this.loadDeals()]);
    } catch (error) {
      this.notificationService.error(
        'Deal not saved',
        error instanceof Error ? error.message : 'Could not record this deal.',
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  resetForm() {
    this.lines.clear();
    this.addLine();
    this.form.reset({
      partner_name: '',
      direction: 'out',
      payment_method: 'cash',
      notes: '',
    });
  }

  async toggleExpand(deal: HotDeal) {
    if (this.expandedDealId() === deal.id) {
      this.expandedDealId.set(null);
      return;
    }
    const result = await this.inventoryService.getHotDealItems(deal.id);
    if (result.success) {
      this.expandedItems.set(result.items);
      this.expandedDealId.set(deal.id);
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }
}
