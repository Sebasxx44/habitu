import { httpService } from '../auth/authService'

export const earningsService = {
  getDashboard: () => httpService.get('/v2/earnings/dashboard'),
  requestWithdrawal: (amount: number, bankAccount: string, bankName: string) =>
    httpService.post('/v2/earnings/withdrawal', { amount, bank_account: bankAccount, bank_name: bankName }),
}
