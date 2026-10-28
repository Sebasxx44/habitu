import { httpService } from '@/services/auth/authService'

export const twoFactorService = {
  setup: () => httpService.get<{ secret: string; qr_code_url: string; recovery_codes: string[] }>('/auth/2fa/setup'),
  enable: (code: string) => httpService.post('/auth/2fa/enable', { code }),
  disable: (code: string) => httpService.post('/auth/2fa/disable', { code }),
  status: () => httpService.get<{ enabled: boolean }>('/auth/2fa/status'),
  verify: (userId: number, code: string) => httpService.post('/auth/2fa/verify', { user_id: userId, code }),
}
