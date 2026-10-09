import { Component, computed, inject } from '@angular/core';
import { IonBadge, IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chatbubblesOutline, bookmarkOutline, documentTextOutline, personOutline, searchOutline } from 'ionicons/icons';

import { NavItem, TopNavComponent } from '../shared/components/top-nav/top-nav.component';
import { ChatService } from '../shared/services/chat.service';

/** Bottom tabs for job seekers */
@Component({
  selector: 'app-seeker-tabs',
  template: `
    <ion-tabs class="sj-tabs">
      <app-top-nav slot="top" class="sj-top-nav" [items]="navItems()" homePath="/seeker/search" profilePath="/seeker/profile"></app-top-nav>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="search">
          <ion-icon name="search-outline" aria-hidden="true"></ion-icon>
          <ion-label>ค้นหางาน</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="saved">
          <ion-icon name="bookmark-outline" aria-hidden="true"></ion-icon>
          <ion-label>งานที่บันทึก</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="applications">
          <ion-icon name="document-text-outline" aria-hidden="true"></ion-icon>
          <ion-label>ใบสมัครของฉัน</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="chats">
          <ion-icon name="chatbubbles-outline" aria-hidden="true"></ion-icon>
          <ion-label>แชท</ion-label>
          @if (chat.unread() > 0) {
            <ion-badge class="sj-count">{{ chat.unread() > 99 ? '99+' : chat.unread() }}</ion-badge>
          }
        </ion-tab-button>
        <ion-tab-button tab="profile">
          <ion-icon name="person-outline" aria-hidden="true"></ion-icon>
          <ion-label>โปรไฟล์</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  imports: [TopNavComponent, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge],
})
export class SeekerTabsPage {
  readonly chat = inject(ChatService);
  readonly navItems = computed<NavItem[]>(() => [
    { path: '/seeker/search', label: 'ค้นหางาน' },
    { path: '/seeker/saved', label: 'งานที่บันทึก' },
    { path: '/seeker/applications', label: 'ใบสมัครของฉัน' },
    { path: '/seeker/chats', label: 'แชท', count: this.chat.unread() },
  ]);

  constructor() {
    addIcons({ chatbubblesOutline, searchOutline, bookmarkOutline, documentTextOutline, personOutline });
  }
}
