import { Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

// Placeholder until the feature phase is implemented.
@Component({
  selector: 'app-applications',
  template: `
    <ion-header>
      <ion-toolbar><ion-title>ใบสมัครของฉัน</ion-title></ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding"><p>กำลังพัฒนา</p></ion-content>
  `,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class ApplicationsPage {}
