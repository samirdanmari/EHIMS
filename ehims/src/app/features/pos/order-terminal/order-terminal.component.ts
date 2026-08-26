import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { PosService } from '../../../core/services/pos.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  MenuItem,
  CartItem,
  PaymentMethod,
} from '../../../core/models/order.model';
import { ActiveShift } from '../../../core/models/inventory.model';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { PosTabsComponent } from '../../../shared/components/pos/pos-tabs/pos-tabs.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-order-terminal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CurrencyPipe,
    PosTabsComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './order-terminal.component.html',
  styleUrls: ['./order-terminal.component.scss'],
})
export class OrderTerminalComponent implements OnInit {
  private posService = inject(PosService);
  private inventoryService = inject(InventoryService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;

  isLoading = signal(true);
  isProcessing = signal(false);
  menuItems = signal<MenuItem[]>([]);
  activeShifts = signal<ActiveShift[]>([]);
  categories = signal<{ id: number; name: string }[]>([]);

  selectedCategoryId = signal<number | null>(null);
  searchTerm = signal('');

  cart = signal<CartItem[]>([]);
  discountAmount = signal(0);
  taxPercentage = signal(0);
  paymentMethod = signal<PaymentMethod>('cash');

  filteredMenuItems = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const categoryId = this.selectedCategoryId();
    return this.menuItems().filter((item) => {
      const matchesSearch = !search || item.name.toLowerCase().includes(search);
      const matchesCategory = !categoryId || item.category_id === categoryId;
      const isAvailable = item.is_available === 1;
      return matchesSearch && matchesCategory && isAvailable;
    });
  });

  subtotal = computed(() => {
    return this.cart().reduce((sum, item) => sum + item.total_price, 0);
  });

  taxAmount = computed(() => {
    return (
      Math.round(
        ((this.subtotal() * (this.taxPercentage() || 0)) / 100) * 100,
      ) / 100
    );
  });

  grandTotal = computed(() => {
    const sub = this.subtotal();
    const discount = this.discountAmount();
    const tax = this.taxAmount();
    return Math.max(0, sub - discount) + tax;
  });

  cartEmpty = computed(() => this.cart().length === 0);

  form = new FormGroup({
    shift_id: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    table_number: new FormControl(''),
  });

  async ngOnInit() {
    await this.loadMenuItems();
    await this.loadShifts();
    this.extractCategories();
    this.isLoading.set(false);
  }

  async loadMenuItems() {
    const res = await this.posService.listMenuItems({ onlyAvailable: true });
    if (res.success) {
      this.menuItems.set(res.items);
    }
  }

  async loadShifts() {
    const res = await this.inventoryService.listActiveShifts();
    if (res.success) {
      this.activeShifts.set(res.shifts);
      if (res.shifts.length > 0) {
        this.form.controls.shift_id.setValue(res.shifts[0].id);
      }
    }
  }

  extractCategories() {
    const catMap = new Map<number, string>();
    this.menuItems().forEach((item) => {
      if (item.category_id && item.category_name) {
        catMap.set(item.category_id, item.category_name);
      }
    });
    const cats = Array.from(catMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));
    this.categories.set(cats);
  }

  addToCart(item: MenuItem) {
    const existingIndex = this.cart().findIndex(
      (c) => c.menu_item_id === item.id,
    );

    if (existingIndex >= 0) {
      const updated = [...this.cart()];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total_price =
        updated[existingIndex].quantity * updated[existingIndex].unit_price;
      this.cart.set(updated);
    } else {
      const newItem: CartItem = {
        menu_item_id: item.id,
        menu_item_name: item.name,
        quantity: 1,
        unit_price: item.selling_price,
        total_price: item.selling_price,
      };
      this.cart.set([...this.cart(), newItem]);
    }
    this.notificationService.success('Added to cart', item.name);
  }

  removeFromCart(index: number) {
    const updated = this.cart().filter((_, i) => i !== index);
    this.cart.set(updated);
  }

  updateQuantity(index: number, quantity: number) {
    if (quantity < 1) {
      this.removeFromCart(index);
      return;
    }
    const updated = [...this.cart()];
    updated[index].quantity = quantity;
    updated[index].total_price = quantity * updated[index].unit_price;
    this.cart.set(updated);
  }

  updateNotes(index: number, notes: string) {
    const updated = [...this.cart()];
    updated[index].notes = notes;
    this.cart.set(updated);
  }

  onSearchChange(value: string) {
    this.searchTerm.set(value);
  }

  onCategoryChange(value: string) {
    this.selectedCategoryId.set(value ? Number(value) : null);
  }

  async onCompleteOrder() {
    if (this.form.invalid || this.cart().length === 0) {
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

    const confirmed = await this.confirmDialog.open({
      title: 'Complete order?',
      message: `Total: ${this.grandTotal().toLocaleString('en-NG', { minimumFractionDigits: 2 })} NGN`,
      confirmText: 'Complete Order',
      type: 'info',
    });

    if (!confirmed) return;

    this.isProcessing.set(true);
    try {
      const res = await this.posService.createOrder({
        shift_id: this.form.controls.shift_id.value as number,
        cashier_id: userId,
        table_number: this.form.controls.table_number.value || undefined,
        items: this.cart().map((c) => ({
          menu_item_id: c.menu_item_id,
          quantity: c.quantity,
          notes: c.notes,
        })),
        discount_amount: this.discountAmount() || undefined,
        tax_amount: this.taxAmount() || undefined,
        payment_method: this.paymentMethod(),
      });

      if (res.success) {
        this.notificationService.success(
          'Order completed',
          `Order #${res.orderNumber} · Total: ${res.totalAmount?.toLocaleString('en-NG', { minimumFractionDigits: 2 })} NGN`,
        );
        this.resetOrder();
        await this.loadMenuItems();
      } else {
        this.notificationService.error(
          'Order failed',
          res.error || 'Could not complete order',
        );
      }
    } finally {
      this.isProcessing.set(false);
    }
  }

  resetOrder() {
    this.cart.set([]);
    this.discountAmount.set(0);
    this.form.patchValue({ table_number: '' });
  }

  clearCart() {
    this.cart.set([]);
  }
}
