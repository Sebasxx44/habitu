import { httpService } from '@/services/auth/authService'
import type { BookingApiResponse } from '@/composables/booking/types'
import type { BusinessRecommendation, CreateMarketingAd, MarketingAd, MarketingPromotion, PromotionValidation } from '@/modules/marketing/types'

// SERVICES
export const recommendationService = {
  getRecommendations: async (lat?: number, lng?: number, limit = 10): Promise<BusinessRecommendation[]> => {
    const response = await httpService.get<BookingApiResponse<BusinessRecommendation[]>>('/v2/recommendations', { params: { lat, lng, limit } })
    return response.data
  },
}
export const adService = {
  getAds: async (placement: string, signal?: AbortSignal): Promise<MarketingAd[]> => {
    const response = await httpService.get<BookingApiResponse<MarketingAd[]>>('/v2/ads', { params: { placement }, signal })
    return response.data
  },
  getMyAds: async (): Promise<MarketingAd[]> => {
    const response = await httpService.get<BookingApiResponse<MarketingAd[]>>('/v2/ads/my')
    return response.data
  },
  store: async (data: CreateMarketingAd): Promise<MarketingAd> => {
    const response = await httpService.post<BookingApiResponse<MarketingAd>>('/v2/ads', data)
    return response.data
  },
  recordClick: async (adId: number, deliveryToken: string): Promise<void> => { await httpService.post(`/v2/ads/${adId}/click`, { delivery_token: deliveryToken }) },
  recordImpression: async (adId: number, deliveryToken: string): Promise<void> => { await httpService.post(`/v2/ads/${adId}/impression`, { delivery_token: deliveryToken }) },
}
export const promotionService = {
  getPromotions: async (businessId?: number): Promise<MarketingPromotion[]> => {
    const response = await httpService.get<BookingApiResponse<MarketingPromotion[]>>('/v2/promotions', { params: { business_id: businessId } })
    return response.data
  },
  validateCode: async (code: string, subtotal: number, businessId?: number): Promise<PromotionValidation> => {
    const response = await httpService.post<BookingApiResponse<PromotionValidation>>('/v2/promotions/validate', { code, subtotal, business_id: businessId })
    return response.data
  },
}
