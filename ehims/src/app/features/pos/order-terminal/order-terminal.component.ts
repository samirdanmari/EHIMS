import { ElectronService } from '../../../core/services/electron.service';
import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ViewChild,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
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
import { PosTabsComponent } from '../../../shared/components/pos/pos-tabs/pos-tabs.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ReceiptService } from '../../../core/services/receipt.service';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import {
  SuspendedOrder,
  SuspendedOrdersService,
} from '../services/suspended-orders.service';

@Component({
  selector: 'app-order-terminal',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
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
  private electronService = inject(ElectronService);
  private receiptService = inject(ReceiptService);

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
  suspendedOrders = signal<any[]>([]);
  isSuspendedOrdersDialogOpen = signal(false);
  private suspendedOrdersDialogResolve?: (id: number | null) => void;

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
    customer_name: new FormControl(''),
    notes: new FormControl(''),
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

        // Print receipt
        await this.printReceipt(res);

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

  private async printReceipt(orderRes: any) {
    try {
      const currentUser = this.authService.currentUser();
      const receiptData = {
        orderId: orderRes.id,
        orderNumber: orderRes.orderNumber,
        items: this.cart().map((item) => ({
          name: item.menu_item_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          lineTotal: item.quantity * item.unit_price,
        })),
        subtotal:
          orderRes.subtotal ||
          orderRes.totalAmount - (orderRes.tax_amount || 0),
        discount: orderRes.discount_amount,
        tax: orderRes.tax_amount || 0,
        total: orderRes.totalAmount,
        paymentMethod: this.paymentMethod(),
        customerName: currentUser?.display_name,
        tableNumber: this.form.controls.table_number.value || undefined,
      };

      const printRes = await this.receiptService.printReceipt(receiptData);

      if (!printRes.success) {
        console.warn('Receipt print failed:', printRes.error);
        // Don't fail the order, just log the warning
        this.notificationService.warning(
          'Print Warning',
          'Order completed but receipt print failed',
        );
      }
    } catch (err) {
      console.error('Receipt print error:', err);
      this.notificationService.error(
        'Receipt Print Failed',
        `Order completed, but printing failed: ${err instanceof Error ? err.message : String(err)}`,
      );
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

  async onSuspendOrder() {
    try {
      if (this.cartEmpty()) {
        this.notificationService.error(
          'Empty Cart',
          'Please add items before suspending order',
        );
        return;
      }

      // Generate order number (timestamp based)
      const orderNumber = `ORD-${Date.now()}`;
      const currentUser = this.authService.currentUser();

      const cartData = {
        orderNumber,
        customerName: this.form.get('customer_name')?.value || '',
        tableNumber: this.form.get('table_number')?.value || '',
        items: this.cart(), // Pass as array, handler will stringify
        subtotal: this.subtotal(),
        discount: this.discountAmount(),
        tax: this.taxAmount(),
        notes: this.form.get('notes')?.value || '',
        suspendedBy: currentUser?.id || 1, // Current user ID
      };

      const result = await this.electronService.invoke<any>(
        'suspended-orders:suspend',
        cartData,
      );

      if (result.success) {
        this.notificationService.success(
          'Order Suspended',
          'Order has been saved and can be retrieved later',
        );
        this.resetOrder();
      } else {
        this.notificationService.error(
          'Failed',
          result.error || 'Could not suspend order',
        );
      }
    } catch (err) {
      console.error('Suspend order error:', err);
      this.notificationService.error('Error', 'Failed to suspend order');
    }
  }

  async onRetrieveSuspended() {
    try {
      const result = await this.electronService.invoke<any>(
        'suspended-orders:list',
      );

      if (!result.success || !result.data || result.data.length === 0) {
        this.notificationService.info(
          'No Orders',
          'No suspended orders available',
        );
        return;
      }

      // Show dialog to select which suspended order to retrieve
      const selectedId = await this.showSuspendedOrdersDialog(result.data);

      if (selectedId) {
        const retrieveResult = await this.electronService.invoke<any>(
          'suspended-orders:retrieve',
          { id: Number(selectedId) },
        );

        if (retrieveResult.success && retrieveResult.data) {
          // Restore cart with suspended order data
          const order = retrieveResult.data;

          this.form.patchValue({
            customer_name: order.customerName || '',
            table_number: order.tableNumber || '',
            notes: order.notes || '',
          });

          // Items should already be parsed array from handler
          let items = [];
          try {
            items = Array.isArray(order.items)
              ? order.items
              : JSON.parse(order.items || '[]');
          } catch (e) {
            console.warn('Could not parse suspended order items');
            items = [];
          }

          this.cart.set(items);
          this.discountAmount.set(order.discount || 0);

          this.notificationService.success(
            'Order Restored',
            'Suspended order loaded into cart',
          );
        } else {
          this.notificationService.error(
            'Failed',
            retrieveResult.error || 'Could not retrieve order',
          );
        }
      }
    } catch (err) {
      console.error('Retrieve suspended order error:', err);
      this.notificationService.error(
        'Error',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  private showSuspendedOrdersDialog(orders: any[]): Promise<number | null> {
    this.suspendedOrders.set(orders);
    this.isSuspendedOrdersDialogOpen.set(true);

    return new Promise((resolve) => {
      this.suspendedOrdersDialogResolve = resolve;
    });
  }

  selectSuspendedOrder(id: number) {
    this.isSuspendedOrdersDialogOpen.set(false);
    this.suspendedOrdersDialogResolve?.(id);
    this.suspendedOrdersDialogResolve = undefined;
  }

  cancelSuspendedOrdersDialog() {
    this.isSuspendedOrdersDialogOpen.set(false);
    this.suspendedOrdersDialogResolve?.(null);
    this.suspendedOrdersDialogResolve = undefined;
  }
}
