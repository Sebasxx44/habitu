import { httpService } from '../auth/authService'

export const pushNotificationService = {
  /** Register FCM token for current user */
  registerToken: (token: string, platform: 'web' | 'android' | 'ios' = 'web') =>
    httpService.post('/push/register', { token, platform }),

  /** Unregister FCM token */
  unregisterToken: (token: string) =>
    httpService.post('/push/unregister', { token }),

  /** Request browser notification permission and get token (requires Firebase SDK setup) */
  requestPermission: async (): Promise<string | null> => {
    if (!('Notification' in window)) return null
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null
    // Token retrieval is handled by Firebase SDK in the app initialization
    return permission
  },

  /** Show local notification (fallback when FCM not available) */
  showLocal: (title: string, options?: NotificationOptions) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    new Notification(title, {
      icon: '/logo192.png',
      badge: '/logo96.png',
      ...options,
    })
  },
}
