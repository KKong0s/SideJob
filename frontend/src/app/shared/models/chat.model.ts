import { ApplicationStatus } from './application.model';

export interface Conversation {
  id: number;
  applicationId: number;
  applicationStatus: ApplicationStatus;
  job: { id: number; title: string };
  myRole: 'seeker' | 'shop';
  /** The other person (shop for a seeker, seeker for a shop) */
  other: { userId: number; name: string; imagePath: string | null };
  /** false after the application was cancelled or an account was suspended (history stays readable) */
  canSend: boolean;
  /** Newest message id the other side has read (for "อ่านแล้ว") */
  otherLastReadId: number;
  lastActivityAt: string;
}

export interface ConversationListItem extends Conversation {
  lastMessage: { body: string | null; hasImage: boolean; senderId: number; mine: boolean } | null;
  unread: number;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  body: string | null;
  /** Relative to environment.uploadsUrl */
  imagePath: string | null;
  createdAt: string;
}

export interface MessagePage {
  items: ChatMessage[];
  hasMore: boolean;
}

/** Events pushed through the chat WebSocket */
export type ChatEvent =
  | { type: 'message'; conversationId: number; message: ChatMessage }
  | { type: 'read'; conversationId: number; userId: number; lastReadId: number };
