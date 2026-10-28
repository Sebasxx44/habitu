import { httpService } from '../auth/authService'

export const paymentService = {
  createPreference: (appointmentId: number) =>
    httpService.post('/payments/preference', { appointment_id: appointmentId }),
  markPaid: (appointmentId: number) =>
    httpService.post('/payments/mark-paid', { appointment_id: appointmentId }),
}