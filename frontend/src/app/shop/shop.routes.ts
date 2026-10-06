import { Routes } from '@angular/router';

import { ShopTabsPage } from './shop-tabs.page';

export const SHOP_ROUTES: Routes = [
  {
    path: '',
    component: ShopTabsPage,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.ShopDashboardPage),
      },
      {
        path: 'jobs',
        loadComponent: () => import('./pages/jobs/jobs.page').then((m) => m.ShopJobsPage),
      },
      {
        path: 'applicants',
        loadComponent: () => import('./pages/applicants/applicants.page').then((m) => m.ApplicantsPage),
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/shop-profile.page').then((m) => m.ShopProfilePage),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
];
