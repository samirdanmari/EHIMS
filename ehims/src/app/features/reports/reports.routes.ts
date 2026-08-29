import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then(
        (m) => m.ReportsDashboardComponent,
      ),
  },
  {
    path: 'sales',
    loadComponent: () =>
      import('./sales-report/sales-report.component').then(
        (m) => m.SalesReportComponent,
      ),
  },
  {
    path: 'inventory',
    loadComponent: () =>
      import('./inventory-report/inventory-report.component').then(
        (m) => m.InventoryReportComponent,
      ),
  },
  {
    path: 'purchases',
    loadComponent: () =>
      import('./purchase-report/purchase-report.component').then(
        (m) => m.PurchaseReportComponent,
      ),
  },
  {
    path: 'stock-issuance',
    loadComponent: () =>
      import('./stock-issuance-report/stock-issuance-report.component').then(
        (m) => m.StockIssuanceReportComponent,
      ),
  },
];
