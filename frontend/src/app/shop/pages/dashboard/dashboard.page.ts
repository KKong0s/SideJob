import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton } from '@ionic/angular';

// Placeholder until the feature phase is implemented.
@Component({
  selector: 'app-shop-dashboard',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/welcome"></ion-back-button></ion-buttons>
        <ion-title>แดชบอร์ดร้าน</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p>กำลังพัฒนา</p>
    </ion-content>
  `,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton],
})
export class ShopDashboardPage {}
