import { httpService } from '../auth/authService'
import type { BarberShop, Barber, Client, Service, Appointment } from '@/types/models'

class BarberShopService {
  private http = httpService

  async getAll(filters?: { search?: string; status?: string; country_id?: string; city_id?: string }): Promise<{ shops: BarberShop[]; countries: any[]; cities: any[] }> {
    const params = new URLSearchParams()
    if (filters?.search) params.set('search', filters.search)
    if (filters?.status) params.set('status', filters.status)
    if (filters?.country_id) params.set('country_id', filters.country_id)
    if (filters?.city_id) params.set('city_id', filters.city_id)
    return this.http.get(`/barber-shops?${params}`)
  }

  async getById(id: number): Promise<BarberShop> {
    return this.http.get(`/barber-shops/${id}`)
  }

  async create(data: Partial<BarberShop>): Promise<BarberShop> {
    return this.http.post('/barber-shops', data)
  }

  async update(id: number, data: Partial<BarberShop>): Promise<BarberShop> {
    return this.http.put(`/barber-shops/${id}`, data)
  }

  async delete(id: number): Promise<void> {
    return this.http.delete(`/barber-shops/${id}`)
  }
}

export const barberShopService = new BarberShopService()

class BarberService {
  private http = httpService

  async getAll(shopId?: number): Promise<Barber[]> {
    const url = shopId ? `/barbers?barber_shop_id=${shopId}` : '/barbers'
    return this.http.get(url)
  }

  async getById(id: number): Promise<Barber> {
    return this.http.get(`/barbers/${id}`)
  }

  async create(data: Partial<Barber>): Promise<Barber> {
    return this.http.post('/barbers', data)
  }

  async update(id: number, data: Partial<Barber>): Promise<Barber> {
    return this.http.put(`/barbers/${id}`, data)
  }

  async delete(id: number): Promise<void> {
    return this.http.delete(`/barbers/${id}`)
  }

  async getStats(shopId: number): Promise<any> {
    return this.http.get(`/barbers/stats?barber_shop_id=${shopId}`)
  }
}

export const barberService = new BarberService()

class ClientService {
  private http = httpService

  async getAll(shopId?: number): Promise<Client[]> {
    const url = shopId ? `/clients?barber_shop_id=${shopId}` : '/clients'
    return this.http.get(url)
  }

  async getById(id: number): Promise<Client> {
    return this.http.get(`/clients/${id}`)
  }

  async create(data: Partial<Client>): Promise<Client> {
    return this.http.post('/clients', data)
  }

  async update(id: number, data: Partial<Client>): Promise<Client> {
    return this.http.put(`/clients/${id}`, data)
  }

  async delete(id: number): Promise<void> {
    return this.http.delete(`/clients/${id}`)
  }

  async getStats(shopId: number): Promise<any> {
    return this.http.get(`/clients/stats?barber_shop_id=${shopId}`)
  }
}

export const clientService = new ClientService()

class ServiceService {
  private http = httpService

  async getAll(): Promise<Service[]> {
    return this.http.get('/services')
  }

  async getById(id: number): Promise<Service> {
    return this.http.get(`/services/${id}`)
  }

  async create(data: Partial<Service>): Promise<Service> {
    return this.http.post('/services', data)
  }

  async update(id: number, data: Partial<Service>): Promise<Service> {
    return this.http.put(`/services/${id}`, data)
  }

  async delete(id: number): Promise<void> {
    return this.http.delete(`/services/${id}`)
  }

  async getStats(id: number): Promise<any> {
    return this.http.get(`/services/${id}/stats`)
  }
}

export const serviceService = new ServiceService()

class AppointmentService {
  private http = httpService

  async getAll(shopId?: number): Promise<Appointment[]> {
    const url = shopId ? `/appointments?barber_shop_id=${shopId}` : '/appointments'
    return this.http.get(url)
  }

  async getById(id: number): Promise<Appointment> {
    return this.http.get(`/appointments/${id}`)
  }

  async create(data: Partial<Appointment>): Promise<Appointment> {
    return this.http.post('/appointments', data)
  }

  async update(id: number, data: Partial<Appointment>): Promise<Appointment> {
    return this.http.put(`/appointments/${id}`, data)
  }

  async delete(id: number): Promise<void> {
    return this.http.delete(`/appointments/${id}`)
  }

  async getStats(shopId: number): Promise<any> {
    return this.http.get(`/appointments/stats?barber_shop_id=${shopId}`)
  }

  async reschedule(id: number, data: { date: string, time: string, barber_id: number }): Promise<Appointment> {
    return this.http.post(`/appointments/${id}/reschedule`, data)
  }

  async cancel(id: number, data: { reason?: string }): Promise<Appointment> {
    return this.http.post(`/appointments/${id}/cancel`, data)
  }
}

export const appointmentService = new AppointmentService()