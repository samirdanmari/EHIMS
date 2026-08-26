import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { InventoryService } from '../../../core/services/inventory.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Category, InventoryItem } from '../../../core/models/inventory.model';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { InventoryTabComponent } from '../../../shared/components/inventory/inventory-tab/inventory-tab.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ViewChild } from '@angular/core';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    InventoryTabComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.scss'],
})
export class InventoryListComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private notificationService = inject(NotificationService);

  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;

  isLoading = signal(true);
  isSaving = signal(false);
  items = signal<InventoryItem[]>([]);
  categories = signal<Category[]>([]);

  searchTerm = signal('');
  selectedCategoryId = signal<number | null>(null);
  onlyLowStock = signal(false);

  isModalOpen = signal(false);
  editingItem = signal<InventoryItem | null>(null);

  form = new FormGroup({
    name: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    category_id: new FormControl<number | null>(null),
    unit: new FormControl('pcs', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    cost_price: new FormControl(0, {
      validators: [Validators.required, Validators.min(0)],
      nonNullable: true,
    }),
    opening_stock: new FormControl(0, {
      validators: [Validators.required, Validators.min(0)],
      nonNullable: true,
    }),
    low_stock_threshold: new FormControl(5, {
      validators: [Validators.required, Validators.min(0)],
      nonNullable: true,
    }),
  });

  filteredItems = computed(() => this.items());

  lowStockCount = computed(
    () =>
      this.items().filter((i) => i.current_stock <= i.low_stock_threshold)
        .length,
  );
  totalStockValue = computed(() =>
    this.items().reduce((sum, i) => sum + i.current_stock * i.cost_price, 0),
  );

  async ngOnInit() {
    await this.loadCategories();
    await this.loadItems();
  }

  async loadCategories() {
    const res = await this.inventoryService.listCategories();
    if (res.success) {
      this.categories.set(res.categories);
    }
  }

  async loadItems() {
    this.isLoading.set(true);
    try {
      const res = await this.inventoryService.listItems({
        search: this.searchTerm(),
        categoryId: this.selectedCategoryId(),
        onlyLowStock: this.onlyLowStock(),
      });
      if (res.success) {
        this.items.set(res.items);
      } else {
        this.notificationService.error(
          'Load failed',
          res.error || 'Could not load inventory items',
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.loadItems();
  }

  onCategoryFilterChange(value: string) {
    this.selectedCategoryId.set(value ? Number(value) : null);
    this.loadItems();
  }

  toggleLowStockFilter() {
    this.onlyLowStock.update((v) => !v);
    this.loadItems();
  }

  stockLevelClass(item: InventoryItem): string {
    if (item.current_stock <= 0) return 'stock-critical';
    if (item.current_stock <= item.low_stock_threshold) return 'stock-low';
    return 'stock-healthy';
  }

  openCreateModal() {
    this.editingItem.set(null);
    this.form.reset({
      name: '',
      category_id: null,
      unit: 'pcs',
      cost_price: 0,
      opening_stock: 0,
      low_stock_threshold: 5,
    });
    this.isModalOpen.set(true);
  }

  openEditModal(item: InventoryItem) {
    this.editingItem.set(item);
    this.form.reset({
      name: item.name,
      category_id: item.category_id,
      unit: item.unit,
      cost_price: item.cost_price,
      opening_stock: item.opening_stock,
      low_stock_threshold: item.low_stock_threshold,
    });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  async onSubmit() {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    try {
      const value = this.form.getRawValue();
      const editing = this.editingItem();

      if (editing) {
        const res = await this.inventoryService.updateItem({
          id: editing.id,
          name: value.name,
          category_id: value.category_id,
          unit: value.unit,
          cost_price: value.cost_price,
          low_stock_threshold: value.low_stock_threshold,
          is_active: true,
        });
        if (res.success) {
          this.notificationService.success(
            'Item updated',
            `${value.name} has been updated.`,
          );
          this.closeModal();
          await this.loadItems();
        } else {
          this.notificationService.error(
            'Update failed',
            res.error || 'Could not update item',
          );
        }
      } else {
        const res = await this.inventoryService.createItem({
          name: value.name,
          category_id: value.category_id,
          unit: value.unit,
          cost_price: value.cost_price,
          opening_stock: value.opening_stock,
          low_stock_threshold: value.low_stock_threshold,
        });
        if (res.success) {
          this.notificationService.success(
            'Item created',
            `${value.name} has been added to inventory.`,
          );
          this.closeModal();
          await this.loadItems();
        } else {
          this.notificationService.error(
            'Create failed',
            res.error || 'Could not create item',
          );
        }
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  async onDeactivate(item: InventoryItem) {
    const confirmed = await this.confirmDialog.open({
      title: 'Deactivate item?',
      message: `"${item.name}" will be hidden from active lists but its purchase and issuance history will be preserved.`,
      confirmText: 'Deactivate',
      type: 'danger',
    });
    if (!confirmed) return;

    const res = await this.inventoryService.deleteItem(item.id);
    if (res.success) {
      this.notificationService.success(
        'Item deactivated',
        `${item.name} has been deactivated.`,
      );
      await this.loadItems();
    } else {
      this.notificationService.error(
        'Action failed',
        res.error || 'Could not deactivate item',
      );
    }
  }
}
