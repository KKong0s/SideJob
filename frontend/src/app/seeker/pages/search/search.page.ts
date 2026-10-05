import { Component, inject } from '@angular/core';
import { IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

import { LogoutButtonComponent } from '../../../shared/components/logout-button/logout-button.component';
import { AuthService } from '../../../shared/services/auth.service';

// Placeholder until the feature phase is implemented.
@Component({
  selector: 'app-seeker-search',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>ค้นหางาน</ion-title>
        <ion-buttons slot="end"><app-logout-button></app-logout-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p>สวัสดี {{ auth.user()?.displayName ?? auth.user()?.email }}</p>
      <p>กำลังพัฒนา</p>
    </ion-content>
  `,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, LogoutButtonComponent],
})
export class SearchPage {
  readonly auth = inject(AuthService);
}
