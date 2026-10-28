import { httpService } from '../auth/authService'

export const waitlistService = {
  getMyWaitlist: () => httpService.get('/v2/waitlist'),
  join: (data: {
    business_id: number
    service_id: number
    professional_id?: number
    preferred_date?: string
    preferred_time_start?: string
    preferred_time_end?: string
  }) => httpService.post('/v2/waitlist', data),
  cancel: (id: number) => httpService.post(`/v2/waitlist/${id}/cancel`),
  getBusinessWaitlist: () => httpService.get('/v2/waitlist/business'),
}
