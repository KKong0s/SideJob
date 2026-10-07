import { Component, DestroyRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  InfiniteScrollCustomEvent,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonModal,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close, imageOutline, send } from 'ionicons/icons';

import { environment } from '../../../../environments/environment';
import { PageStateComponent } from '../../components/page-state/page-state.component';
import { ChatMessage, Conversation } from '../../models/chat.model';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import { silentErrors } from '../../utils/api-error';
import { thaiDate } from '../../utils/format';
import { LoadState, errorState } from '../../utils/paged-list';
import { IMAGE_TYPES, checkUpload, takeFile } from '../../utils/upload';

/** One conversation: history (older pages on scroll up), live messages over the socket, text + image sending */
@Component({
  selector: 'app-chat-room',
  templateUrl: 'chat-room.page.html',
  styleUrls: ['chat-room.page.scss'],
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonFooter,
    IonTextarea,
    IonButton,
    IonIcon,
    IonSpinner,
    IonModal,
    PageStateComponent,
  ],
})
export class ChatRoomPage {
  private readonly chat = inject(ChatService);
  private readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastController);
  private readonly content = viewChild(IonContent);

  /** Route param :id */
  readonly id = input.required<string>();
  readonly conversationId = computed(() => Number(this.id()));

  readonly state = signal<LoadState>('loading');
  readonly conversation = signal<Conversation | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly hasMore = signal(false);
  readonly sending = signal(false);
  readonly viewImage = signal<string | null>(null);
  draft = '';

  readonly me = computed(() => this.auth.user()?.id ?? 0);
  readonly uploadsUrl = environment.uploadsUrl;
  readonly backHref = computed(() => (this.auth.user()?.role === 'shop' ? '/shop/chats' : '/seeker/chats'));

  /** Id of my newest message, for the "อ่านแล้ว" receipt */
  readonly lastMineId = computed(() => {
    const mine = this.messages().filter((m) => m.senderId === this.me());
    return mine.length ? mine[mine.length - 1].id : 0;
  });

  private wasConnected = false;
  private entered = false;

  constructor() {
    addIcons({ close, imageOutline, send });

    this.chat.events.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((e) => {
      if (e.conversationId !== this.conversationId()) return;
      if (e.type === 'message') {
        this.append([e.message]);
        if (e.message.senderId !== this.me()) void this.markRead();
      } else if (e.userId !== this.me()) {
        this.conversation.update((c) => (c ? { ...c, otherLastReadId: Math.max(c.otherLastReadId, e.lastReadId) } : c));
      }
    });

    // After a reconnect, fetch whatever arrived while the socket was down
    effect(() => {
      const connected = this.chat.connected();
      if (connected && !this.wasConnected && this.entered) void this.catchUp();
      this.wasConnected = connected;
    });
  }

  ionViewWillEnter(): void {
    this.entered = true;
    this.chat.activeConversationId.set(this.conversationId());
    void this.load();
  }

  ionViewWillLeave(): void {
    this.chat.activeConversationId.set(null);
  }

  async load(): Promise<void> {
    if (!this.conversation()) this.state.set('loading');
    try {
      const [conversation, page] = await Promise.all([
        this.chat.conversation(this.conversationId(), silentErrors()),
        this.chat.messages(this.conversationId(), {}, silentErrors()),
      ]);
      this.conversation.set(conversation);
      this.messages.set(page.items);
      this.hasMore.set(page.hasMore);
      this.state.set('ready');
      this.scrollToBottom(0);
      void this.markRead();
    } catch (err) {
      if (!this.conversation()) this.state.set(errorState(err));
    }
  }

  async loadOlder(event: InfiniteScrollCustomEvent): Promise<void> {
    const first = this.messages()[0];
    try {
      if (first && this.hasMore()) {
        const page = await this.chat.messages(this.conversationId(), { before: first.id });
        this.messages.update((list) => [...page.items, ...list]);
        this.hasMore.set(page.hasMore);
      }
    } catch {
      // the interceptor shows the error toast
    } finally {
      await event.target.complete();
    }
  }

  async sendText(): Promise<void> {
    const body = this.draft.trim();
    if (!body || this.sending()) return;
    this.sending.set(true);
    try {
      const message = await this.chat.send(this.conversationId(), body);
      this.draft = '';
      this.append([message]);
    } catch {
      await this.load(); // e.g. the chat was closed meanwhile
    } finally {
      this.sending.set(false);
    }
  }

  async onImageSelected(event: Event): Promise<void> {
    const file = takeFile(event);
    if (!file) return;
    const problem = checkUpload(file, IMAGE_TYPES);
    if (problem) {
      const t = await this.toasts.create({ message: problem, color: 'danger', duration: 2500, position: 'top' });
      await t.present();
      return;
    }
    this.sending.set(true);
    try {
      this.append([await this.chat.sendImage(this.conversationId(), file)]);
    } catch {
      // the interceptor shows the error toast
    } finally {
      this.sending.set(false);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    // Enter sends on desktop; Shift+Enter adds a new line
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.sendText();
    }
  }

  /** Show a date line before the first message of each day */
  showDate(index: number): boolean {
    const list = this.messages();
    return index === 0 || list[index].createdAt.slice(0, 10) !== list[index - 1].createdAt.slice(0, 10);
  }

  dateLabel(m: ChatMessage): string {
    return thaiDate(m.createdAt.slice(0, 10));
  }

  time(m: ChatMessage): string {
    return m.createdAt.slice(11, 16);
  }

  private append(incoming: ChatMessage[]): void {
    const known = new Set(this.messages().map((m) => m.id));
    const fresh = incoming.filter((m) => !known.has(m.id));
    if (!fresh.length) return;
    this.messages.update((list) => [...list, ...fresh].sort((a, b) => a.id - b.id));
    this.scrollToBottom();
  }

  private async catchUp(): Promise<void> {
    const last = this.messages()[this.messages().length - 1];
    if (!last) return void this.load();
    try {
      const page = await this.chat.messages(this.conversationId(), { after: last.id }, silentErrors());
      this.append(page.items);
      void this.markRead();
    } catch {
      // next reconnect tries again
    }
  }

  private async markRead(): Promise<void> {
    const last = this.messages()[this.messages().length - 1];
    if (last) await this.chat.markRead(this.conversationId(), last.id).catch(() => undefined);
  }

  private scrollToBottom(duration = 200): void {
    setTimeout(() => void this.content()?.scrollToBottom(duration), 50);
  }
}
