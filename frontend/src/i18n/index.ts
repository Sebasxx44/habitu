import { payoutsEs, payoutsEn } from '@/modules/payouts/locales'
import { distributionEs, distributionEn } from '@/modules/distribution/locales'
import { adsEs, adsEn } from '@/modules/ads/locales'
import { automationEs, automationEn } from '@/modules/automation/locales'
import { healthEs, healthEn } from '@/modules/analytics/health/locales'
import { commerceEs, commerceEn } from '@/modules/commerce/locales'
import { operationsEs, operationsEn } from '@/modules/operations/locales'
import { checkoutEs, checkoutEn } from '@/modules/checkout/locales'
import { growthEs, growthEn } from '@/modules/growth/locales'
import { notificationsUiEs, notificationsUiEn } from '@/modules/notifications/locales'
import { authUiEs, authUiEn } from '@/modules/auth/locales'
import { pricingEs, pricingEn } from '@/modules/pricing/locales'
import { profileEs, profileEn } from '@/modules/profile/locales'
import { benefitsEs, benefitsEn } from '@/modules/benefits/locales'
import { alertEs, alertEn } from '@/modules/marketplace/alerts/locales'
import { walletEs, walletEn } from '@/modules/wallet/locales'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import es from '@/i18n/locales/es.json'
import en from '@/i18n/locales/en.json'
import { analyticsEs, analyticsEn } from '@/modules/analytics/locales'
import { marketplaceEs, marketplaceEn } from '@/modules/marketplace/locales'
import { discoveryUiEs, discoveryUiEn } from '@/modules/discovery/locales'

// Preserve the preference saved by the previous i18next entry point.
if (typeof window !== 'undefined') {
  try {
    const previous = localStorage.getItem('i18nextLng')?.split('-')[0]
    if (!localStorage.getItem('habitu-language') && (previous === 'es' || previous === 'en')) localStorage.setItem('habitu-language', previous)
  } catch { /* Language detection still works when browser storage is unavailable. */ }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { payouts: payoutsEs, distribution: distributionEs, ads: adsEs, automation: automationEs, health: healthEs, commerce: commerceEs, operations: operationsEs, checkout: checkoutEs, growth: growthEs, translation: es, authUi: authUiEs, benefits: benefitsEs, pricing: pricingEs, profile: profileEs, marketplace: marketplaceEs, analytics: analyticsEs, alerts: alertEs, discoveryUi: discoveryUiEs, wallet: walletEs, notificationsUi: notificationsUiEs },
      en: { payouts: payoutsEn, distribution: distributionEn, ads: adsEn, automation: automationEn, health: healthEn, commerce: commerceEn, operations: operationsEn, checkout: checkoutEn, growth: growthEn, translation: en, authUi: authUiEn, benefits: benefitsEn, pricing: pricingEn, profile: profileEn, marketplace: marketplaceEn, analytics: analyticsEn, alerts: alertEn, discoveryUi: discoveryUiEn, wallet: walletEn, notificationsUi: notificationsUiEn },
    },
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    load: 'languageOnly',
    returnEmptyString: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'habitu-language',
    },
  })

const updateDocumentLanguage = (language: string) => {
  if (typeof document !== 'undefined') document.documentElement.lang = language.startsWith('en') ? 'en' : 'es'
}
updateDocumentLanguage(i18n.resolvedLanguage ?? i18n.language ?? 'es')
i18n.on('languageChanged', updateDocumentLanguage)

export default i18n
