import { httpService } from '@/services/auth/authService'
import type { ClientMembership, MembershipPlan, MembershipResponse } from '@/composables/membership/types'

// SERVICE
export const membershipService = {
  getPlans: async (businessId: number) => (await httpService.get<MembershipResponse<MembershipPlan[]>>(`/v2/memberships/plans?business_id=${businessId}`)).data,
  createPlan: async (data: Partial<MembershipPlan>) => (await httpService.post<MembershipResponse<MembershipPlan>>('/v2/memberships/plans', data)).data,
  updatePlan: async (id: number, data: Partial<MembershipPlan>) => (await httpService.put<MembershipResponse<MembershipPlan>>(`/v2/memberships/plans/${id}`, data)).data,
  subscribe: async (clientId: number, planId: number) => (await httpService.post<MembershipResponse<ClientMembership>>('/v2/memberships/subscribe', { client_id: clientId, plan_id: planId })).data,
  getMyMemberships: async (clientId: number) => (await httpService.get<MembershipResponse<ClientMembership[]>>(`/v2/memberships/my?client_id=${clientId}`)).data,
  cancelMembership: async (id: number, clientId: number) => (await httpService.post<MembershipResponse<ClientMembership>>(`/v2/memberships/${id}/cancel`, { client_id: clientId })).data,
}
