import { httpService } from '@/services/auth/authService'
import type { QueueEntry, QueueResponse, SmartQueue } from '@/composables/queue/types'

// SERVICE
export const smartQueueService = {
  getByBusiness: async (businessId: number) => (await httpService.get<QueueResponse<SmartQueue[]>>(`/v2/smart-queues?business_id=${businessId}`)).data,
  createQueue: async (data: { business_id: number; branch_id?: number; name?: string }) => (await httpService.post<QueueResponse<SmartQueue>>('/v2/smart-queues', data)).data,
  getQueueStatus: async (queueId: number) => (await httpService.get<QueueResponse<SmartQueue>>(`/v2/smart-queues/${queueId}`)).data,
  joinQueue: async (queueId: number, clientId: number) => (await httpService.post<QueueResponse<QueueEntry>>(`/v2/smart-queues/${queueId}/join`, { client_id: clientId })).data,
  callNext: async (queueId: number) => (await httpService.post<QueueResponse<QueueEntry>>(`/v2/smart-queues/${queueId}/call-next`, {})).data,
  startServing: async (entryId: number) => (await httpService.post<QueueResponse<QueueEntry>>(`/v2/smart-queues/entries/${entryId}/start`, {})).data,
  completeEntry: async (entryId: number) => (await httpService.post<QueueResponse<QueueEntry>>(`/v2/smart-queues/entries/${entryId}/complete`, {})).data,
  cancelEntry: async (entryId: number) => (await httpService.post<QueueResponse<QueueEntry>>(`/v2/smart-queues/entries/${entryId}/cancel`, {})).data,
  createDisplay: async (queueId: number, name: string) => (await httpService.post<QueueResponse<{ id: number; display_name: string; display_code: string }>>(`/v2/smart-queues/${queueId}/displays`, { name })).data,
}
