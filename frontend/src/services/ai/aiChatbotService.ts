import { httpService } from '@/services/auth/authService'
import i18n from '@/i18n'
import type { AIMessage, AIConversation, AssistantContext } from '@/modules/assistant/types'

// TYPES
interface ApiResult<T> { data: T; success: boolean; message: string }
// SERVICES
export const aiChatbotService = {
  forget: async (sessionId: string) => httpService.delete(`/v2/ai-chat/${encodeURIComponent(sessionId)}`),
  start: async (contextType?: string, contextData?: Record<string, string | number | boolean>) =>
    (await httpService.post<ApiResult<AIConversation>>('/v2/ai-chat/start', { context_type: contextType, context_data: contextData, locale: i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'es' })).data,
  sendMessage: async (sessionId: string, content: string, image?: string | null, context?: AssistantContext) =>
    (await httpService.post<ApiResult<AIMessage>>(`/v2/ai-chat/${encodeURIComponent(sessionId)}/send`, { content, image, context })).data,
  getConversation: async (sessionId: string) =>
    (await httpService.get<ApiResult<AIConversation>>(`/v2/ai-chat/${encodeURIComponent(sessionId)}`)).data,
  getHistory: async (limit = 20) =>
    (await httpService.get<ApiResult<AIConversation[]>>(`/v2/ai-chat/history?limit=${limit}`, { headers: { 'Cache-Control': 'no-cache' } })).data,
  closeConversation: async (sessionId: string) =>
    (await httpService.post<ApiResult<null>>(`/v2/ai-chat/${encodeURIComponent(sessionId)}/close`, {})).data,
}
