import { httpService } from '@/services/auth/authService'
import type { BookingApiResponse } from '@/composables/booking/types'
import type { CheckoutPreference } from '@/composables/wallet/types'

// SERVICES
export const mercadoPagoService = {
  getPublicKey: () => httpService.get<BookingApiResponse<{ public_key: string }>>('/v2/mercadopago/public-key'),
  createWalletPreference: async (amount: number, description: string): Promise<CheckoutPreference> => {
    const response = await httpService.post<BookingApiResponse<CheckoutPreference>>('/v2/mercadopago/wallet-preference', { amount, description })
    return response.data
  },
  createAppointmentPreference: async (appointmentId: number): Promise<CheckoutPreference> => {
    const response = await httpService.post<BookingApiResponse<CheckoutPreference>>('/v2/mercadopago/appointment-preference', { appointment_id: appointmentId })
    return response.data
  },
}
