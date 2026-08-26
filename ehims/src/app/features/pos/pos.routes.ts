import { Routes } from '@angular/router';

export const POS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./order-terminal/order-terminal.component').then(
        (m) => m.OrderTerminalComponent,
      ),
  },
  {
    path: 'menu',
    loadComponent: () =>
      import('./menu-management/menu-management.component').then(
        (m) => m.MenuManagementComponent,
      ),
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./order-history/order-history.component').then(
        (m) => m.OrderHistoryComponent,
      ),
  },
];
