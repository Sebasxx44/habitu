import type { BookingApiResponse } from '@/composables/booking/types'
import { httpService } from '@/services/auth/authService'
import { clientAppointmentsService } from '@/services/booking/clientAppointmentsService'
import type { AppointmentPage, AppointmentPageQuery } from '@/composables/appointments/types'
import type { Business, Professional, Client, Service, Appointment } from '@/types/models'

// Helper to unwrap v2 ServiceResponse format: { success, data, message }
// Also handles paginated responses where data = { current_page, data: [...] }
function unwrap<T>(res: any): T {
  if (res && typeof res === 'object' && 'data' in res && 'success' in res) {
    const data = res.data
    // Paginated Laravel response: extract the inner data array
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return data.data as T
    }
    return data as T
  }
  return res as T
}

const STATUS_TO_UI: Record<string, string> = {
  PENDING: 'PENDIENTE',
  CONFIRMED: 'CONFIRMADA',
  COMPLETED: 'COMPLETADA',
  CANCELLED: 'CANCELADA',
  NO_SHOW: 'NO_ASISTIO',
  RESCHEDULED: 'PENDIENTE',
}

function dateOnly(value?: string) {
  return value ? String(value).split('T')[0] : value
}

function timeOnly(value?: string) {
  return value ? String(value).slice(0, 5) : value
}

function normalizeAppointment(appt: any): Appointment {
  if (!appt) return appt
  const status = typeof appt.status === 'string' ? appt.status : appt.status?.value
  return {
    ...appt,
    date: dateOnly(appt.date),
    time: timeOnly(appt.time || appt.start_time),
    start_time: timeOnly(appt.start_time || appt.time),
    status: STATUS_TO_UI[status] || status || 'PENDIENTE',
    barber: appt.barber || appt.professional,
    barber_id: appt.barber_id || appt.professional_id,
    barberShop: appt.barberShop || appt.business,
    barber_shop_id: appt.barber_shop_id || appt.business_id,
    total: Number(appt.total ?? appt.final_price ?? appt.price ?? 0),
    price: Number(appt.price ?? appt.final_price ?? 0),
  } as Appointment
}

function normalizeService(service: any): Service {
  return service ? {
    ...service,
    barber_shop_id: service.barber_shop_id || service.business_id,
    barbershop_id: service.barbershop_id || service.business_id,
    duration: service.duration || service.duration_minutes,
    category: typeof service.category === 'string' ? service.category : service.category?.name,
    price: Number(service.price || 0),
  } as Service : service
}

function normalizeProfessional(professional: any): Professional {
  return professional ? {
    ...professional,
    barber_shop_id: professional.barber_shop_id || professional.business_id,
    barbershop_id: professional.barbershop_id || professional.business_id,
  } as Professional : professional
}

function normalizeBusiness(business: any): Business {
  if (!business) return business
  const mainBranch = business.mainBranch || business.main_branch || business.branches?.find((b: any) => b.is_main_branch) || business.branches?.[0]
  const branches = business.branches?.length ? business.branches : mainBranch ? [mainBranch] : []
  return {
    ...business,
    mainBranch,
    main_branch: mainBranch,
    branches,
    lat: business.lat ?? mainBranch?.lat,
    lng: business.lng ?? mainBranch?.lng,
    address: business.address ?? mainBranch?.address,
    phone: business.phone ?? mainBranch?.phone,
  } as Business
}

// ============================================
// BUSINESS SERVICE (Multiservice) — v2 API
// ============================================

class BusinessService {
  private http = httpService

  getAll = async (filters?: { search?: string; active?: string; category_id?: string }): Promise<{ businesses: Business[] }> => {
    const params = new URLSearchParams()
    if (filters?.search) params.set('search', filters.search)
    if (filters?.active === '0' || filters?.active === '1') params.set('active', filters.active)
    if (filters?.category_id) params.set('category_id', filters.category_id)
    const response = await this.http.get<BookingApiResponse<Business[]>>(`/v2/businesses?${params}`)
    return { businesses: response.data.map(normalizeBusiness) }
  }

  async getById(id: number): Promise<Business> {
    const res = await this.http.get<BookingApiResponse<Business>>(`/v2/businesses/${id}`)
    return normalizeBusiness(res.data)
  }

  async create(data: Partial<Business>): Promise<Business> {
    const res = await this.http.post<any>('/v2/businesses', data)
    return unwrap(res)
  }

  async update(id: number, data: Partial<Business>): Promise<Business> {
    const res = await this.http.put<any>(`/v2/businesses/${id}`, data)
    return unwrap(res)
  }

  async delete(id: number): Promise<void> {
    await this.http.delete(`/v2/businesses/${id}`)
  }

  async search(query: string, categoryId?: number, lat?: number, lng?: number, radius?: number): Promise<Business[]> {
    const params = new URLSearchParams()
    params.set('q', query)
    if (categoryId) params.set('category_id', String(categoryId))
    if (lat) params.set('lat', String(lat))
    if (lng) params.set('lng', String(lng))
    if (radius) params.set('radius', String(radius))
    const res = await this.http.get<any>(`/v2/businesses/search?${params}`)
    return (unwrap<any[]>(res) || []).map(normalizeBusiness)
  }
}

export const businessService = new BusinessService()

// ============================================
// PROFESSIONAL SERVICE (Multiservice) — v2 API
// ============================================

class ProfessionalService {
  private http = httpService

  async getAll(businessId?: number): Promise<Professional[]> {
    const params = businessId ? `?business_id=${businessId}` : ''
    const res = await this.http.get<any>(`/v2/professionals${params}`)
    return (unwrap<any[]>(res) || []).map(normalizeProfessional)
  }

  async getById(id: number): Promise<Professional> {
    const res = await this.http.get<any>(`/v2/professionals/${id}`)
    return normalizeProfessional(unwrap(res))
  }

  async create(data: Partial<Professional>): Promise<Professional> {
    const res = await this.http.post<any>('/v2/professionals', data)
    return unwrap(res)
  }

  async update(id: number, data: Partial<Professional>): Promise<Professional> {
    const res = await this.http.put<any>(`/v2/professionals/${id}`, data)
    return unwrap(res)
  }

  async delete(id: number): Promise<void> {
    await this.http.delete(`/v2/professionals/${id}`)
  }

  async getStats(businessId: number): Promise<any> {
    const res = await this.http.get<any>(`/v2/professionals/stats?business_id=${businessId}`)
    return unwrap(res)
  }

  async getAvailability(id: number, date?: string): Promise<any> {
    const params = date ? `?date=${date}` : ''
    const res = await this.http.get<any>(`/v2/professionals/${id}/availability${params}`)
    return unwrap(res)
  }
}

export const professionalService = new ProfessionalService()

// ============================================
// CLIENT SERVICE — v2 API
// ============================================

class ClientService {
  private http = httpService

  async getAll(businessId?: number): Promise<Client[]> {
    const params = businessId ? `?business_id=${businessId}` : ''
    const res = await this.http.get<any>(`/v2/clients${params}`)
    return unwrap(res)
  }

  async getById(id: number): Promise<Client> {
    const res = await this.http.get<any>(`/v2/clients/${id}`)
    return unwrap(res)
  }

  async create(data: Partial<Client>): Promise<Client> {
    const res = await this.http.post<any>('/v2/clients', data)
    return unwrap(res)
  }

  async update(id: number, data: Partial<Client>): Promise<Client> {
    const res = await this.http.put<any>(`/v2/clients/${id}`, data)
    return unwrap(res)
  }

  async delete(id: number): Promise<void> {
    await this.http.delete(`/v2/clients/${id}`)
  }

  async getStats(businessId: number): Promise<any> {
    const res = await this.http.get<any>(`/v2/clients/stats?business_id=${businessId}`)
    return unwrap(res)
  }
}

export const clientService = new ClientService()

// ============================================
// SERVICE SERVICE — v2 API
// ============================================

class ServiceService {
  private http = httpService

  async getAll(businessId?: number): Promise<Service[]> {
    const params = businessId ? `?business_id=${businessId}` : ''
    const res = await this.http.get<any>(`/v2/services${params}`)
    return (unwrap<any[]>(res) || []).map(normalizeService)
  }

  async getById(id: number): Promise<Service> {
    const res = await this.http.get<any>(`/v2/services/${id}`)
    return normalizeService(unwrap(res))
  }

  async create(data: Partial<Service>): Promise<Service> {
    const res = await this.http.post<any>('/v2/services', data)
    return unwrap(res)
  }

  async update(id: number, data: Partial<Service>): Promise<Service> {
    const res = await this.http.put<any>(`/v2/services/${id}`, data)
    return unwrap(res)
  }

  async delete(id: number): Promise<void> {
    await this.http.delete(`/v2/services/${id}`)
  }

  async getStats(id: number): Promise<any> {
    const res = await this.http.get<any>(`/v2/services/${id}/stats`)
    return unwrap(res)
  }
}

export const serviceService = new ServiceService()

// ============================================
// APPOINTMENT SERVICE — v2 API
// ============================================

class AppointmentService {
  private http = httpService

  getPage = (query: AppointmentPageQuery, signal: AbortSignal): Promise<AppointmentPage> => clientAppointmentsService.getPage(query, signal)


  async getAll(businessId?: number): Promise<Appointment[]> {
    const params = businessId ? `?business_id=${businessId}` : ''
    const res = await this.http.get<any>(`/v2/appointments${params}`)
    return (unwrap<any[]>(res) || []).map(normalizeAppointment)
  }

  async getById(id: number): Promise<Appointment> {
    const res = await this.http.get<any>(`/v2/appointments/${id}`)
    return normalizeAppointment(unwrap(res))
  }

  async create(data: Partial<Appointment>): Promise<Appointment> {
    const payload = await this.toApiPayload(data)
    const res = await this.http.post<any>('/v2/appointments', payload)
    return normalizeAppointment(unwrap(res))
  }

  async update(id: number, data: Partial<Appointment>): Promise<Appointment> {
    const res = await this.http.put<any>(`/v2/appointments/${id}`, data)
    return normalizeAppointment(unwrap(res))
  }

  async delete(id: number): Promise<void> {
    await this.http.delete(`/v2/appointments/${id}`)
  }

  async getStats(businessId: number): Promise<any> {
    const res = await this.http.get<any>(`/v2/appointments/stats?business_id=${businessId}`)
    return unwrap(res)
  }

  async cancel(id: number, data: { reason?: string }): Promise<Appointment> {
    const res = await this.http.post<any>(`/v2/appointments/${id}/cancel`, data)
    return normalizeAppointment(unwrap(res) || { id, status: 'CANCELLED' })
  }

  async complete(id: number): Promise<Appointment> {
    const res = await this.http.post<any>(`/v2/appointments/${id}/complete`, {})
    return normalizeAppointment(unwrap(res) || { id, status: 'COMPLETED' })
  }

  async reschedule(id: number, data: { date: string; time: string; barber_id?: number; professional_id?: number }): Promise<Appointment> {
    const res = await this.http.post<any>(`/v2/appointments/${id}/reschedule`, {
      date: data.date,
      start_time: timeOnly(data.time),
      professional_id: data.professional_id || data.barber_id,
    })
    return normalizeAppointment(unwrap(res))
  }

  private async toApiPayload(data: any) {
    const businessId = data.business_id || data.barber_shop_id || data.barbershop_id
    const professionalId = data.professional_id || data.barber_id
    let branchId = data.branch_id

    if (!branchId && businessId) {
      const business = unwrap<any>(await this.http.get<any>(`/v2/businesses/${businessId}`))
      branchId = business?.branches?.find((b: any) => b.is_main_branch)?.id || business?.branches?.[0]?.id
    }

    return {
      business_id: businessId,
      branch_id: branchId,
      client_id: data.client_id,
      professional_id: professionalId,
      service_id: data.service_id,
      resource_id: data.resource_id,
      date: data.date,
      start_time: timeOnly(data.start_time || data.time),
      price: Number(data.price ?? data.total ?? 0),
      notes: data.notes,
      source: data.source || 'web',
    }
  }
}

export const appointmentService = new AppointmentService()

// ============================================
// LEGACY ALIASES (Backward Compatibility)
// ============================================

/** @deprecated Use businessService instead */
export const barberShopService = businessService

/** @deprecated Use professionalService instead */
export const barberService = professionalService
