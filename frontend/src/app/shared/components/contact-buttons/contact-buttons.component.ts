import { Component, input, output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { callOutline, chatbubblesOutline } from 'ionicons/icons';

import { Contact } from '../../models/application.model';

/** "แชท" and "โทร" buttons for the other side of an accepted application */
@Component({
  selector: 'app-contact-buttons',
  template: `
    <div class="contact">
      <ion-button (click)="chat.emit()">
        <ion-icon slot="start" name="chatbubbles-outline"></ion-icon>{{ chatLabel() }}
      </ion-button>
      @if (contact().phone; as phone) {
        <ion-button [href]="'tel:' + phone" color="success" fill="outline">
          <ion-icon slot="start" name="call-outline"></ion-icon>โทร {{ phone }}
        </ion-button>
      }
    </div>
  `,
  styles: `
    .contact {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  `,
  imports: [IonButton, IonIcon],
})
export class ContactButtonsComponent {
  readonly contact = input.required<Contact>();
  readonly chatLabel = input('แชท');
  readonly chat = output<void>();

  constructor() {
    addIcons({ callOutline, chatbubblesOutline });
  }
}
