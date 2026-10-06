import { Routes } from '@angular/router';

import { AdminShellPage } from './admin-shell.page';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminShellPage,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.AdminDashboardPage),
      },
      {
        path: 'shops',
        loadComponent: () => import('./pages/shops/shops.page').then((m) => m.AdminShopsPage),
      },
      {
        path: 'shops/:id',
        loadComponent: () => import('./pages/shop-detail/shop-detail.page').then((m) => m.AdminShopDetailPage),
      },
      {
        path: 'logs',
        loadComponent: () => import('./pages/logs/logs.page').then((m) => m.AdminLogsPage),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
];
