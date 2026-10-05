import { Component, inject } from '@angular/core';
import { AlertController, IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';

/** Toolbar button that asks for confirmation, then logs out. */
@Component({
  selector: 'app-logout-button',
  template: `
    <ion-button (click)="confirm()" aria-label="ออกจากระบบ">
      <ion-icon slot="icon-only" name="log-out-outline"></ion-icon>
    </ion-button>
  `,
  imports: [IonButton, IonIcon],
})
export class LogoutButtonComponent {
  private readonly auth = inject(AuthService);
  private readonly alerts = inject(AlertController);

  constructor() {
    addIcons({ logOutOutline });
  }

  async confirm(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'ออกจากระบบ?',
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        { text: 'ออกจากระบบ', role: 'destructive', handler: () => void this.auth.logout() },
      ],
    });
    await alert.present();
  }
}
