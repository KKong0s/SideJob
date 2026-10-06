import { Component, computed, input } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { callOutline, chatbubbleEllipsesOutline } from 'ionicons/icons';

import { Contact } from '../../models/application.model';

/** "โทร" and "เพิ่มเพื่อน LINE" buttons for the other side of an accepted application */
@Component({
  selector: 'app-contact-buttons',
  template: `
    <div class="contact">
      @if (contact().phone; as phone) {
        <ion-button [href]="'tel:' + phone" color="success">
          <ion-icon slot="start" name="call-outline"></ion-icon>โทร {{ phone }}
        </ion-button>
      }
      @if (lineUrl(); as url) {
        <ion-button [href]="url" target="_blank" rel="noopener" class="line">
          <ion-icon slot="start" name="chatbubble-ellipses-outline"></ion-icon>เพิ่มเพื่อน LINE ({{ contact().lineId }})
        </ion-button>
      }
      @if (!contact().phone && !contact().lineId) {
        <p>อีกฝ่ายยังไม่ได้ระบุช่องทางติดต่อ</p>
      }
    </div>
  `,
  styles: `
    .contact {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .line {
      --background: #06c755;
      --color: #fff;
    }
  `,
  imports: [IonButton, IonIcon],
})
export class ContactButtonsComponent {
  readonly contact = input.required<Contact>();

  /** Personal IDs use /ti/p/~id, official accounts (@xxx) use /ti/p/@xxx */
  readonly lineUrl = computed(() => {
    const id = this.contact().lineId;
    if (!id) return null;
    const path = id.startsWith('@') ? '@' + encodeURIComponent(id.slice(1)) : '~' + encodeURIComponent(id);
    return `https://line.me/R/ti/p/${path}`;
  });

  constructor() {
    addIcons({ callOutline, chatbubbleEllipsesOutline });
  }
}
