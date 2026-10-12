import { inject, provideAppInitializer } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  Event,
  NavigationCancel,
  NavigationCancellationCode,
  NavigationEnd,
  NavigationError,
  RouteReuseStrategy,
  Router,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { filter, take } from 'rxjs';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/shared/interceptors/auth.interceptor';
import { AuthService } from './app/shared/services/auth.service';
import { failSplash, hideSplash } from './app/shared/utils/splash';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Restore the session before the first navigation so guards see the logged-in user
    provideAppInitializer(() => inject(AuthService).restore()),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
  ],
})
  .then((app) => {
    // Keep the boot splash until the first navigation settles (guards + lazy routes),
    // so a logged-in user never sees the login page flash before their home page
    const router = app.injector.get(Router);
    if (router.navigated) {
      void hideSplash();
      return;
    }
    router.events.pipe(filter(firstNavigationSettled), take(1)).subscribe(() => void hideSplash());
  })
  .catch((err) => {
    console.error(err);
    failSplash();
  });

/** A guard redirect (e.g. to /login or onboarding) cancels the first navigation and starts another; wait for that one */
function firstNavigationSettled(e: Event): boolean {
  if (e instanceof NavigationEnd || e instanceof NavigationError) return true;
  return (
    e instanceof NavigationCancel &&
    e.code !== NavigationCancellationCode.Redirect &&
    e.code !== NavigationCancellationCode.SupersededByNewNavigation
  );
}
