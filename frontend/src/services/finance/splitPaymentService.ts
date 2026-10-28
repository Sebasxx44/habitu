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

class SplitPaymentService {
  private http = httpService

  async create(data: { appointment_id: number; total_amount: number; participants: number[] }) {
    const res = await this.http.post<any>('/v2/split-payments', data)
    return unwrap(res)
  }

  async markPaid(participantId: number) {
    const res = await this.http.post<any>(`/v2/split-payments/participants/${participantId}/pay`, {})
    return unwrap(res)
  }

  async getMySplits() {
    const res = await this.http.get<any>('/v2/split-payments/my')
    return unwrap(res)
  }

  async getByAppointment(appointmentId: number) {
    const res = await this.http.get<any>(`/v2/split-payments/appointment/${appointmentId}`)
    return unwrap(res)
  }
}

export const splitPaymentService = new SplitPaymentService()
