import { httpService } from '@/services/auth/authService'

export type OnDemandStatus = 'SEARCHING' | 'ACCEPTED' | 'ON_THE_WAY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export interface OnDemandPriceQuote { id: string; amount: number; reason: string; proposed_at: string; accepted_at: string | null; accepted_by: number | null }
export interface OnDemandRequest {
  metadata?: { price_quote?: OnDemandPriceQuote; actual_duration_minutes?: number | null };
  id: number; status: OnDemandStatus; description: string | null;
  professional_id: number | null; completed_at: string | null; estimated_price: number | string | null;
  request_code: string; created_at: string; client_address: string | null;
  client_lat?: string | number | null; client_lng?: string | number | null;
  client?: { id: number; name: string; phone?: string | null } | null;
  business?: { id: number; name: string } | null;
  accepted_at?: string | null; arrived_at?: string | null; started_at?: string | null;
  cancelled_at?: string | null; cancellation_reason?: string | null; search_expires_at?: string | null;
  final_price?: string | number | null; currency?: string;
  status_history?: { id: number; from_status: OnDemandStatus | null; to_status: OnDemandStatus; notes: string | null; created_at: string }[];
  offer_details?: { duration_minutes: number | null; distance_km: number | string | null; travel_estimate_minutes: { min: number; max: number } | null; professional_percentage: number; professional_net_estimate: number | null; business_share_estimate: number | null; materials: string | null };
  service?: { name: string; description: string | null } | null;
  professional_lat: string | number | null; professional_lng: string | number | null;
  professional: { id: number; name: string; photo_url?: string | null; phone?: string | null; rating?: string | number | null; vehicle?: string | null } | null;
}
interface ApiResult<T> { data: T; success: boolean; message: string }
export interface OnDemandLocation { lat: number | string; lng: number | string; recorded_at: string; is_stale?: boolean; fresh_until?: string }
interface RequestPayload { client_id?: number; description: string; estimated_price?: number; client_lat: number; client_lng: number; client_address: string }

export const onDemandService = {
  reassign: async (id: number, reason: string) => httpService.post(`/v2/on-demand/${id}/reassign`, { reason }),
  proposeQuote: async (id: number, amount: number, reason: string) => (await httpService.post<ApiResult<OnDemandPriceQuote>>(`/v2/on-demand/${id}/price-quote`, { amount, reason })).data,
  acceptQuote: async (id: number, quoteId: string) => (await httpService.post<ApiResult<OnDemandPriceQuote>>(`/v2/on-demand/${id}/price-quote/accept`, { quote_id: quoteId })).data,
  presence: async () => (await httpService.get<ApiResult<{ is_paused: boolean }>>('/v2/on-demand/presence')).data,
  setPresence: async (isPaused: boolean) => (await httpService.put<ApiResult<{ is_paused: boolean }>>('/v2/on-demand/presence', { is_paused: isPaused })).data,
  reject: async (id: number) => httpService.post(`/v2/on-demand/${id}/reject`, {}),
  getAll: async () => (await httpService.get<ApiResult<OnDemandRequest[]>>('/v2/on-demand')).data,
  getById: async (id: number) => (await httpService.get<ApiResult<OnDemandRequest>>(`/v2/on-demand/${id}`)).data,
  request: async (data: RequestPayload) => (await httpService.post<ApiResult<OnDemandRequest>>('/v2/on-demand/request', data)).data,
  accept: async (id: number) => (await httpService.post<ApiResult<OnDemandRequest>>(`/v2/on-demand/${id}/accept`, {})).data,
  updateStatus: async (id: number, status: OnDemandStatus, notes?: string, finalPrice?: number) =>
    (await httpService.post<ApiResult<OnDemandRequest>>(`/v2/on-demand/${id}/update-status`, { status, notes, final_price: finalPrice })).data,
  cancel: async (id: number, reason: string) => (await httpService.post<ApiResult<OnDemandRequest>>(`/v2/on-demand/${id}/cancel`, { reason })).data,
  getNearbyProfessionals: async (lat: number, lng: number, radius?: number, businessId?: number) => {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng) })
    if (radius) params.set('radius', String(radius))
    if (businessId) params.set('business_id', String(businessId))
    return (await httpService.get<ApiResult<{ id: number; name: string; lat: number; lng: number }[]>>(`/v2/on-demand/nearby-professionals?${params}`)).data
  },
}

export const trackingService = {
  updateLocation: async (data: { lat: number; lng: number; accuracy?: number; speed?: number; heading?: number; trackable_type?: string; trackable_id?: number }) =>
    (await httpService.post<ApiResult<OnDemandLocation>>('/v2/tracking/location', data)).data,
  getLatestLocation: async (id: number) => (await httpService.get<ApiResult<OnDemandLocation>>(`/v2/tracking/professionals/${id}/location`)).data,
  getLocationHistory: async (id: number, since: string) => (await httpService.get<ApiResult<OnDemandLocation[]>>(`/v2/tracking/professionals/${id}/history?since=${encodeURIComponent(since)}`)).data,
}
