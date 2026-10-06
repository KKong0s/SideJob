import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonRouterOutlet,
  IonSplitPane,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { documentTextOutline, logOutOutline, speedometerOutline, storefrontOutline } from 'ionicons/icons';

import { AuthService } from '../shared/services/auth.service';

interface MenuItem {
  url: string;
  label: string;
  icon: string;
}

/** Admin area (web only): side menu that collapses to a hamburger on small screens */
@Component({
  selector: 'app-admin-shell',
  template: `
    <ion-split-pane contentId="admin-main" when="md">
      <ion-menu contentId="admin-main" type="overlay">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>SideJob แอดมิน</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-list lines="none" class="menu">
            @for (item of menu; track item.url) {
              <ion-menu-toggle [autoHide]="false">
                <ion-item [routerLink]="item.url" routerLinkActive="active" [detail]="false" button>
                  <ion-icon slot="start" [name]="item.icon" aria-hidden="true"></ion-icon>
                  <ion-label>{{ item.label }}</ion-label>
                </ion-item>
              </ion-menu-toggle>
            }
          </ion-list>
        </ion-content>
        <ion-footer>
          <ion-list lines="none">
            <ion-item>
              <ion-label color="medium"><p>{{ auth.user()?.email }}</p></ion-label>
            </ion-item>
            <ion-item button [detail]="false" (click)="auth.logout()">
              <ion-icon slot="start" name="log-out-outline" aria-hidden="true"></ion-icon>
              <ion-label>ออกจากระบบ</ion-label>
            </ion-item>
          </ion-list>
        </ion-footer>
      </ion-menu>
      <ion-router-outlet id="admin-main"></ion-router-outlet>
    </ion-split-pane>
  `,
  styles: `
    .menu ion-item.active {
      --background: rgba(var(--ion-color-primary-rgb), 0.12);
      --color: var(--ion-color-primary);
      font-weight: 600;
    }
    .menu ion-item.active ion-icon {
      color: var(--ion-color-primary);
    }
  `,
  imports: [
    RouterLink,
    RouterLinkActive,
    IonSplitPane,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonMenuToggle,
    IonItem,
    IonIcon,
    IonLabel,
    IonFooter,
    IonRouterOutlet,
  ],
})
export class AdminShellPage {
  readonly auth = inject(AuthService);

  // Users, jobs, reports and categories are added in Phase 7
  readonly menu: MenuItem[] = [
    { url: '/admin/dashboard', label: 'แดชบอร์ด', icon: 'speedometer-outline' },
    { url: '/admin/shops', label: 'ร้านรอยืนยัน', icon: 'storefront-outline' },
    { url: '/admin/logs', label: 'Audit log', icon: 'document-text-outline' },
  ];

  constructor() {
    addIcons({ speedometerOutline, storefrontOutline, documentTextOutline, logOutOutline });
  }
}
