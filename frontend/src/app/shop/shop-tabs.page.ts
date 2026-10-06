import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { briefcaseOutline, gridOutline, peopleOutline, storefrontOutline } from 'ionicons/icons';

/** Bottom tabs for shop owners */
@Component({
  selector: 'app-shop-tabs',
  template: `
    <ion-tabs>
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
        <ion-tab-button tab="profile">
          <ion-icon name="storefront-outline" aria-hidden="true"></ion-icon>
          <ion-label>โปรไฟล์ร้าน</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class ShopTabsPage {
  constructor() {
    addIcons({ gridOutline, briefcaseOutline, peopleOutline, storefrontOutline });
  }
}
