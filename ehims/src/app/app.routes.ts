import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Auth routes (no guard — public)
  {
    path: 'auth',
    loadComponent: () => import('./layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },

  // Protected application routes
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES),
      },
      {
        path: 'inventory',
        loadChildren: () => import('./features/inventory/inventory.routes').then(m => m.INVENTORY_ROUTES),
        canActivate: [roleGuard],
        data: { roles: ['admin', 'manager', 'storekeeper'] }
      },
      {
        path: 'pos',
        loadChildren: () => import('./features/pos/pos.routes').then(m => m.POS_ROUTES),
        canActivate: [roleGuard],
        data: { roles: ['admin', 'manager', 'cashier', 'waiter'] }
      },
      {
        path: 'suppliers',
        loadChildren: () => import('./features/suppliers/supplier.routes').then(m => m.SUPPLIER_ROUTES),
        canActivate: [roleGuard],
        data: { roles: ['admin', 'manager', 'storekeeper'] }
      },
      {
        path: 'eod',
        loadChildren: () => import('./features/eod/eod.routes').then(m => m.EOD_ROUTES),
        canActivate: [roleGuard],
        data: { roles: ['admin', 'manager'] }
      },
      {
        path: 'users',
        loadChildren: () => import('./features/users/users.routes').then(m => m.USERS_ROUTES),
        canActivate: [roleGuard],
        data: { roles: ['admin', 'manager'] }
      },
      {
        path: 'settings',
        loadChildren: () => import('./features/settings/settings.routes').then(m => m.SETTINGS_ROUTES),
        canActivate: [roleGuard],
        data: { roles: ['admin'] }
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },

  // Catch-all redirect
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
