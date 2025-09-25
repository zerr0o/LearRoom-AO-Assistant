export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  citations?: Citation[];
}

export interface Citation {
  id: string;
  text: string;
  source: string;
  filename?: string;
  page: number;
  position: number;
  startIndex?: number;
  endIndex?: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  documents: UploadedDocument[];
  vectorStoreId?: string;
}

export interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  uploadedAt: Date;
  vectorized: boolean;
  content?: string;
  fileId?: string;
  vectorStoreFileId?: string;
}

export interface AppSettings {
  openaiToken: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface User {
  email: string;
  isAuthenticated: boolean;
}