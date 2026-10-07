import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

import { ChatService } from './shared/services/chat.service';
import { NotificationService } from './shared/services/notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  // Created at startup so the unread count follows login state and navigation
  private readonly notifications = inject(NotificationService);
  // Opens the chat socket while a seeker or shop is logged in
  private readonly chat = inject(ChatService);
}
