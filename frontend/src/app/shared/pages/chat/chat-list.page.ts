import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  IonAvatar,
  IonBadge,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chatbubblesOutline, imageOutline, personCircleOutline } from 'ionicons/icons';

import { environment } from '../../../../environments/environment';
import { BellButtonComponent } from '../../components/bell-button/bell-button.component';
import { PageStateComponent } from '../../components/page-state/page-state.component';
import { ConversationListItem } from '../../models/chat.model';
import { ChatService } from '../../services/chat.service';
import { timeAgo } from '../../utils/format';
import { PagedList } from '../../utils/paged-list';

/** All chats of the logged-in seeker or shop, newest activity first; refreshes live on new messages */
@Component({
  selector: 'app-chat-list',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>แชท</ion-title>
        <ion-buttons slot="end"><app-bell-button></app-bell-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="list.refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <app-page-state
        [state]="list.state()"
        [thumbnail]="true"
        emptyIcon="chatbubbles-outline"
        emptyText="ยังไม่มีแชท"
        emptyHint="แชทจะเปิดให้อัตโนมัติเมื่อร้านรับเข้าทำงาน"
        (retry)="list.reload()"
      >
        <ion-list>
          @for (c of list.items(); track c.id) {
            <ion-item [button]="true" [detail]="false" (click)="open(c)" [class.unread]="c.unread > 0">
              <ion-avatar slot="start">
                @if (c.other.imagePath) {
                  <img [src]="uploadsUrl + '/' + c.other.imagePath" alt="" />
                } @else {
                  <ion-icon name="person-circle-outline" class="placeholder" aria-hidden="true"></ion-icon>
                }
              </ion-avatar>
              <ion-label>
                <h3>{{ c.other.name }}</h3>
                <p class="job">{{ c.job.title }}</p>
                <p class="preview">
                  @if (c.lastMessage; as m) {
                    @if (m.mine) { คุณ: }
                    @if (m.hasImage) { <ion-icon name="image-outline" aria-hidden="true"></ion-icon> รูปภาพ } @else { {{ m.body }} }
                  } @else {
                    <span class="hint">เริ่มแชทได้เลย</span>
                  }
                </p>
              </ion-label>
              <div slot="end" class="end">
                <ion-note>{{ timeAgo(c.lastActivityAt) }}</ion-note>
                @if (c.unread) {
                  <ion-badge color="danger">{{ c.unread > 99 ? '99+' : c.unread }}</ion-badge>
                }
                @if (!c.canSend) {
                  <ion-note class="closed">ปิดแล้ว</ion-note>
                }
              </div>
            </ion-item>
          }
        </ion-list>
      </app-page-state>
      <ion-infinite-scroll [disabled]="!list.hasNext()" (ionInfinite)="list.loadMore($event)">
        <ion-infinite-scroll-content></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>
  `,
  styles: `
    .placeholder {
      width: 100%;
      height: 100%;
      color: var(--ion-color-medium);
    }
    .job {
      font-size: 0.8rem;
    }
    .preview {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .preview ion-icon {
      vertical-align: middle;
    }
    .hint {
      font-style: italic;
    }
    ion-item.unread h3,
    ion-item.unread .preview {
      font-weight: 600;
      color: var(--ion-text-color);
    }
    .end {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      font-size: 0.75rem;
    }
    .closed {
      font-size: 0.7rem;
    }
  `,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonList,
    IonItem,
    IonAvatar,
    IonIcon,
    IonLabel,
    IonNote,
    IonBadge,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    BellButtonComponent,
    PageStateComponent,
  ],
})
export class ChatListPage {
  private readonly chat = inject(ChatService);
  private readonly router = inject(Router);

  readonly list = new PagedList<ConversationListItem>((page, ctx) => this.chat.conversations(page, ctx));
  readonly uploadsUrl = environment.uploadsUrl;
  readonly timeAgo = timeAgo;

  constructor() {
    addIcons({ chatbubblesOutline, imageOutline, personCircleOutline });
    // New messages move a conversation to the top and update its unread count
    this.chat.events.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((e) => {
      if (e.type === 'message') void this.list.refresh();
    });
  }

  ionViewWillEnter(): void {
    void this.list.reload();
    void this.chat.refreshUnread();
  }

  open(c: ConversationListItem): void {
    void this.router.navigate(['/chat', c.id]);
  }
}
