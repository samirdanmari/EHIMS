import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { PosService } from '../../../core/services/pos.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  ReceiptService,
  ReceiptPrintRequest,
} from '../../../core/services/receipt.service';
import { Order, OrderStatus } from '../../../core/models/order.model';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { PosTabsComponent } from '../../../shared/components/pos/pos-tabs/pos-tabs.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    PosTabsComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.scss'],
})
export class OrderHistoryComponent implements OnInit {
  private posService = inject(PosService);
  private inventoryService = inject(InventoryService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private receiptService = inject(ReceiptService);

  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;

  isLoading = signal(true);
  isProcessing = signal(false);
  orders = signal<Order[]>([]);
  activeShifts = signal<{ id: number; shift_name: string }[]>([]);

  selectedShiftId = signal<number | null>(null);
  selectedStatus = signal<OrderStatus | 'all'>('completed');
  expandedOrderId = signal<number | null>(null);

  form = new FormGroup({
    shift_id: new FormControl<number | null>(null),
    status: new FormControl<OrderStatus | 'all'>('completed'),
  });

  async ngOnInit() {
    await this.loadShifts();
    await this.loadOrders();
    this.isLoading.set(false);
  }

  async loadShifts() {
    const res = await this.inventoryService.listActiveShifts();
    if (res.success) {
      this.activeShifts.set(res.shifts);
    }
  }

  async loadOrders() {
    const shiftId = this.selectedShiftId();
    const status = this.selectedStatus();
    const res = await this.posService.listOrders({
      limit: 100,
      shiftId: shiftId || undefined,
      status: status === 'all' ? null : status,
    });
    if (res.success) {
      this.orders.set(res.orders);
    }
  }

  onShiftChange(value: string) {
    this.selectedShiftId.set(value ? Number(value) : null);
    this.loadOrders();
  }

  onStatusChange(value: OrderStatus | 'all') {
    this.selectedStatus.set(value);
    this.loadOrders();
  }

  async toggleExpand(order: Order) {
    if (this.expandedOrderId() === order.id) {
      this.expandedOrderId.set(null);
      return;
    }
    const res = await this.posService.getOrderDetails(order.id);
    if (res.success) {
      this.expandedOrderId.set(order.id);
    }
  }

  getOrderDetails(orderId: number) {
    return this.orders().find((o) => o.id === orderId);
  }

  statusColor(status: OrderStatus): string {
    switch (status) {
      case 'completed':
        return 'success';
      case 'voided':
        return 'danger';
      case 'pending':
        return 'warning';
      default:
        return 'info';
    }
  }

  async onVoidOrder(order: Order) {
    const confirmed = await this.confirmDialog.open({
      title: 'Void order?',
      message: `Order #${order.order_number} will be voided and inventory will be restored.`,
      confirmText: 'Void Order',
      type: 'danger',
    });

    if (!confirmed) return;

    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.notificationService.error(
        'Not signed in',
        'Could not identify the current user.',
      );
      return;
    }

    this.isProcessing.set(true);
    try {
      const res = await this.posService.voidOrder({
        order_id: order.id,
        void_reason: 'Voided by user',
        void_approved_by: userId,
      });

      if (res.success) {
        this.notificationService.success(
          'Order voided',
          `Order #${order.order_number} has been voided.`,
        );
        await this.loadOrders();
      } else {
        this.notificationService.error(
          'Action failed',
          res.error || 'Could not void order',
        );
      }
    } finally {
      this.isProcessing.set(false);
    }
  }

  async onReprintReceipt(order: Order) {
    const details = await this.posService.getOrderDetails(order.id);
    if (!details.success || !details.order || !details.items) {
      this.notificationService.error(
        'Reprint Failed',
        details.error || 'Could not load order items.',
      );
      return;
    }

    const request: ReceiptPrintRequest = {
      orderId: order.id,
      orderNumber: details.order.order_number,
      items: details.items.map((item: any) => ({
        name: item.menu_item_name || 'Item',
        quantity: item.quantity,
        unitPrice: item.unit_price,
        lineTotal: item.total_price,
      })),
      subtotal: details.order.subtotal,
      discount: details.order.discount_amount,
      tax: details.order.tax_amount,
      total: details.order.total_amount,
      paymentMethod: details.order.payment_method,
      tableNumber: details.order.table_number,
    };
    const result = await this.receiptService.reprintReceipt(request);
    result.success
      ? this.notificationService.success(
          'Receipt Reprinted',
          `Receipt for ${order.order_number} sent to printer.`,
        )
      : this.notificationService.error(
          'Reprint Failed',
          result.error || 'Could not print receipt.',
        );
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }
}
