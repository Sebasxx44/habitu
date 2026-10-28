import { conciergeName } from '@/modules/assistant/config'
import i18n from '@/i18n'
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Compass,
  CreditCard,
  Gift,
  Heart,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Settings,
  ShieldCheck,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
  Zap,
  Bell,
  Crown,
  type LucideIcon,
} from "lucide-react";
import type { User } from "@/types/auth";

// TYPES
export interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
  group: "workspace" | "growth" | "settings";
  permission?: string;
}

const navigationKeys: Record<string, string> = {"Ensayos de liquidación": "payoutSandbox", "Enlaces y widget": "distribution", "Comprobaciones": "providerReviews", "Operación de hoy": "operations", "Mi disponibilidad": "availability", "En grupo": "groups", "Mis rutinas": "routines", "Experiencias y regalos": "experiences", "Crecimiento": "growth", "Conexiones": "connections", "Anuncios y moderación": "ads", "Resumen": "overview", "Negocios": "businesses", "Analítica": "analytics", "Usuarios": "users", "Roles y permisos": "roles", "Citas": "appointments", "Calendario": "calendar", "Profesionales": "professionals", "Clientes": "clients", "Servicios": "services", "Fila digital": "queue", "Fidelidad": "loyalty", "Membresías": "memberships", "Campañas": "campaigns", "Promociones": "promotions", "Precios dinámicos": "pricing", "Reportes": "reports", "Sucursales": "branches", "Configuración": "settings", "Mis citas": "myAppointments", "Mis ganancias": "earnings", "Servicios inmediatos": "onDemand", "Seguridad": "security", "Inicio": "home", "Explorar": "explore", "Favoritos": "favorites", "Recompensas": "rewards", "Mi billetera": "wallet", "Referidos": "referrals", "Asistente": "assistant", "Notificaciones": "notifications", "Mi perfil": "profile"};

// CONFIGURATION
export const navigationByRole: Record<User["role"], NavigationItem[]> = {
  SUPERADMIN: [
    {
      label: "Resumen",
      path: "/superadmin/dashboard",
      icon: LayoutDashboard,
      group: "workspace",
    },
    {
      label: "Negocios",
      path: "/superadmin/businesses",
      icon: Building2,
      group: "workspace",
      permission: "barbershops.view",
    },
    {
      label: "Analítica",
      path: "/superadmin/analytics",
      icon: TrendingUp,
      group: "growth",
      permission: "reports.view",
    },
    {
      label: "Usuarios",
      path: "/superadmin/users",
      icon: Users,
      group: "settings",
      permission: "users.view",
    },
    {
      label: "Roles y permisos",
      path: "/superadmin/roles",
      icon: ShieldCheck,
      group: "settings",
      permission: "roles.view",
    },
  ],
  ADMIN_BARBERIA: [
    {
      label: "Resumen",
      path: "/admin/dashboard",
      icon: LayoutDashboard,
      group: "workspace",
    },
    { label: "Operación de hoy", path: "/admin/operations", icon: CalendarCheck, group: "workspace", permission: "barbers.view" },
    { label: "Experiencias y regalos", path: "/admin/experiencias", icon: Gift, group: "growth" },
    { label: "Crecimiento", path: "/admin/growth", icon: TrendingUp, group: "growth" },
    { label: "Asistente", path: "/admin/ai-chat", icon: MessageSquare, group: "workspace" },
    {
      label: "Citas",
      path: "/admin/appointments",
      icon: CalendarCheck,
      group: "workspace",
      permission: "appointments.view",
    },
    {
      label: "Calendario",
      path: "/admin/calendar",
      icon: CalendarDays,
      group: "workspace",
      permission: "appointments.view",
    },
    {
      label: "Profesionales",
      path: "/admin/professionals",
      icon: Users,
      group: "workspace",
      permission: "barbers.view",
    },
    {
      label: "Clientes",
      path: "/admin/clients",
      icon: Users,
      group: "workspace",
      permission: "clients.view",
    },
    {
      label: "Servicios",
      path: "/admin/services",
      icon: ClipboardList,
      group: "workspace",
      permission: "services.view",
    },
    {
      label: "Fila digital",
      path: "/admin/smart-queue",
      icon: Ticket,
      group: "workspace",
    },
    { label: "Fidelidad", path: "/admin/loyalty", icon: Gift, group: "growth" },
    {
      label: "Membresías",
      path: "/admin/memberships",
      icon: Crown,
      group: "growth",
    },
    {
      label: "Campañas",
      path: "/admin/campaigns",
      icon: Mail,
      group: "growth",
    },
    {
      label: "Promociones",
      path: "/admin/promotions",
      icon: CreditCard,
      group: "growth",
    },
    {
      label: "Precios dinámicos",
      path: "/admin/dynamic-pricing",
      icon: TrendingUp,
      group: "growth",
    },
    {
      label: "Reportes",
      path: "/admin/reports",
      icon: TrendingUp,
      group: "growth",
      permission: "reports.view",
    },
    {
      label: "Analítica",
      path: "/admin/bi-dashboard",
      icon: TrendingUp,
      group: "growth",
      permission: "reports.view",
    },
    {
      label: "Sucursales",
      path: "/admin/branches",
      icon: Building2,
      group: "settings",
    },
    {
      label: "Configuración",
      path: "/admin/business",
      icon: Settings,
      group: "settings",
      permission: "settings.manage",
    },
  ],
  PROFESSIONAL: [
    {
      label: "Resumen",
      path: "/professional/dashboard",
      icon: LayoutDashboard,
      group: "workspace",
    },
    { label: "Mi disponibilidad", path: "/professional/availability", icon: CalendarDays, group: "workspace" },
    { label: "Asistente", path: "/professional/ai-chat", icon: MessageSquare, group: "workspace" },
    {
      label: "Mis citas",
      path: "/professional/appointments",
      icon: CalendarCheck,
      group: "workspace",
      permission: "appointments.view",
    },
    {
      label: "Fila digital",
      path: "/admin/smart-queue",
      icon: Ticket,
      group: "workspace",
    },
    {
      label: "Mis ganancias",
      path: "/professional/earnings",
      icon: Wallet,
      group: "growth",
    },
    {
      label: "Servicios inmediatos",
      path: "/professional/on-demand",
      icon: Zap,
      group: "workspace",
    },
    {
      label: "Seguridad",
      path: "/professional/security",
      icon: ShieldCheck,
      group: "settings",
    },
  ],
  CLIENTE: [
    {
      label: "Inicio",
      path: "/cliente/dashboard",
      icon: LayoutDashboard,
      group: "workspace",
    },
    { label: "En grupo", path: "/cliente/groups", icon: Users, group: "workspace" },
    { label: "Mis rutinas", path: "/cliente/routines", icon: CalendarDays, group: "workspace" },
    { label: "Experiencias y regalos", path: "/cliente/experiencias", icon: Gift, group: "growth" },
    {
      label: "Explorar",
      path: "/cliente/explore",
      icon: Compass,
      group: "workspace",
    },
    { label: 'Beneficios', path: '/cliente/benefits', icon: Gift, group: 'growth' },
    {
      label: "Mis citas",
      path: "/cliente/appointments",
      icon: CalendarDays,
      group: "workspace",
      permission: "appointments.view",
    },
    {
      label: "Favoritos",
      path: "/cliente/favorites",
      icon: Heart,
      group: "workspace",
    },
    {
      label: "Servicios inmediatos",
      path: "/cliente/on-demand",
      icon: Zap,
      group: "workspace",
    },
    {
      label: "Recompensas",
      path: "/cliente/loyalty",
      icon: Gift,
      group: "growth",
    },
    {
      label: "Mi billetera",
      path: "/cliente/wallet",
      icon: Wallet,
      group: "growth",
    },
    {
      label: "Membresías",
      path: "/cliente/memberships",
      icon: Crown,
      group: "growth",
    },
    {
      label: "Referidos",
      path: "/cliente/referrals",
      icon: Users,
      group: "growth",
    },
    {
      label: "Asistente",
      path: "/cliente/messages",
      icon: MessageSquare,
      group: "settings",
    },
    {
      label: "Notificaciones",
      path: "/cliente/notifications",
      icon: Bell,
      group: "settings",
    },
    {
      label: "Mi perfil",
      path: "/cliente/profile",
      icon: Settings,
      group: "settings",
    },
  ],
};

Object.entries(navigationByRole).forEach(([role, items]) => items.push({ label: "Conexiones", path: `/${role === "CLIENTE" ? "cliente" : role === "ADMIN_BARBERIA" ? "admin" : role === "PROFESSIONAL" ? "professional" : "superadmin"}/connections`, icon: Settings, group: "settings" }));
navigationByRole.ADMIN_BARBERIA.push({ label: "Enlaces y widget", path: "/admin/distribution", icon: Compass, group: "growth" });
navigationByRole.ADMIN_BARBERIA.push({ label: "Comprobaciones", path: "/admin/provider-reviews", icon: ShieldCheck, group: "settings" });
navigationByRole.PROFESSIONAL.push({ label: "Comprobaciones", path: "/professional/provider-reviews", icon: ShieldCheck, group: "settings" });
navigationByRole.SUPERADMIN.push({ label: "Comprobaciones", path: "/superadmin/provider-reviews", icon: ShieldCheck, group: "settings" });
navigationByRole.ADMIN_BARBERIA.push({ label: "Anuncios y moderación", path: "/admin/ads", icon: Ticket, group: "growth" });
navigationByRole.SUPERADMIN.push({ label: "Ensayos de liquidación", path: "/superadmin/payouts", icon: Wallet, group: "settings" });
navigationByRole.SUPERADMIN.push({ label: "Anuncios y moderación", path: "/superadmin/ads", icon: Ticket, group: "growth" });

export const visibleNavigation = (
  role: User["role"],
  permissions: string[],
): NavigationItem[] =>
  navigationByRole[role].filter(
    (item) =>
      role === "SUPERADMIN" ||
      !item.permission ||
      permissions.includes(item.permission),
  ).map(item => ({ ...item, label: (item.path === '/cliente/messages' || item.path.endsWith('/ai-chat')) ? conciergeName : i18n.t(`navigation.${item.path === '/cliente/appointments' ? 'myBookings' : item.path === '/cliente/on-demand' ? 'forNow' : item.label === 'Beneficios' ? 'benefits' : navigationKeys[item.label] ?? item.label}`) }));

export const primaryClientNavigation = (permissions: string[]): NavigationItem[] => {
  const paths = ['/cliente/explore', '/cliente/on-demand', '/cliente/appointments', '/cliente/favorites']
  const items = visibleNavigation('CLIENTE', permissions)
  return paths.flatMap(path => items.filter(item => item.path === path))
}

export const guestNavigation = (): NavigationItem[] => {
  const items = visibleNavigation('CLIENTE', ['appointments.view'])
  const paths = ['/cliente/explore', '/cliente/appointments', '/cliente/favorites']
  return [
    ...items.filter(item => item.path === '/cliente/explore'),
    { label: i18n.t('navigation.services'), path: '/cliente/services', icon: ClipboardList, group: 'workspace' },
    ...items.filter(item => paths.includes(item.path) && item.path !== '/cliente/explore'),
  ]
}

export const accountPaths: Record<User["role"], string> = {
  CLIENTE: "/cliente/profile",
  ADMIN_BARBERIA: "/admin/business",
  PROFESSIONAL: "/professional/security",
  SUPERADMIN: "/superadmin/users",
};

export const roleLabels: Record<User["role"], string> = {
  SUPERADMIN: "Administración de plataforma",
  ADMIN_BARBERIA: "Administración de negocio",
  PROFESSIONAL: "Espacio profesional",
  CLIENTE: "Tu espacio personal",
};
