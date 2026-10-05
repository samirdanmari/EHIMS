import { Injectable, inject } from '@angular/core';
import { ElectronService } from '../services/electron.service';
import {
  ActiveShift,
  Category,
  HotDeal,
  HotDealItem,
  HotDealLineInput,
  HotDealPaymentMethod,
  InventoryItem,
  IssuanceLineInput,
  PurchaseEntry,
  PurchaseLineInput,
  StockAuditRow,
  StockIssuance,
  StockIssuanceItem,
} from '../models/inventory.model';
import { Supplier } from '../models/supplier.model';

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
interface ListItemsResponse {
  success: boolean;
  items: InventoryItem[];
  error?: string;
}
interface ItemResponse {
  success: boolean;
  item?: InventoryItem;
  error?: string;
}
interface DeleteResponse {
  success: boolean;
  error?: string;
}
interface CreatePurchaseResponse {
  success: boolean;
  createdIds?: number[];
  grandTotal?: number;
  error?: string;
}
interface ListPurchasesResponse {
  success: boolean;
  purchases: PurchaseEntry[];
  error?: string;
}
interface ListSuppliersResponse {
  success: boolean;
  suppliers: Supplier[];
  error?: string;
}
interface ListShiftsResponse {
  success: boolean;
  shifts: ActiveShift[];
  error?: string;
}
interface CreateIssuanceResponse {
  success: boolean;
  issuanceId?: number;
  error?: string;
}
interface ListIssuancesResponse {
  success: boolean;
  issuances: StockIssuance[];
  error?: string;
}
interface IssuanceItemsResponse {
  success: boolean;
  items: StockIssuanceItem[];
  error?: string;
}
interface StockAuditResponse {
  success: boolean;
  report: StockAuditRow[];
  error?: string;
}
interface HotDealResponse {
  success: boolean;
  dealId?: number;
  totalAmount?: number;
  error?: string;
}
interface ListHotDealsResponse {
  success: boolean;
  deals: HotDeal[];
  error?: string;
}
interface HotDealItemsResponse {
  success: boolean;
  items: HotDealItem[];
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  private electronService = inject(ElectronService);

  // ---------------- Categories ----------------
  listCategories(): Promise<ListCategoriesResponse> {
    return this.electronService.invoke<ListCategoriesResponse>(
      'inventory:list-categories',
    );
  }

  createCategory(name: string): Promise<CreateCategoryResponse> {
    return this.electronService.invoke<CreateCategoryResponse>(
      'inventory:create-category',
      { name },
    );
  }

  // ---------------- Items ----------------
  listItems(
    params: {
      search?: string;
      categoryId?: number | null;
      onlyLowStock?: boolean;
      includeInactive?: boolean;
    } = {},
  ): Promise<ListItemsResponse> {
    return this.electronService.invoke<ListItemsResponse>(
      'inventory:list-items',
      params,
    );
  }

  createItem(payload: {
    name: string;
    category_id: number | null;
    unit: string;
    cost_price: number;
    opening_stock: number;
    low_stock_threshold: number;
  }): Promise<ItemResponse> {
    return this.electronService.invoke<ItemResponse>(
      'inventory:create-item',
      payload,
    );
  }

  updateItem(payload: {
    id: number;
    name: string;
    category_id: number | null;
    unit: string;
    cost_price: number;
    low_stock_threshold: number;
    is_active: boolean;
  }): Promise<ItemResponse> {
    return this.electronService.invoke<ItemResponse>(
      'inventory:update-item',
      payload,
    );
  }

  deleteItem(id: number): Promise<DeleteResponse> {
    return this.electronService.invoke<DeleteResponse>(
      'inventory:delete-item',
      { id },
    );
  }

  // ---------------- Suppliers (brief, for dropdowns) ----------------
  listSuppliers(search = ''): Promise<ListSuppliersResponse> {
    return this.electronService.invoke<ListSuppliersResponse>('supplier:list', {
      search,
    });
  }

  // ---------------- Purchases ----------------
  createPurchase(payload: {
    supplier_id: number | null;
    payment_method: string;
    is_credit: boolean;
    received_by: number;
    notes?: string;
    items: PurchaseLineInput[];
  }): Promise<CreatePurchaseResponse> {
    return this.electronService.invoke<CreatePurchaseResponse>(
      'inventory:create-purchase',
      payload,
    );
  }

  listPurchases(
    params: {
      limit?: number;
      supplierId?: number | null;
      dateFrom?: string | null;
      dateTo?: string | null;
    } = {},
  ): Promise<ListPurchasesResponse> {
    return this.electronService.invoke<ListPurchasesResponse>(
      'inventory:list-purchases',
      params,
    );
  }

  // ---------------- Stock Issuance ----------------
  listActiveShifts(): Promise<ListShiftsResponse> {
    return this.electronService.invoke<ListShiftsResponse>(
      'inventory:list-active-shifts',
    );
  }

  createIssuance(payload: {
    shift_id: number;
    issued_by: number;
    received_by: number;
    notes?: string;
    items: IssuanceLineInput[];
  }): Promise<CreateIssuanceResponse> {
    return this.electronService.invoke<CreateIssuanceResponse>(
      'inventory:create-issuance',
      payload,
    );
  }

  listIssuances(
    params: {
      limit?: number;
      dateFrom?: string | null;
      dateTo?: string | null;
    } = {},
  ): Promise<ListIssuancesResponse> {
    return this.electronService.invoke<ListIssuancesResponse>(
      'inventory:list-issuances',
      params,
    );
  }

  getIssuanceItems(issuanceId: number): Promise<IssuanceItemsResponse> {
    return this.electronService.invoke<IssuanceItemsResponse>(
      'inventory:get-issuance-items',
      { issuance_id: issuanceId },
    );
  }

  // ---------------- Business Partner Hot Deals ----------------
  createHotDeal(payload: {
    partner_name: string;
    direction: 'in' | 'out';
    payment_method: HotDealPaymentMethod;
    recorded_by: number;
    notes?: string;
    items: HotDealLineInput[];
  }): Promise<HotDealResponse> {
    return this.electronService.invoke<HotDealResponse>(
      'inventory:create-hot-deal',
      payload,
    );
  }

  listHotDeals(limit = 50): Promise<ListHotDealsResponse> {
    return this.electronService.invoke<ListHotDealsResponse>(
      'inventory:list-hot-deals',
      { limit },
    );
  }

  getHotDealItems(dealId: number): Promise<HotDealItemsResponse> {
    return this.electronService.invoke<HotDealItemsResponse>(
      'inventory:get-hot-deal-items',
      { deal_id: dealId },
    );
  }

  // ---------------- Stock Audit ----------------
  stockAudit(params: {
    dateFrom: string;
    dateTo: string;
    categoryId?: number | null;
  }): Promise<StockAuditResponse> {
    return this.electronService.invoke<StockAuditResponse>(
      'inventory:stock-audit',
      params,
    );
  }
}
