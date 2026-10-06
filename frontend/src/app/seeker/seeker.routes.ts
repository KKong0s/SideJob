import { Routes } from '@angular/router';

import { SeekerTabsPage } from './seeker-tabs.page';

export const SEEKER_ROUTES: Routes = [
  // Full-screen pages pushed over the tabs
  {
    path: 'jobs/:id',
    loadComponent: () => import('./pages/job-detail/job-detail.page').then((m) => m.JobDetailPage),
  },
  {
    path: '',
    component: SeekerTabsPage,
    children: [
      {
        path: 'search',
        loadComponent: () => import('./pages/search/search.page').then((m) => m.SearchPage),
      },
      {
        path: 'saved',
        loadComponent: () => import('./pages/saved/saved.page').then((m) => m.SavedPage),
      },
      {
        path: 'applications',
        loadComponent: () => import('./pages/applications/applications.page').then((m) => m.ApplicationsPage),
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/seeker-profile.page').then((m) => m.SeekerProfilePage),
      },
      {
        path: '',
        redirectTo: 'search',
        pathMatch: 'full',
      },
    ],
  },
];
