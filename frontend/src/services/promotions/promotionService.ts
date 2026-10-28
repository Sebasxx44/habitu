import { httpService } from '@/services/auth/authService'

export interface PromotionServiceItem {
  id: number
  name: string
  pivot: { discount: number; type: 'PORCENTAJE' | 'FIJO' }
}

export interface Promotion {
  id: number
  title: string
  description: string
  image_url?: string
  discount: number
  type: 'PORCENTAJE' | 'FIJO'
  start_date: string
  end_date: string
  active: boolean
  promo_code?: string
  redemptions_count?: number
  services?: PromotionServiceItem[]
}

export interface PromotionStats {
  total_redemptions: number
  total_saved: number
  unique_clients: number
  redemptions_by_month: Record<string, number>
  recent_redemptions: Array<{ id: number; created_at: string; saved_amount: number | string; client?: { id: number; name: string } }>
}

interface PromotionRecord extends Omit<Promotion, 'discount' | 'type' | 'active' | 'services'> {
  discount: number | string
  type: string
  is_active: boolean
  services?: Array<{ id: number; name: string; pivot: { discount: number | string; type: string } }>
}

export interface PromotionInput {
  title?: string
  name?: string
  description?: string
  image_url?: string
  discount?: number
  value?: number
  type: string
  start_date: string
  end_date: string
  active: boolean
  promo_code?: string
  code?: string
  services?: Array<{ id: number; discount: number; type: string }>
  min_purchase?: number
  max_discount?: number
  usage_limit?: number
  per_user_limit?: number
}

const normalizePromotion = (record: PromotionRecord): Promotion => ({
  ...record,
  discount: Number(record.discount),
  type: record.type === 'PERCENTAGE' ? 'PORCENTAJE' : 'FIJO',
  active: record.is_active,
  start_date: record.start_date.slice(0, 10),
  end_date: record.end_date.slice(0, 10),
  services: record.services?.map(service => ({ ...service, pivot: {
    discount: Number(service.pivot.discount), type: service.pivot.type === 'PERCENTAGE' ? 'PORCENTAJE' : 'FIJO',
  } })),
})

export const promotionService = {
  getAll: async (businessId?: number): Promise<Promotion[]> => {
    const response = await httpService.get<{ data: PromotionRecord[] }>('/v2/promotions', { params: { business_id: businessId } })
    return response.data.map(normalizePromotion)
  },
  getManaged: async (): Promise<Promotion[]> => {
    const response = await httpService.get<{ data: PromotionRecord[] }>('/v2/promotions/manage')
    return response.data.map(normalizePromotion)
  },
  getPromotions: async (): Promise<Promotion[]> => promotionService.getAll(),
  getStats: async (id: number): Promise<PromotionStats> => (await httpService.get<{ data: PromotionStats }>(`/v2/promotions/${id}/stats`)).data,
  validate: async (code: string, subtotal = 0, businessId?: number) =>
    (await httpService.post<{ data: { promotion_id: number; discount: number; final_total: number } }>('/v2/promotions/validate', { code, subtotal, business_id: businessId })).data,
  create: async (data: PromotionInput): Promise<Promotion> => normalizePromotion((await httpService.post<{ data: PromotionRecord }>('/v2/promotions', data)).data),
  update: async (id: number, data: PromotionInput): Promise<Promotion> => normalizePromotion((await httpService.put<{ data: PromotionRecord }>(`/v2/promotions/${id}`, data)).data),
  delete: async (id: number): Promise<void> => { await httpService.delete(`/v2/promotions/${id}`) },
}
