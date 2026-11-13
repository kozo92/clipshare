export interface Clip {
  id: string;
  title: string;
  content: string;
  imageData?: string | null;
  syntax: string;
  hasPassword?: boolean;
  burnAfterReading?: boolean;
  burned?: boolean;
  isReadOnly?: boolean;
  createdAt: number;
  expiresAt: number | null;
  viewCount: number;
}

export interface ClipCreationPayload {
  id?: string;
  title?: string;
  content: string;
  imageData?: string | null;
  password?: string;
  expiresInSeconds?: number | null;
  burnAfterReading?: boolean;
  isReadOnly?: boolean;
  syntax?: string;
}

export interface RecentClipItem {
  id: string;
  title: string;
  snippet: string;
  hasImage?: boolean;
  createdAt: number;
  expiresAt: number | null;
  hasPassword: boolean;
  burnAfterReading: boolean;
  syntax: string;
}

export type ViewMode = 'create' | 'view' | 'retrieve' | 'history' | 'about';
