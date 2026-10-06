import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

import { NotificationService } from './shared/services/notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  // Created at startup so the unread count follows login state and navigation
  private readonly notifications = inject(NotificationService);
}
