import { httpService } from '@/services/auth/authService'
import type { BookingApiResponse } from '@/composables/booking/types'
import type { WalletAccount, WalletOverview, WalletPaymentMetadata, WalletTransaction, WalletTransactions } from '@/composables/wallet/types'

// SERVICES
export const walletService = {
  getWallet: async (): Promise<WalletAccount> => {
    const response = await httpService.get<BookingApiResponse<WalletOverview>>('/v2/wallet')
    return response.data.wallet
  },
  pay: async (amount: number, meta?: WalletPaymentMetadata): Promise<WalletTransaction> => {
    const response = await httpService.post<BookingApiResponse<WalletTransaction>>('/v2/wallet/pay', { amount, ...meta })
    return response.data
  },
  getTransactions: async (limit = 50, page = 1, filters?: {type: string; from: string; to: string}, signal?: AbortSignal): Promise<WalletTransactions> => {
    const response = await httpService.get<BookingApiResponse<WalletTransactions>>('/v2/wallet/transactions', { params: { per_page: limit, page, ...filters }, signal })
    return response.data
  },
}
