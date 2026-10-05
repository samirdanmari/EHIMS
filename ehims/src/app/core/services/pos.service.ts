import { Injectable, inject } from '@angular/core';
import { ElectronService } from '../services/electron.service';
import {
  MenuItem,
  MenuItemInput,
  Order,
  OrderCreateInput,
  OrderItem,
  OrderWithItems,
} from '../models/order.model';

interface ListMenuItemsResponse {
  success: boolean;
  items: MenuItem[];
  error?: string;
}
interface MenuItemResponse {
  success: boolean;
  item?: MenuItem;
  error?: string;
}
interface DeleteResponse {
  success: boolean;
  error?: string;
}
interface CreateOrderResponse {
  success: boolean;
  orderId?: number;
  orderNumber?: string;
  totalAmount?: number;
  error?: string;
}
interface ListOrdersResponse {
  success: boolean;
  orders: Order[];
  error?: string;
}
interface OrderDetailsResponse {
  success: boolean;
  order?: Order;
  items?: OrderItem[];
  error?: string;
}
interface VoidOrderResponse {
  success: boolean;
  error?: string;
}
interface ApplyDiscountResponse {
  success: boolean;
  order?: Order;
  error?: string;
}
interface Category {
  id: number;
  name: string;
}
interface ListCategoriesResponse {
  success: boolean;
  categories: Category[];
  error?: string;
}
interface CreateCategoryResponse {
  success: boolean;
  category?: Category;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PosService {
  private electronService = inject(ElectronService);

  // ============ MENU ITEMS ============
  listMenuItems(
    params: {
      search?: string;
      categoryId?: number | null;
      onlyAvailable?: boolean;
    } = {},
  ): Promise<ListMenuItemsResponse> {
    return this.electronService.invoke<ListMenuItemsResponse>(
      'menu:list-items',
      params,
    );
  }

  // ============ CATEGORIES ============
  listCategories(): Promise<ListCategoriesResponse> {
    return this.electronService.invoke<ListCategoriesResponse>(
      'menu:list-categories',
    );
  }

  createCategory(payload: { name: string }): Promise<CreateCategoryResponse> {
    return this.electronService.invoke<CreateCategoryResponse>(
      'menu:create-category',
      payload,
    );
  }

  createMenuItem(payload: MenuItemInput): Promise<MenuItemResponse> {
    return this.electronService.invoke<MenuItemResponse>(
      'menu:create-item',
      payload,
    );
  }

  updateMenuItem(
    payload: { id: number } & Partial<MenuItemInput> & {
        is_available?: boolean;
      },
  ): Promise<MenuItemResponse> {
    return this.electronService.invoke<MenuItemResponse>(
      'menu:update-item',
      payload,
    );
  }

  deleteMenuItem(id: number): Promise<DeleteResponse> {
    return this.electronService.invoke<DeleteResponse>('menu:delete-item', {
      id,
    });
  }

  // ============ ORDERS ============
  createOrder(payload: OrderCreateInput): Promise<CreateOrderResponse> {
    return this.electronService.invoke<CreateOrderResponse>(
      'order:create',
      payload,
    );
  }

  listOrders(
    params: {
      limit?: number;
      shiftId?: number | null;
      status?: string | null;
      dateFrom?: string | null;
      dateTo?: string | null;
    } = {},
  ): Promise<ListOrdersResponse> {
    return this.electronService.invoke<ListOrdersResponse>(
      'order:list',
      params,
    );
  }

  getOrderDetails(orderId: number): Promise<OrderDetailsResponse> {
    return this.electronService.invoke<OrderDetailsResponse>(
      'order:get-details',
      { order_id: orderId },
    );
  }

  voidOrder(payload: {
    order_id: number;
    void_reason?: string;
  }): Promise<VoidOrderResponse> {
    return this.electronService.invoke<VoidOrderResponse>(
      'order:void',
      payload,
    );
  }

  applyDiscount(payload: {
    order_id: number;
    discount_amount: number;
    discount_reason?: string;
    approved_by?: number;
  }): Promise<ApplyDiscountResponse> {
    return this.electronService.invoke<ApplyDiscountResponse>(
      'order:apply-discount',
      payload,
    );
  }
}
