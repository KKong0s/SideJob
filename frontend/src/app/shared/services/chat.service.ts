import { HttpClient, HttpContext } from '@angular/common/http';
import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ChatEvent, ChatMessage, Conversation, ConversationListItem, MessagePage } from '../models/chat.model';
import { Page, toHttpParams } from '../models/page.model';
import { silentErrors } from '../utils/api-error';
import { AuthService } from './auth.service';

const PING_MS = 25_000;
const MAX_RETRY_MS = 30_000;

/**
 * Chat: REST for history / sending, WebSocket for real-time events.
 * The socket stays open while a seeker or shop is logged in and reconnects with backoff.
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly api = `${environment.apiUrl}/chat`;

  /** Unread messages across all conversations (badge on the chat tab) */
  readonly unread = signal(0);
  /** true once the socket is authenticated */
  readonly connected = signal(false);
  /** Conversation currently on screen: its new messages do not count as unread */
  readonly activeConversationId = signal<number | null>(null);
  readonly events = new Subject<ChatEvent>();

  private socket: WebSocket | null = null;
  private socketToken: string | null = null;
  private wanted = false;
  private retryMs = 1000;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const user = this.auth.user();
      const token = this.auth.token();
      if (user && token && user.role !== 'admin' && user.onboardingStep === 'done') {
        // Another account logged in: the open socket belongs to the previous token
        if (this.socketToken !== token) this.disconnect();
        this.connect(token);
      } else {
        this.disconnect();
      }
    });
    inject(DestroyRef).onDestroy(() => this.disconnect());
  }

  // --- REST -----------------------------------------------------------------

  conversations(page: number, context?: HttpContext): Promise<Page<ConversationListItem>> {
    return firstValueFrom(this.http.get<Page<ConversationListItem>>(`${this.api}/conversations`, { params: toHttpParams({ page }), context }));
  }

  async conversation(id: number, context?: HttpContext): Promise<Conversation> {
    const res = await firstValueFrom(this.http.get<{ conversation: Conversation }>(`${this.api}/conversations/${id}`, { context }));
    return res.conversation;
  }

  async byApplication(applicationId: number): Promise<Conversation> {
    const res = await firstValueFrom(this.http.get<{ conversation: Conversation }>(`${this.api}/by-application/${applicationId}`));
    return res.conversation;
  }

  /** Newest page (no cursor), older page (before) or catch-up (after) */
  messages(id: number, cursor: { before?: number; after?: number } = {}, context?: HttpContext): Promise<MessagePage> {
    const params = toHttpParams({ before: cursor.before, after: cursor.after, limit: 30 });
    return firstValueFrom(this.http.get<MessagePage>(`${this.api}/conversations/${id}/messages`, { params, context }));
  }

  async send(id: number, body: string): Promise<ChatMessage> {
    const res = await firstValueFrom(this.http.post<{ message: ChatMessage }>(`${this.api}/conversations/${id}/messages`, { body }));
    return res.message;
  }

  async sendImage(id: number, file: File): Promise<ChatMessage> {
    const form = new FormData();
    form.append('file', file, file.name);
    const res = await firstValueFrom(this.http.post<{ message: ChatMessage }>(`${this.api}/conversations/${id}/images`, form));
    return res.message;
  }

  async markRead(id: number, lastMessageId: number): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/conversations/${id}/read`, { lastMessageId }, { context: silentErrors() }));
    void this.refreshUnread();
  }

  async refreshUnread(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<{ unread: number }>(`${this.api}/unread-count`, { context: silentErrors() }));
      this.unread.set(res.unread);
    } catch {
      // keep the last value
    }
  }

  // --- WebSocket ------------------------------------------------------------

  private connect(token = this.socketToken): void {
    this.wanted = true;
    if (this.socket || !token) return;
    this.socketToken = token;
    const socket = new WebSocket(environment.wsUrl);
    this.socket = socket;

    socket.onopen = () => socket.send(JSON.stringify({ type: 'auth', token }));
    socket.onmessage = (e) => {
      if (this.socket === socket) this.onSocketMessage(e.data);
    };
    socket.onclose = () => {
      // A replaced socket (logout / account switch) must not touch the current one
      if (this.socket !== socket) return;
      this.socket = null;
      this.connected.set(false);
      this.stopPing();
      this.scheduleReconnect();
    };
  }

  private onSocketMessage(raw: string): void {
    let data: { type?: string } & Record<string, unknown>;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    if (data.type === 'auth.ok') {
      this.retryMs = 1000;
      this.connected.set(true);
      this.startPing();
      void this.refreshUnread();
    } else if (data.type === 'auth.error') {
      // Token no longer valid: stop retrying until the session changes
      this.wanted = false;
      this.socket?.close();
    } else if (data.type === 'message' || data.type === 'read') {
      const event = data as unknown as ChatEvent;
      if (event.type === 'message' && event.message.senderId !== this.auth.user()?.id && this.activeConversationId() !== event.conversationId) {
        this.unread.update((n) => n + 1);
      }
      this.events.next(event);
    }
  }

  private scheduleReconnect(): void {
    if (!this.wanted || this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.wanted) this.connect(this.auth.token());
    }, this.retryMs);
    this.retryMs = Math.min(this.retryMs * 2, MAX_RETRY_MS);
  }

  private disconnect(): void {
    this.wanted = false;
    this.socketToken = null;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.stopPing();
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.connected.set(false);
    this.unread.set(0);
  }

  // Keeps idle connections open through proxies / mobile networks
  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => this.socket?.send(JSON.stringify({ type: 'ping' })), PING_MS);
  }

  private stopPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }
}
