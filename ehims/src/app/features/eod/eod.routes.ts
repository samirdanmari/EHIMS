import { Routes } from '@angular/router';
export const EOD_ROUTES: Routes = [
  // { path: '', loadComponent: () => import('./eod-dashboard/eod-dashboard.component').then(m => m.EodDashboardComponent) }

  { path: '', redirectTo: 'close-shift', pathMatch: 'full' },
  {
    path: 'close-shift',
    loadComponent: () =>
      import('./shift-close/shift-close.component').then(
        (m) => m.ShiftCloseComponent,
      ),
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./eod-reports/eod-reports.component').then(
        (m) => m.EODReportsComponent,
      ),
  },
];
