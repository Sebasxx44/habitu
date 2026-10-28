import { httpService } from '../auth/authService'

function unwrap<T>(res: any): T {
  if (res && typeof res === 'object' && 'data' in res && 'success' in res) {
    const data = res.data
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return data.data as T
    }
    return data as T
  }
  return res as T
}

class BNPLService {
  private http = httpService

  async apply(data: { client_id: number; appointment_id: number; total_amount: number; installments_count?: number }) {
    const res = await this.http.post<any>('/v2/bnpl/apply', data)
    return unwrap(res)
  }

  async approve(id: number) {
    const res = await this.http.post<any>(`/v2/bnpl/${id}/approve`, {})
    return unwrap(res)
  }

  async reject(id: number) {
    const res = await this.http.post<any>(`/v2/bnpl/${id}/reject`, {})
    return unwrap(res)
  }

  async payInstallment(id: number) {
    const res = await this.http.post<any>(`/v2/bnpl/installments/${id}/pay`, {})
    return unwrap(res)
  }

  async getMyApplications() {
    const res = await this.http.get<any>('/v2/bnpl/my')
    return unwrap(res)
  }

  async getByAppointment(appointmentId: number) {
    const res = await this.http.get<any>(`/v2/bnpl/appointment/${appointmentId}`)
    return unwrap(res)
  }
}

export const bnplService = new BNPLService()
