import { Routes } from '@angular/router';

import { ShopTabsPage } from './shop-tabs.page';

export const SHOP_ROUTES: Routes = [
  // Full-screen pages, listed before the tabs so 'jobs/...' is not swallowed by the 'jobs' tab
  {
    path: 'jobs/new',
    loadComponent: () => import('./pages/job-form/job-form.page').then((m) => m.JobFormPage),
  },
  {
    path: 'jobs/:id/edit',
    loadComponent: () => import('./pages/job-form/job-form.page').then((m) => m.JobFormPage),
  },
  {
    path: 'jobs/:id',
    loadComponent: () => import('./pages/job-detail/shop-job-detail.page').then((m) => m.ShopJobDetailPage),
  },
  {
    path: 'applicants/:id',
    loadComponent: () => import('./pages/applicant-detail/applicant-detail.page').then((m) => m.ApplicantDetailPage),
  },
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
