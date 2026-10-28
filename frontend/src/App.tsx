import { AdminBenefitsPage } from '@/modules/benefits/AdminBenefitsPage'
import { BenefitsPage } from '@/modules/benefits/BenefitsPage'
import { ErrorBoundaryTA } from '@/components/TA/ErrorBoundaryTA'
import { SkeletonTA } from '@/components/TA/SkeletonTA'
import { LoadingTA } from '@/components/TA/LoadingTA'
import { MotionConfig } from 'framer-motion'
import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import type { User } from '@/types/auth'
import { navigationByRole } from '@/components/TA/navigation'
import { authenticatedDestination, guestHome, loginPath, roleHome } from '@/modules/auth/services/routeAccess'
export { useAuth, useNotifications } from '@/contexts/AuthContext'
import { AppLayout } from '@/components/layout/AppLayout'
const PayoutSandboxPage = lazy(() => import('@/modules/payouts/PayoutSandboxPage').then(module => ({ default: module.PayoutSandboxPage })))
const ProviderReviewsPage = lazy(() => import('@/modules/provider-reviews/ProviderReviewsPage').then(module => ({ default: module.ProviderReviewsPage })))
const DistributionPage = lazy(() => import('@/modules/distribution/DistributionPage').then(module => ({ default: module.DistributionPage })))
const GrowthPage = lazy(() => import('@/modules/automation/GrowthPage').then(module => ({ default: module.GrowthPage })))
const RoutinesPage = lazy(() => import('@/modules/routines/RoutinesPage').then(module => ({ default: module.RoutinesPage })))
const CommercePage = lazy(() => import('@/modules/commerce/CommercePage').then(module => ({ default: module.CommercePage })))
const ConnectionsPage = lazy(() => import('@/modules/connections/ConnectionsPage').then(module => ({ default: module.ConnectionsPage })))
const AccountAccessPage = lazy(() => import('@/modules/auth/components/AccountAccessPage').then(module => ({ default: module.AccountAccessPage })))
const OperationsPage = lazy(() => import('@/modules/operations/OperationsPage').then(module => ({ default: module.OperationsPage })))
const CheckoutReturnPage = lazy(() => import('@/modules/checkout/CheckoutReturnPage').then(module => ({ default: module.CheckoutReturnPage })))
const GroupsPage = lazy(() => import('@/modules/groups/GroupsPage').then(module => ({ default: module.GroupsPage })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then(module => ({ default: module.LoginPage })))
const PrivacyPage = lazy(() => import('@/modules/legal/PublicPolicyPage').then(module => ({ default: module.PrivacyPage })))
const TermsPage = lazy(() => import('@/modules/legal/PublicPolicyPage').then(module => ({ default: module.TermsPage })))
const SuperAdminDashboard = lazy(() => import('@/pages/superadmin/SuperAdminDashboard').then(module => ({ default: module.SuperAdminDashboard })))
const BusinessesPage = lazy(() => import('@/pages/superadmin/BusinessesPage').then(module => ({ default: module.BusinessesPage })))
const RolesPermissionsPage = lazy(() => import('@/pages/superadmin/RolesPermissionsPage').then(module => ({ default: module.RolesPermissionsPage })))
const UsersPage = lazy(() => import('@/pages/superadmin/UsersPage').then(module => ({ default: module.UsersPage })))
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then(module => ({ default: module.AdminDashboardPage })))
const AdminBarbersPage = lazy(() => import('@/pages/admin/AdminBarbersPage').then(module => ({ default: module.AdminBarbersPage })))
const AdminClientsPage = lazy(() => import('@/pages/admin/AdminClientsPage').then(module => ({ default: module.AdminClientsPage })))
const AdminServicesPage = lazy(() => import('@/pages/admin/AdminServicesPage').then(module => ({ default: module.AdminServicesPage })))
const AdminAppointmentsPage = lazy(() => import('@/pages/admin/AdminAppointmentsPage').then(module => ({ default: module.AdminAppointmentsPage })))
const AdminBarberiaPage = lazy(() => import('@/pages/admin/AdminBarberiaPage').then(module => ({ default: module.AdminBarberiaPage })))
const AdminReportsPage = lazy(() => import('@/pages/admin/AdminReportsPage').then(module => ({ default: module.AdminReportsPage })))
const AdminBIDashboardPage = lazy(() => import('@/pages/admin/AdminBIDashboardPage').then(module => ({ default: module.AdminBIDashboardPage })))
const AdminLoyaltyPage = lazy(() => import('@/pages/admin/AdminLoyaltyPage').then(module => ({ default: module.AdminLoyaltyPage })))
const AdminBenefitEditorPage = lazy(() => import('@/modules/benefits/AdminBenefitEditorPage').then(module => ({ default: module.AdminBenefitEditorPage })))
const AdminLoyaltyCardPage = lazy(() => import('@/modules/benefits/AdminLoyaltyCardPage').then(module => ({ default: module.AdminLoyaltyCardPage })))
const CampaignsPage = lazy(() => import('@/pages/admin/AdminCampaignsPage').then(module => ({ default: module.CampaignsPage })))
const CampaignEditorPage = lazy(() => import('@/modules/campaigns/CampaignEditorPage').then(module => ({ default: module.CampaignEditorPage })))
const CampaignDetailPage = lazy(() => import('@/modules/campaigns/CampaignDetailPage').then(module => ({ default: module.CampaignDetailPage })))
const ProfessionalDashboardPage = lazy(() => import('@/pages/barbero/BarberoDashboardPage').then(module => ({ default: module.BarberoDashboardPage })))
const ProfessionalAppointmentsPage = lazy(() => import('@/pages/barbero/BarberoAppointmentsPage').then(module => ({ default: module.BarberoAppointmentsPage })))
const ClienteDashboardPage = lazy(() => import('@/pages/cliente/ClienteDashboardPage').then(module => ({ default: module.ClienteDashboardPage })))
const ClienteAnalyticsPage = lazy(() => import('@/pages/cliente/ClienteAnalyticsPage').then(module => ({ default: module.ClienteAnalyticsPage })))
const ClienteBookingPage = lazy(() => import('@/pages/cliente/ClienteBookingPage').then(module => ({ default: module.ClienteBookingPage })))
const ClienteLoyaltyPage = lazy(() => import('@/pages/cliente/ClienteLoyaltyPage').then(module => ({ default: module.ClienteLoyaltyPage })))
const ClienteAppointmentsPage = lazy(() => import('@/pages/cliente/ClienteAppointmentsPage').then(module => ({ default: module.ClienteAppointmentsPage })))
const AppointmentDetailPage = lazy(() => import('@/pages/cliente/AppointmentDetailPage').then(module => ({ default: module.AppointmentDetailPage })))
const ClienteProfilePage = lazy(() => import('@/pages/cliente/ClienteProfilePage').then(module => ({ default: module.ClienteProfilePage })))
const BusinessAnalyticsPage = lazy(() => import('@/modules/analytics/AnalyticsPage').then(module => ({ default: module.BusinessAnalyticsPage })))
const HomeServiceRequestPage = lazy(() => import('@/pages/cliente/OnDemandRequestPage').then(module => ({ default: module.HomeServiceRequestPage })))
const ClienteNotificationsPage = lazy(() => import('@/pages/cliente/ClienteNotificationsPage').then(module => ({ default: module.ClienteNotificationsPage })))
const ExploreBusinessesPage = lazy(() => import('@/pages/cliente/ExploreShopsPage').then(module => ({ default: module.ExploreShopsPage })))
const ClienteFavoritesPage = lazy(() => import('@/pages/cliente/ClienteFavoritesPage').then(module => ({ default: module.ClienteFavoritesPage })))
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage').then(module => ({ default: module.OnboardingPage })))
const PublicBusinessPage = lazy(() => import('@/pages/public/PublicBarberShopPage').then(module => ({ default: module.PublicBarberShopPage })))
const BusinessOnboardingPage = lazy(() => import('@/pages/admin/BusinessOnboardingPage').then(module => ({ default: module.BusinessOnboardingPage })))
const CalendarViewPage = lazy(() => import('@/pages/admin/CalendarViewPage').then(module => ({ default: module.CalendarViewPage })))
const AdminBranchesPage = lazy(() => import('@/pages/admin/AdminBranchesPage').then(module => ({ default: module.AdminBranchesPage })))
const BusinessDetailPage = lazy(() => import('@/pages/cliente/BusinessDetailPage').then(module => ({ default: module.BusinessDetailPage })))
const OnDemandRequestPage = lazy(() => import('@/pages/cliente/OnDemandRequestPage').then(module => ({ default: module.OnDemandRequestPage })))
const WalletPage = lazy(() => import('@/pages/cliente/WalletPage').then(module => ({ default: module.WalletPage })))
const SubscriptionsPage = lazy(() => import('@/pages/cliente/SubscriptionsPage').then(module => ({ default: module.SubscriptionsPage })))
const AdminAdsPage = lazy(() => import('@/pages/admin/AdminAdsPage').then(module => ({ default: module.AdminAdsPage })))
const AdminPromotionsPage = lazy(() => import('@/pages/admin/AdminPromotionsPage').then(module => ({ default: module.AdminPromotionsPage })))
const AdminOnDemandMonitorPage = lazy(() => import('@/pages/admin/AdminOnDemandMonitorPage').then(module => ({ default: module.AdminOnDemandMonitorPage })))
const ProfessionalOnDemandPage = lazy(() => import('@/pages/professional/ProfessionalOnDemandPage').then(module => ({ default: module.ProfessionalOnDemandPage })))
const SuperAdminAnalyticsPage = lazy(() => import('@/pages/superadmin/SuperAdminAnalyticsPage').then(module => ({ default: module.SuperAdminAnalyticsPage })))
const ProfessionalEarningsPage = lazy(() => import('@/pages/professional/ProfessionalEarningsPage').then(module => ({ default: module.ProfessionalEarningsPage })))
const TwoFactorSetupPage = lazy(() => import('@/pages/professional/TwoFactorSetupPage').then(module => ({ default: module.TwoFactorSetupPage })))
const AdminWebhooksPage = lazy(() => import('@/pages/admin/AdminWebhooksPage').then(module => ({ default: module.AdminWebhooksPage })))
const AdminDynamicPricingPage = lazy(() => import('@/pages/admin/AdminDynamicPricingPage').then(module => ({ default: module.AdminDynamicPricingPage })))
const AIChatPage = lazy(() => import('@/pages/cliente/AIChatPage').then(module => ({ default: module.AIChatPage })))
const ClientReferralsPage = lazy(() => import('@/pages/cliente/ClientReferralsPage').then(module => ({ default: module.ClientReferralsPage })))
const ClientMembershipsPage = lazy(() => import('@/pages/cliente/ClientMembershipsPage').then(module => ({ default: module.ClientMembershipsPage })))
const GamificationPage = lazy(() => import('@/pages/cliente/GamificationPage').then(module => ({ default: module.GamificationPage })))
const BNPLPage = lazy(() => import('@/pages/cliente/BNPLPage').then(module => ({ default: module.BNPLPage })))
const SmartQueuePage = lazy(() => import('@/pages/cliente/SmartQueuePage').then(module => ({ default: module.SmartQueuePage })))
const ARPreviewPage = lazy(() => import('@/pages/cliente/ARPreviewPage').then(module => ({ default: module.ARPreviewPage })))
const VoiceBookingPage = lazy(() => import('@/pages/cliente/VoiceBookingPage').then(module => ({ default: module.VoiceBookingPage })))
import { ToastProvider } from '@/components/ui/Toast'

const ProtectedRoute = ({ children, roles }: { children: ReactNode; roles?: User['role'][] }) => {
  const { user, permissions, loading } = useAuth()
  const location = useLocation()
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingTA label="Verificando sesión…" />
    </div>
  )
  if (!user) return <Navigate to={loginPath(location.pathname + location.search + location.hash)} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  const permission = navigationByRole[user.role].find(item => item.path === location.pathname || location.pathname.startsWith(`${item.path}/`))?.permission
  if (user.role !== 'SUPERADMIN' && permission && !permissions.includes(permission)) return <Navigate to="/" replace />
  return children
}

const PageWrapper = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  return <AppLayout user={user}><Suspense fallback={<SkeletonTA variant="dashboard" label="Cargando tu espacio…" />}>{children}</Suspense></AppLayout>
}

const AccountEntry = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoading />
  if (user) return <Navigate to={authenticatedDestination(user.role, new URLSearchParams(location.search).get('returnTo'))} replace />
  return children
}

const ClientHome = () => {
  const { user, loading } = useAuth()
  if (loading) return <PageLoading />
  if (!user) return <Navigate to={guestHome} replace />
  return <ProtectedRoute roles={['CLIENTE']}><PageWrapper><ClienteDashboardPage /></PageWrapper></ProtectedRoute>
}

import { RealtimeProvider } from '@/modules/realtime/RealtimeProvider'
import { ThemeProvider } from '@/components/theme-provider'

const HomeRedirect = () => {
  const { user, loading } = useAuth()
  if (loading) return <PageLoading />
  return <Navigate to={user ? roleHome(user.role) : guestHome} replace />
}

const PageLoading = () => <div className="app-canvas min-h-screen p-4 sm:p-8"><div className="mx-auto max-w-7xl space-y-6"><LoadingTA compact label="Cargando tu espacio…" /><SkeletonTA variant="dashboard" /></div></div>

const App = () => {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.24, ease: 'easeOut' }}>
    <ThemeProvider defaultTheme="light" storageKey="elegantbarb-theme">
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
          <RealtimeProvider />

          <ErrorBoundaryTA>
          <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/account/profile" element={<ProtectedRoute><PageWrapper><ClienteProfilePage /></PageWrapper></ProtectedRoute>} />
            <Route path="/register" element={<AccountEntry><AccountAccessPage mode="register" /></AccountEntry>} />
            <Route path="/forgot-password" element={<AccountAccessPage mode="forgot" />} />
            <Route path="/reset-password" element={<AccountAccessPage mode="reset" />} />
            <Route path="/admin/operations" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><OperationsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/professional/availability" element={<ProtectedRoute roles={['PROFESSIONAL']}><PageWrapper><OperationsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/login" element={<AccountEntry><LoginPage /></AccountEntry>} />
            <Route path="/superadmin/dashboard" element={<ProtectedRoute roles={['SUPERADMIN']}><PageWrapper><SuperAdminDashboard /></PageWrapper></ProtectedRoute>} />
            <Route path="/superadmin/businesses" element={<ProtectedRoute roles={['SUPERADMIN']}><PageWrapper><BusinessesPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/superadmin/businesses/:id/analytics" element={<ProtectedRoute roles={['SUPERADMIN']}><PageWrapper><BusinessAnalyticsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/businesses/:id/analytics" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><BusinessAnalyticsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/superadmin/barbershops" element={<Navigate to="/superadmin/businesses" />} />
            <Route path="/superadmin/roles" element={<ProtectedRoute roles={['SUPERADMIN']}><PageWrapper><RolesPermissionsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/superadmin/users" element={<ProtectedRoute roles={['SUPERADMIN']}><PageWrapper><UsersPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/superadmin/analytics" element={<ProtectedRoute roles={['SUPERADMIN']}><PageWrapper><SuperAdminAnalyticsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminDashboardPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/professionals/*" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminBarbersPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/barbers" element={<Navigate to="/admin/professionals" />} />
            <Route path="/admin/clients/*" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminClientsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/services/*" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminServicesPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/appointments" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminAppointmentsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/branches" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminBranchesPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/business" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminBarberiaPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/settings" element={<Navigate to="/admin/business" />} />
            <Route path="/admin/reports" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminReportsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/bi-dashboard" element={<ProtectedRoute roles={['ADMIN_BARBERIA', 'SUPERADMIN']}><PageWrapper><AdminBIDashboardPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/loyalty" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminLoyaltyPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/campaigns" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><CampaignsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/campaigns/new" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><CampaignEditorPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/campaigns/:id/edit" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><CampaignEditorPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/campaigns/:id" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><CampaignDetailPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/ads" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminAdsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/promotions" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminPromotionsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/on-demand" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminOnDemandMonitorPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/superadmin/payouts" element={<ProtectedRoute roles={['SUPERADMIN']}><PageWrapper><PayoutSandboxPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/superadmin/ads" element={<ProtectedRoute roles={['SUPERADMIN']}><PageWrapper><AdminAdsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/distribution" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><DistributionPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/growth" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><GrowthPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/ai-chat" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AIChatPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/professional/ai-chat" element={<ProtectedRoute roles={['PROFESSIONAL']}><PageWrapper><AIChatPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/webhooks" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminWebhooksPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/dynamic-pricing" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminDynamicPricingPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/smart-queue" element={<ProtectedRoute roles={['ADMIN_BARBERIA', 'PROFESSIONAL']}><PageWrapper><SmartQueuePage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/memberships" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminBenefitsPage initialKind="plans" /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/promotions/new" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminBenefitEditorPage key="promotions-new" kind="promotions" /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/promotions/:id/edit" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminBenefitEditorPage key="promotions-:id/edit" kind="promotions" /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/memberships/new" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminBenefitEditorPage key="plans-new" kind="plans" /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/memberships/:id/edit" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminBenefitEditorPage key="plans-:id/edit" kind="plans" /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/loyalty/new" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminBenefitEditorPage key="programs-new" kind="programs" /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/loyalty/:id/edit" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminBenefitEditorPage key="programs-:id/edit" kind="programs" /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/loyalty/cards/:id" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><AdminLoyaltyCardPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/professional/dashboard" element={<ProtectedRoute roles={['PROFESSIONAL']}><PageWrapper><ProfessionalDashboardPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/professional/appointments" element={<ProtectedRoute roles={['PROFESSIONAL']}><PageWrapper><ProfessionalAppointmentsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/professional/on-demand" element={<ProtectedRoute roles={['PROFESSIONAL']}><PageWrapper><ProfessionalOnDemandPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/professional/earnings" element={<ProtectedRoute roles={['PROFESSIONAL']}><PageWrapper><ProfessionalEarningsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/professional/security" element={<ProtectedRoute roles={['PROFESSIONAL']}><PageWrapper><TwoFactorSetupPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/barbero/dashboard" element={<Navigate to="/professional/dashboard" />} />
            <Route path="/barbero/appointments" element={<Navigate to="/professional/appointments" />} />
            <Route path="/cliente/dashboard" element={<ClientHome />} />
            <Route path="/cliente/analytics" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><ClienteAnalyticsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/explore" element={<PageWrapper><ExploreBusinessesPage /></PageWrapper>} />
            <Route path="/cliente/explorar" element={<Navigate to="/cliente/explore" />} />
            <Route path="/cliente/booking" element={<PageWrapper><ClienteBookingPage /></PageWrapper>} />
            <Route path="/cliente/benefits" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><BenefitsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/loyalty" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><ClienteLoyaltyPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/appointments" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><ClienteAppointmentsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/appointments/:id" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><AppointmentDetailPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/profile" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><ClienteProfilePage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/business/:id" element={<PageWrapper><BusinessDetailPage /></PageWrapper>} />
            <Route path="/cliente/shop/:id" element={<PageWrapper><BusinessDetailPage /></PageWrapper>} />
            <Route path="/cliente/notifications" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><ClienteNotificationsPage /></PageWrapper></ProtectedRoute>} />
            {/* New Premium Routes */}
            <Route path="/cliente/services" element={<PageWrapper><ClienteBookingPage /></PageWrapper>} />
            <Route path="/cliente/messages" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><AIChatPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/checkout/:orderId" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><CheckoutReturnPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/routines" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><RoutinesPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/experiencias" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><CommercePage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/experiencias" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><CommercePage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/connections" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><ConnectionsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/connections" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><ConnectionsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/professional/connections" element={<ProtectedRoute roles={['PROFESSIONAL']}><PageWrapper><ConnectionsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/superadmin/connections" element={<ProtectedRoute roles={['SUPERADMIN']}><PageWrapper><ConnectionsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/account/reviews" element={<ProtectedRoute roles={['ADMIN_BARBERIA', 'PROFESSIONAL', 'SUPERADMIN']}><PageWrapper><ProviderReviewsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/provider-reviews" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><ProviderReviewsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/professional/provider-reviews" element={<ProtectedRoute roles={['PROFESSIONAL']}><PageWrapper><ProviderReviewsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/superadmin/provider-reviews" element={<ProtectedRoute roles={['SUPERADMIN']}><PageWrapper><ProviderReviewsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/account/connections" element={<ProtectedRoute><PageWrapper><ConnectionsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/groups" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><GroupsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/referrals" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><ClientReferralsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/rewards" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><ClienteLoyaltyPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/history" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><ClienteAppointmentsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/favorites" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><ClienteFavoritesPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/on-demand" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><OnDemandRequestPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/home-service" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><HomeServiceRequestPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/wallet" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><WalletPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/subscriptions" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><SubscriptionsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/ai-chat" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><AIChatPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/memberships" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><ClientMembershipsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/gamification" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><GamificationPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/bnpl" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><BNPLPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/smart-queue" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><SmartQueuePage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/ar-preview" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><ARPreviewPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/cliente/voice-booking" element={<ProtectedRoute roles={['CLIENTE']}><PageWrapper><VoiceBookingPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute roles={['CLIENTE']}><OnboardingPage /></ProtectedRoute>} />
            <Route path="/admin/calendar/*" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><PageWrapper><CalendarViewPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin/onboarding" element={<ProtectedRoute roles={['ADMIN_BARBERIA']}><BusinessOnboardingPage /></ProtectedRoute>} />
            <Route path="/b/:slug" element={<PublicBusinessPage />} />
            <Route path="/" element={<HomeRedirect />} />
            <Route path="*" element={<div className="mx-auto max-w-lg p-8 text-center"><h1 className="text-2xl font-semibold">Página no encontrada</h1><a className="mt-4 inline-block text-primary underline" href="/">Volver al inicio</a></div>} />
          </Routes>
          </Suspense>
          </ErrorBoundaryTA>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </ThemeProvider>
  </MotionConfig>
  )
}

export default App
