export { authService, notificationService, httpService } from './auth/authService'
export { dashboardService } from './dashboard/dashboardService'

// New multiservice exports
export {
  businessService,
  professionalService,
  clientService,
  serviceService,
  appointmentService,
} from './business/businessService'

// Legacy aliases from new service (backward compatibility)
export {
  businessService as barberShopService,
  professionalService as barberService,
} from './business/businessService'

// Legacy service (kept for compatibility with code still importing from old path)
export { barberShopService as oldBarberShopService, barberService as oldBarberService } from './shops/shopService'

export { loyaltyService } from './shops/loyaltyService'
export { paymentService } from './payment/paymentService'

// On-Demand & Tracking
export { onDemandService, trackingService } from './ondemand/ondemandService'

// Wallet
export { walletService } from './wallet/walletService'

// Subscriptions
export { subscriptionService } from './subscriptions/subscriptionService'

// Chat
export { chatService } from './chat/chatService'

// Marketing: Recommendations, Ads, Promotions
export { recommendationService, adService, promotionService } from './marketing/marketingService'

// MercadoPago
export { mercadoPagoService } from './payment/mercadoPagoService'

// Push Notifications
export { pushNotificationService } from './push/pushNotificationService'

// Waitlist
export { waitlistService } from './booking/waitlistService'

// Earnings
export { earningsService } from './finance/earningsService'

// Webhooks
export { webhookService } from './platform/webhookService'

// 2FA
export { twoFactorService } from './auth/twoFactorService'
