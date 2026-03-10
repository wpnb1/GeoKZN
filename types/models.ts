export type EventType = 'accident' | 'police' | 'chat' | 'official' | 'other';

export interface User {
  username: string;
  isAdmin: boolean;
  registeredAt: Date;
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
}

