import { Routes } from '@angular/router';
export const POS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./order-terminal/order-terminal.component').then(m => m.OrderTerminalComponent) }
];
