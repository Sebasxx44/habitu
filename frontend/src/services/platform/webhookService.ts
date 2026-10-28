import { httpService } from '@/services/auth/authService'

export interface OutgoingWebhook { id: number; name: string; url: string; events: string[]; active: boolean }
interface WebhookRecord extends Omit<OutgoingWebhook, 'events'> { events: string[] | string }
interface ApiResult<T> { data: T; success: boolean; message: string }

export const webhookService = {
  getWebhooks: async (): Promise<OutgoingWebhook[]> => {
    const response = await httpService.get<ApiResult<WebhookRecord[]>>('/v2/webhooks')
    return response.data.map(webhook => ({ ...webhook, events: typeof webhook.events === 'string' ? JSON.parse(webhook.events) as string[] : webhook.events }))
  },
  create: (data: { name: string; url: string; events: string[] }) =>
    httpService.post<ApiResult<{ id: number }>>('/v2/webhooks', data),
  update: (id: number, data: Partial<OutgoingWebhook>) =>
    httpService.put<ApiResult<null>>(`/v2/webhooks/${id}`, data),
  delete: (id: number) => httpService.delete<ApiResult<null>>(`/v2/webhooks/${id}`),
  getDeliveries: (id: number) => httpService.get<ApiResult<{ id: number; status: string; created_at: string }[]>>(`/v2/webhooks/${id}/deliveries`),
}
