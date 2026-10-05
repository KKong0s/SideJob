import { Routes } from '@angular/router';

export const SEEKER_ROUTES: Routes = [
  {
    path: 'search',
    loadComponent: () => import('./pages/search/search.page').then((m) => m.SearchPage),
  },
  {
    path: '',
    redirectTo: 'search',
    pathMatch: 'full',
  },
];
