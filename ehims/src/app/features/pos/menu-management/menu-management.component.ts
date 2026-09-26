import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { PosService } from '../../../core/services/pos.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { MenuItem } from '../../../core/models/order.model';
import { InventoryItem } from '../../../core/models/inventory.model';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { PosTabsComponent } from '../../../shared/components/pos/pos-tabs/pos-tabs.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    PosTabsComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './menu-management.component.html',
  styleUrls: ['./menu-management.component.scss'],
})
export class MenuManagementComponent implements OnInit {
  private posService = inject(PosService);
  private inventoryService = inject(InventoryService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);

  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;

  isLoading = signal(true);
  isSaving = signal(false);
  items = signal<MenuItem[]>([]);
  inventoryItems = signal<InventoryItem[]>([]);
  categories = signal<{ id: number; name: string }[]>([]);

  searchTerm = signal('');
  isModalOpen = signal(false);
  editingItem = signal<MenuItem | null>(null);
  isCreatingCategory = signal(false);
  newCategoryName = signal('');

  form = new FormGroup({
    name: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    category_id: new FormControl<number | null>(null),
    selling_price: new FormControl(0, {
      validators: [Validators.required, Validators.min(1)],
      nonNullable: true,
    }),
    inventory_item_id: new FormControl<number | null>(null),
    description: new FormControl(''),
  });

  filteredItems = signal<MenuItem[]>([]);

  // Multi-select inventory items tracking
  selectedInventoryItemIds = signal<Set<number>>(new Set());

  canManageMenu(): boolean {
    return this.authService.canAccess(['admin', 'manager'], 'menu_management');
  }

  async ngOnInit() {
    await Promise.all([
      this.loadCategories(),
      this.loadMenuItems(),
      this.loadInventoryItems(),
    ]);
    this.isLoading.set(false);
  }

  isInventoryItemSelected(id: number): boolean {
    return this.selectedInventoryItemIds().has(id);
  }

  toggleInventoryItem(id: number) {
    const selected = new Set(this.selectedInventoryItemIds());
    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }
    this.selectedInventoryItemIds.set(selected);
  }

  getSelectedInventoryNames(): string {
    const names = this.inventoryItems()
      .filter((inv) => this.selectedInventoryItemIds().has(inv.id))
      .map((inv) => inv.name)
      .join(', ');
    return names || '';
  }

  async loadMenuItems() {
    const res = await this.posService.listMenuItems({ onlyAvailable: false });
    if (res.success) {
      this.items.set(res.items);
      this.applySearch();
    }
  }

  async loadInventoryItems() {
    const res = await this.inventoryService.listItems();
    if (res.success) {
      this.inventoryItems.set(res.items);
    }
  }

  async loadCategories() {
    const res = await this.posService.listCategories();
    if (res.success && res.categories) {
      this.categories.set(res.categories);
    } else {
      // Fallback empty category list
      this.categories.set([]);
    }
  }

  async createNewCategory() {
    if (!this.canManageMenu()) return;
    const name = this.newCategoryName().trim();
    if (!name) {
      this.notificationService.error(
        'Category name required',
        'Please enter a category name',
      );
      return;
    }

    this.isSaving.set(true);
    const res = await this.posService.createCategory({ name });
    this.isSaving.set(false);

    if (res.success && res.category) {
      this.categories.set([...this.categories(), res.category]);
      this.form.get('category_id')?.setValue(res.category.id);
      this.newCategoryName.set('');
      this.isCreatingCategory.set(false);
      this.notificationService.success(
        'Category created',
        `${name} has been added.`,
      );
    } else {
      this.notificationService.error(
        'Failed to create category',
        res.error || 'Unknown error',
      );
    }
  }

  applySearch() {
    const search = this.searchTerm().toLowerCase();
    this.filteredItems.set(
      this.items().filter((item) => item.name.toLowerCase().includes(search)),
    );
  }

  onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.applySearch();
  }

  openCreateModal() {
    if (!this.canManageMenu()) return;
    this.editingItem.set(null);
    this.selectedInventoryItemIds.set(new Set());
    this.form.reset({
      name: '',
      category_id: null,
      selling_price: 0,
      inventory_item_id: null,
      description: '',
    });
    this.isModalOpen.set(true);
  }

  openEditModal(item: MenuItem) {
    if (!this.canManageMenu()) return;
    this.editingItem.set(item);
    this.selectedInventoryItemIds.set(new Set());
    this.form.reset({
      name: item.name,
      category_id: item.category_id,
      selling_price: item.selling_price,
      inventory_item_id: item.inventory_item_id,
      description: item.description,
    });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  async onSubmit() {
    if (!this.canManageMenu()) return;
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    try {
      const value = this.form.getRawValue();
      const inventoryItemIds = Array.from(this.selectedInventoryItemIds());
      const editing = this.editingItem();

      if (editing) {
        const res = await this.posService.updateMenuItem({
          id: editing.id,
          name: value.name,
          category_id: value.category_id,
          selling_price: value.selling_price,
          inventory_item_id: value.inventory_item_id,
          inventory_item_ids: inventoryItemIds,
          description: value.description || undefined,
          is_available: true,
        });
        if (res.success) {
          this.notificationService.success(
            'Menu item updated',
            `${value.name} has been updated.`,
          );
          this.closeModal();
          await this.loadMenuItems();
        } else {
          this.notificationService.error(
            'Update failed',
            res.error || 'Could not update menu item',
          );
        }
      } else {
        const res = await this.posService.createMenuItem({
          name: value.name,
          category_id: value.category_id,
          selling_price: value.selling_price,
          inventory_item_id: value.inventory_item_id,
          inventory_item_ids: inventoryItemIds,
          description: value.description || undefined,
        });
        if (res.success) {
          this.notificationService.success(
            'Menu item created',
            `${value.name} has been added to the menu.`,
          );
          this.closeModal();
          await this.loadMenuItems();
        } else {
          this.notificationService.error(
            'Create failed',
            res.error || 'Could not create menu item',
          );
        }
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  async onDeactivate(item: MenuItem) {
    if (!this.canManageMenu()) return;
    const confirmed = await this.confirmDialog.open({
      title: 'Deactivate item?',
      message: `"${item.name}" will be hidden from the menu but its order history will be preserved.`,
      confirmText: 'Deactivate',
      type: 'danger',
    });
    if (!confirmed) return;

    const res = await this.posService.deleteMenuItem(item.id);
    if (res.success) {
      this.notificationService.success(
        'Item deactivated',
        `${item.name} has been deactivated.`,
      );
      await this.loadMenuItems();
    } else {
      this.notificationService.error(
        'Action failed',
        res.error || 'Could not deactivate item',
      );
    }
  }
}
