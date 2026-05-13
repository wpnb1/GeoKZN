export type EventType = 'accident' | 'police' | 'chat' | 'official' | 'other';

export interface User {
  userId?: number;
  username: string;
  isAdmin: boolean;
  registeredAt: Date;
  avatarEmoji?: string | null;
}

export interface Event {
  id: string;
  type: EventType;
  title: string;
  description: string;
  lat: number;
  lng: number;
  author: string;
  createdAt: Date;
  endTime: Date | null;
  isAdminEvent: boolean;
  archivedManually: boolean;
}

export interface EventWithArchive extends Event {
  isArchived: boolean;
}

export interface Comment {
  id: string;
  eventId: string;
  author: string;
  text: string;
  createdAt: Date;
}

export interface Complaint {
  id: string;
  type: 'event' | 'comment';
  targetId: string;
  reporter: string;
  reason: string;
  createdAt: Date;
  targetUsername?: string;
  targetUserId?: string | null;
  reportNote?: string | null;
  /** Событие (если жалоба на событие или комментарий к событию) */
  eventId?: string | null;
  eventTitle?: string | null;
  eventDescription?: string | null;
  eventAuthor?: string | null;
  /** Комментарий */
  commentText?: string | null;
  commentEventTitle?: string | null;
}

export interface AdminUserRow {
  userId: string;
  username: string;
  isAdmin: boolean;
  isBlocked: boolean;
  createdAt: Date;
}
