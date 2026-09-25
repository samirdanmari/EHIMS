import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Auth routes (no guard — public)
  {
    path: 'auth',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout.component').then(
        (m) => m.AuthLayoutComponent,
      ),
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // Protected application routes
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent,
      ),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then(
            (m) => m.DASHBOARD_ROUTES,
          ),
      },
      {
        path: 'inventory',
        loadChildren: () =>
          import('./features/inventory/inventory.routes').then(
            (m) => m.INVENTORY_ROUTES,
          ),
        canActivate: [roleGuard],
        data: {
          roles: ['admin', 'manager', 'storekeeper'],
          permission: 'inventory',
        },
      },
      {
        path: 'pos',
        loadChildren: () =>
          import('./features/pos/pos.routes').then((m) => m.POS_ROUTES),
        canActivate: [roleGuard],
        data: {
          roles: ['admin', 'manager', 'cashier', 'waiter'],
          permission: 'pos',
        },
      },
      {
        path: 'suppliers',
        loadChildren: () =>
          import('./features/suppliers/supplier.routes').then(
            (m) => m.SUPPLIER_ROUTES,
          ),
        canActivate: [roleGuard],
        data: {
          roles: ['admin', 'manager', 'storekeeper'],
          permission: 'suppliers',
        },
      },
      {
        path: 'eod',
        loadChildren: () =>
          import('./features/eod/eod.routes').then((m) => m.EOD_ROUTES),
        canActivate: [roleGuard],
        data: { roles: ['admin', 'manager'], permission: 'eod' },
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./features/reports/reports.routes').then(
            (m) => m.REPORTS_ROUTES,
          ),
        canActivate: [roleGuard],
        data: {
          roles: ['admin', 'manager', 'storekeeper', 'cashier', 'waiter'],
          permission: 'reports',
        },
      },
      {
        path: 'users',
        loadChildren: () =>
          import('./features/users/users.routes').then((m) => m.USERS_ROUTES),
        canActivate: [roleGuard],
        data: { roles: ['admin', 'manager'], permission: 'users' },
      },
      {
        path: 'customers',
        loadChildren: () =>
          import('./features/customers/customers.routes').then(
            (m) => m.CUSTOMER_ROUTES,
          ),
        canActivate: [roleGuard],
        data: {
          roles: ['admin', 'manager', 'cashier'],
          permission: 'customers',
        },
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes').then(
            (m) => m.SETTINGS_ROUTES,
          ),
        canActivate: [roleGuard],
        data: { roles: ['admin'], permission: 'settings' },
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },

  // Catch-all redirect
  {
    path: '**',
    redirectTo: 'auth/login',
  },
];
