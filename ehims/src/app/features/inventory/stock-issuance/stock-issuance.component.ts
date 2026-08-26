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
import { ElectronService } from '../../../core/services/electron.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  ActiveShift,
  InventoryItem,
  StockIssuance,
  StockIssuanceItem,
} from '../../../core/models/inventory.model';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { InventoryTabComponent } from '../../../shared/components/inventory/inventory-tab/inventory-tab.component';

interface StaffOption {
  id: number;
  display_name: string;
  role: string;
}

interface IssuanceLineForm {
  item_id: FormControl<number | null>;
  quantity: FormControl<number>;
}

@Component({
  selector: 'app-stock-issuance',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    InventoryTabComponent,
  ],
  templateUrl: './stock-issuance.component.html',
  styleUrls: ['./stock-issuance.component.scss'],
})
export class StockIssuanceComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private authService = inject(AuthService);
  private electronService = inject(ElectronService);
  private notificationService = inject(NotificationService);

  isLoading = signal(true);
  isSaving = signal(false);
  items = signal<InventoryItem[]>([]);
  activeShifts = signal<ActiveShift[]>([]);
  staffOptions = signal<StaffOption[]>([]);
  recentIssuances = signal<StockIssuance[]>([]);

  expandedIssuanceId = signal<number | null>(null);
  expandedIssuanceItems = signal<StockIssuanceItem[]>([]);

  form = new FormGroup({
    shift_id: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    received_by: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    notes: new FormControl(''),
    lines: new FormArray<FormGroup<IssuanceLineForm>>([]),
  });

  get lines(): FormArray<FormGroup<IssuanceLineForm>> {
    return this.form.controls.lines;
  }

  async ngOnInit() {
    this.addLine();
    await Promise.all([
      this.loadItems(),
      this.loadShifts(),
      this.loadStaff(),
      this.loadRecentIssuances(),
    ]);
    this.isLoading.set(false);
  }

  async loadStaff() {
    const res = await this.electronService.invoke<{
      rows: StaffOption[];
      error: string | null;
    }>('db:query', {
      sql: `SELECT id, display_name, role FROM users WHERE is_active = 1 ORDER BY display_name ASC`,
    });
    this.staffOptions.set(res?.rows ?? []);
  }

  async loadItems() {
    const res = await this.inventoryService.listItems();
    if (res.success) this.items.set(res.items);
  }

  async loadShifts() {
    const res = await this.inventoryService.listActiveShifts();
    if (res.success) this.activeShifts.set(res.shifts);
  }

  async loadRecentIssuances() {
    const res = await this.inventoryService.listIssuances({ limit: 20 });
    if (res.success) this.recentIssuances.set(res.issuances);
  }

  makeLine(): FormGroup<IssuanceLineForm> {
    return new FormGroup<IssuanceLineForm>({
      item_id: new FormControl<number | null>(null, {
        validators: [Validators.required],
      }),
      quantity: new FormControl(1, {
        validators: [Validators.required, Validators.min(0.01)],
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

  availableStock(itemId: number | null): number {
    if (!itemId) return 0;
    return this.items().find((i) => i.id === itemId)?.current_stock ?? 0;
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
      const res = await this.inventoryService.createIssuance({
        shift_id: value.shift_id as number,
        issued_by: userId,
        received_by: value.received_by as number,
        notes: value.notes || undefined,
        items: value.lines.map((l) => ({
          item_id: l.item_id as number,
          quantity: l.quantity,
        })),
      });

      if (res.success) {
        this.notificationService.success(
          'Stock issued',
          'Items have been issued and deducted from inventory.',
        );
        this.resetForm();
        await Promise.all([this.loadItems(), this.loadRecentIssuances()]);
      } else {
        this.notificationService.error(
          'Issuance failed',
          res.error || 'Could not record stock issuance',
        );
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  resetForm() {
    this.lines.clear();
    this.addLine();
    this.form.patchValue({ shift_id: null, received_by: null, notes: '' });
  }

  async toggleExpand(issuance: StockIssuance) {
    if (this.expandedIssuanceId() === issuance.id) {
      this.expandedIssuanceId.set(null);
      return;
    }
    const res = await this.inventoryService.getIssuanceItems(issuance.id);
    if (res.success) {
      this.expandedIssuanceItems.set(res.items);
      this.expandedIssuanceId.set(issuance.id);
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }
}
