import { httpService } from '@/services/auth/authService'
import type { DetailedReport } from '@/modules/reports/types'

class DashboardService {
  async getSuperAdmin(period = 'month') {
    return httpService.get(`/dashboard/superadmin?period=${period}`)
  }

  async getAdminBarberia(shopId?: number) {
    const url = shopId ? `/dashboard/admin-barberia?shop_id=${shopId}` : '/dashboard/admin-barberia'
    return httpService.get(url)
  }

  async getBarbero(barberId?: number, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (barberId) params.append('barber_id', barberId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const queryString = params.toString();
    const url = queryString ? `/dashboard/barbero?${queryString}` : '/dashboard/barbero';
    return httpService.get(url)
  }

  async getCliente() {
    return httpService.get('/dashboard/cliente')
  }

  async getShopsMap() {
    return httpService.get('/dashboard/shops-map')
  }

  async getIncomeChart(days = 30, shopId?: number) {
    const params = new URLSearchParams({ days: String(days) })
    if (shopId) params.set('shop_id', String(shopId))
    return httpService.get(`/dashboard/income-chart?${params}`)
  }

  getDetailedReport = async (startDate?: string, endDate?: string, currency?: string): Promise<DetailedReport> => {
    const params = new URLSearchParams()
    if (startDate) params.set('start_date', startDate)
    if (endDate) params.set('end_date', endDate)
    if (currency) params.set('currency', currency)
    return httpService.get<DetailedReport>(`/reports/detailed?${params}`)
  }

  async getSuperAdminV2() {
    return httpService.get('/v2/dashboard/superadmin')
  }

  async getBusinessV2(businessId?: number) {
    const params = new URLSearchParams()
    if (businessId) params.set('business_id', String(businessId))
    return httpService.get(`/v2/dashboard/business?${params}`)
  }
}

export const dashboardService = new DashboardService()