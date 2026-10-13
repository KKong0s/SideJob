import { inject } from '@angular/core';
import { Routes } from '@angular/router';

import { authGuard, guestGuard, onboardingGuard, profileCompleteGuard, roleGuard, webOnlyGuard } from './shared/guards/auth.guards';
import { AuthService } from './shared/services/auth.service';

// Role areas are lazy-loaded; canMatch stops the chunk from loading for the wrong user.
export const routes: Routes = [
  {
    path: 'login',
    canMatch: [guestGuard],
    loadComponent: () => import('./shared/pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canMatch: [guestGuard],
    loadComponent: () => import('./shared/pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'onboarding',
    canMatch: [authGuard, onboardingGuard],
    loadComponent: () => import('./shared/pages/onboarding/onboarding.page').then((m) => m.OnboardingPage),
  },
  {
    path: 'chat/:id',
    canMatch: [authGuard, profileCompleteGuard],
    loadComponent: () => import('./shared/pages/chat/chat-room.page').then((m) => m.ChatRoomPage),
  },
  {
    path: 'notifications',
    canMatch: [authGuard, profileCompleteGuard],
    loadComponent: () => import('./shared/pages/notifications/notifications.page').then((m) => m.NotificationsPage),
  },
  {
    path: 'seeker',
    canMatch: [authGuard, profileCompleteGuard, roleGuard],
    data: { roles: ['seeker'] },
    loadChildren: () => import('./seeker/seeker.routes').then((m) => m.SEEKER_ROUTES),
  },
  {
    path: 'shop',
    canMatch: [authGuard, profileCompleteGuard, roleGuard],
    data: { roles: ['shop'] },
    loadChildren: () => import('./shop/shop.routes').then((m) => m.SHOP_ROUTES),
  },
  {
    path: 'admin',
    canMatch: [webOnlyGuard, authGuard, profileCompleteGuard, roleGuard],
    data: { roles: ['admin'] },
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => inject(AuthService).homeUrl(),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
