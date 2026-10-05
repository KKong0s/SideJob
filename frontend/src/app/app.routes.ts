import { Routes } from '@angular/router';

// Role areas are lazy-loaded. Guards (authGuard, roleGuard, profileCompleteGuard) are added in Phase 1.
export const routes: Routes = [
  {
    path: 'welcome',
    loadComponent: () => import('./shared/pages/welcome/welcome.page').then((m) => m.WelcomePage),
  },
  {
    path: 'seeker',
    loadChildren: () => import('./seeker/seeker.routes').then((m) => m.SEEKER_ROUTES),
  },
  {
    path: 'shop',
    loadChildren: () => import('./shop/shop.routes').then((m) => m.SHOP_ROUTES),
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: '',
    redirectTo: 'welcome',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'welcome',
  },
];
