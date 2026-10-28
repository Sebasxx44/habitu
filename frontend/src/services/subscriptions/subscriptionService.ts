import { httpService } from '@/services/auth/authService'

export interface SubscriptionPlan {
  id: number; name: string; description: string | null; price: number | string; currency: string;
  billing_cycle: string; credits_per_cycle: number; features: string[] | null; is_active: boolean;
}
export interface UserSubscription {
  id: number; plan_id: number; status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  starts_at: string; ends_at: string; credits_remaining: number; plan: SubscriptionPlan;
}
export interface SubscriptionUsage {
  id: number; description: string | null; created_at: string; credits_used: number;
}
interface ApiResult<T> { data: T; success: boolean; message: string }

export const subscriptionService = {
  getPlans: async () => (await httpService.get<ApiResult<SubscriptionPlan[]>>('/v2/subscriptions/plans')).data,
  getMySubscription: async () => (await httpService.get<ApiResult<UserSubscription>>('/v2/subscriptions/my')).data,
  subscribe: async (planId: number, idempotencyKey: string) =>
    (await httpService.post<ApiResult<UserSubscription>>('/v2/subscriptions', { plan_id: planId, idempotency_key: idempotencyKey, payment_method: 'WALLET' })).data,
  cancel: async (id: number, reason?: string) =>
    (await httpService.post<ApiResult<UserSubscription>>(`/v2/subscriptions/${id}/cancel`, { reason })).data,
  getUsageHistory: async (limit = 50) =>
    (await httpService.get<ApiResult<{ data: SubscriptionUsage[] }>>(`/v2/subscriptions/usage?limit=${limit}`)).data.data,
}
