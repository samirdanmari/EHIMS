import { Routes } from '@angular/router';

export const EOD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./eod-layout/eod-layout.component').then(
        (m) => m.EodLayoutComponent,
      ),
    children: [
      { path: '', redirectTo: 'open-shift', pathMatch: 'full' },
      {
        path: 'open-shift',
        loadComponent: () =>
          import('./open-shift/open-shift.component').then(
            (m) => m.OpenShiftComponent,
          ),
      },
      {
        path: 'close-shift',
        loadComponent: () =>
          import('./shift-close/shift-close.component').then(
            (m) => m.ShiftCloseComponent,
          ),
      },
      {
        path: 'cash-reconciliation',
        loadComponent: () =>
          import('./cash-reconciliation/cash-reconciliation.component').then(
            (m) => m.CashReconciliationComponent,
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./eod-reports/eod-reports.component').then(
            (m) => m.EODReportsComponent,
          ),
      },
    ],
  },
];
