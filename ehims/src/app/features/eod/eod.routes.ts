import { Routes } from '@angular/router';
export const EOD_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./eod-dashboard/eod-dashboard.component').then(m => m.EodDashboardComponent) }
];
