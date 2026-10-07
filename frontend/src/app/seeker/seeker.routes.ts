import { Routes } from '@angular/router';

import { SeekerTabsPage } from './seeker-tabs.page';

export const SEEKER_ROUTES: Routes = [
  // Full-screen pages pushed over the tabs
  {
    path: 'jobs/:id',
    loadComponent: () => import('./pages/job-detail/job-detail.page').then((m) => m.JobDetailPage),
  },
  {
    path: 'shops/:id/reviews',
    loadComponent: () => import('./pages/shop-reviews/shop-reviews.page').then((m) => m.ShopReviewsPage),
  },
  {
    path: 'applications/:id',
    loadComponent: () => import('./pages/application-detail/application-detail.page').then((m) => m.ApplicationDetailPage),
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
        path: 'chats',
        loadComponent: () => import('../shared/pages/chat/chat-list.page').then((m) => m.ChatListPage),
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
