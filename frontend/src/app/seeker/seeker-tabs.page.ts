import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { bookmarkOutline, documentTextOutline, personOutline, searchOutline } from 'ionicons/icons';

/** Bottom tabs for job seekers */
@Component({
  selector: 'app-seeker-tabs',
  template: `
    <ion-tabs>
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
        <ion-tab-button tab="profile">
          <ion-icon name="person-outline" aria-hidden="true"></ion-icon>
          <ion-label>โปรไฟล์</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class SeekerTabsPage {
  constructor() {
    addIcons({ searchOutline, bookmarkOutline, documentTextOutline, personOutline });
  }
}
