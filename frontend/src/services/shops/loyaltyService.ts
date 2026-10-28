import { httpService } from '../auth/authService'

function unwrap<T>(res: any): T {
  if (res && typeof res === 'object' && 'data' in res && 'success' in res) {
    const data = res.data
    if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data as T
    return data as T
  }
  return res as T
}

class LoyaltyService {
  private http = httpService

  async getCards(filters?: { search?: string; status?: string; program_id?: number; business_id?: number }): Promise<any[]> {
    const params = new URLSearchParams()
    if (filters?.search) params.set('search', filters.search)
    if (filters?.status) params.set('status', filters.status)
    if (filters?.program_id) params.set('program_id', String(filters.program_id))
    if (filters?.business_id) params.set('business_id', String(filters.business_id))
    const res = await this.http.get<any>(`/loyalty/cards?${params}`)
    return unwrap(res)
  }

  async getStats(): Promise<any> {
    return unwrap(await this.http.get<any>('/loyalty/stats'))
  }

  async getCardDetail(cardId: number): Promise<any> {
    return unwrap(await this.http.get<any>(`/loyalty/cards/${cardId}`))
  }

  async getPrograms(): Promise<any[]> {
    return unwrap(await this.http.get<any>('/loyalty/programs'))
  }

  async createProgram(data: any): Promise<any> {
    return unwrap(await this.http.post<any>('/loyalty/programs', data))
  }

  async updateProgram(id: number, data: any): Promise<any> {
    return unwrap(await this.http.put<any>(`/loyalty/programs/${id}`, data))
  }

  async deleteProgram(id: number): Promise<any> {
    return unwrap(await this.http.delete<any>(`/loyalty/programs/${id}`))
  }

  async addStamp(cardId: number): Promise<any> {
    return unwrap(await this.http.post<any>(`/loyalty/cards/${cardId}/stamp`, {}))
  }

  async redeemReward(cardId: number): Promise<any> {
    return unwrap(await this.http.post<any>(`/loyalty/cards/${cardId}/redeem`, {}))
  }
}

export const loyaltyService = new LoyaltyService()
