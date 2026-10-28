// TYPES
export interface ChatMessage {
  id: number;
  sender_id: number;
  content: string;
  created_at: string;
  sender?: { id: number; name: string; photo_url?: string };
}
export interface ChatConversation {
  id: number;
  subject?: string;
  participants: {
    user_id: number;
    user?: { id: number; name: string; photo_url?: string };
  }[];
  messages?: ChatMessage[];
  unread_count: number;
}
export interface ChatAttachment {
  url: string;
  name?: string;
  mime_type?: string;
}
