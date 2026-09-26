import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

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
    canActivate: [roleGuard],
    data: {
      roles: ['admin', 'manager'],
      permission: 'menu_management',
    },
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./order-history/order-history.component').then(
        (m) => m.OrderHistoryComponent,
      ),
  },
];
