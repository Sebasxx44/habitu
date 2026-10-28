import { httpService } from '@/services/auth/authService'
import type { BookingApiResponse } from '@/composables/booking/types'
import type { ChatAttachment, ChatConversation, ChatMessage } from '@/modules/communications/types'

// SERVICES
export const chatService = {
  getConversations: async (): Promise<ChatConversation[]> => {
    const response = await httpService.get<BookingApiResponse<ChatConversation[]>>('/v2/chat/conversations')
    return response.data
  },
  getMessages: async (conversationId: number): Promise<ChatMessage[]> => {
    const response = await httpService.get<BookingApiResponse<ChatMessage[]>>(`/v2/chat/conversations/${conversationId}`)
    return response.data
  },
  createConversation: async (participantIds: number[], subject?: string, type = 'DIRECT'): Promise<ChatConversation> => {
    const response = await httpService.post<BookingApiResponse<ChatConversation>>('/v2/chat/conversations', { participant_ids: participantIds, subject, type })
    return response.data
  },
  sendMessage: async (conversationId: number, content: string, attachments?: ChatAttachment[]): Promise<ChatMessage> => {
    const response = await httpService.post<BookingApiResponse<ChatMessage>>(`/v2/chat/conversations/${conversationId}/messages`, { content, attachments })
    return response.data
  },
  getUnreadCount: async (): Promise<{ unread_count: number }> => {
    const response = await httpService.get<BookingApiResponse<{ unread_count: number }>>('/v2/chat/unread')
    return response.data
  },
}
