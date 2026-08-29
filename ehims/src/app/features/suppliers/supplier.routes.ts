import { Routes } from '@angular/router';

export const SUPPLIER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./supplier-list/supplier-list.component').then(
        (m) => m.SupplierListComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./supplier-detail/supplier-detail.component').then(
        (m) => m.SupplierDetailComponent,
      ),
  },
];
