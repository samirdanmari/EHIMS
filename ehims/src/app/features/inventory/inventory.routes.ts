import { Routes } from '@angular/router';

export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./inventory-list/inventory-list.component').then(
        (m) => m.InventoryListComponent,
      ),
  },
  {
    path: 'purchases',
    loadComponent: () =>
      import('./purchase-entry/purchase-entry.component').then(
        (m) => m.PurchaseEntryComponent,
      ),
  },
  {
    path: 'issuance',
    loadComponent: () =>
      import('./stock-issuance/stock-issuance.component').then(
        (m) => m.StockIssuanceComponent,
      ),
  },
  {
    path: 'hot-deals',
    loadComponent: () =>
      import('./hot-deals/hot-deals.component').then(
        (m) => m.HotDealsComponent,
      ),
  },
  {
    path: 'audit',
    loadComponent: () =>
      import('../audit/stock-audit/stock-audit.component').then(
        (m) => m.StockAuditComponent,
      ),
  },
];
