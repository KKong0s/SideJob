import { Component, computed, inject } from '@angular/core';
import { IonBadge, IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chatbubblesOutline, briefcaseOutline, gridOutline, peopleOutline, storefrontOutline } from 'ionicons/icons';

import { NavItem, TopNavComponent } from '../shared/components/top-nav/top-nav.component';
import { ChatService } from '../shared/services/chat.service';

/** Bottom tabs for shop owners */
@Component({
  selector: 'app-shop-tabs',
  template: `
    <ion-tabs class="sj-tabs">
      <app-top-nav slot="top" class="sj-top-nav" [items]="navItems()" homePath="/shop/dashboard" profilePath="/shop/profile"></app-top-nav>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="dashboard">
          <ion-icon name="grid-outline" aria-hidden="true"></ion-icon>
          <ion-label>แดชบอร์ด</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="jobs">
          <ion-icon name="briefcase-outline" aria-hidden="true"></ion-icon>
          <ion-label>ประกาศของฉัน</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="applicants">
          <ion-icon name="people-outline" aria-hidden="true"></ion-icon>
          <ion-label>ผู้สมัคร</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="chats">
          <ion-icon name="chatbubbles-outline" aria-hidden="true"></ion-icon>
          <ion-label>แชท</ion-label>
          @if (chat.unread() > 0) {
            <ion-badge class="sj-count">{{ chat.unread() > 99 ? '99+' : chat.unread() }}</ion-badge>
          }
        </ion-tab-button>
        <ion-tab-button tab="profile">
          <ion-icon name="storefront-outline" aria-hidden="true"></ion-icon>
          <ion-label>โปรไฟล์ร้าน</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  imports: [TopNavComponent, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge],
})
export class ShopTabsPage {
  readonly chat = inject(ChatService);
  readonly navItems = computed<NavItem[]>(() => [
    { path: '/shop/dashboard', label: 'แดชบอร์ด' },
    { path: '/shop/jobs', label: 'ประกาศของฉัน' },
    { path: '/shop/applicants', label: 'ผู้สมัคร' },
    { path: '/shop/chats', label: 'แชท', count: this.chat.unread() },
  ]);

  constructor() {
    addIcons({ chatbubblesOutline, gridOutline, briefcaseOutline, peopleOutline, storefrontOutline });
  }
}
