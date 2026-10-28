import type { User } from "@/types/auth";
import { safeReturnPath } from "@/modules/auth/services/returnPath";

// CONFIGURATION
export const guestHome = "/cliente/explore";

const roleHomes: Record<User["role"], string> = {
  CLIENTE: "/cliente/dashboard",
  SUPERADMIN: "/superadmin/dashboard",
  ADMIN_BARBERIA: "/admin/dashboard",
  PROFESSIONAL: "/professional/dashboard",
};

// HELPERS
export const roleHome = (role: User["role"]): string => roleHomes[role];

export const loginPath = (returnTo: string): string => {
  const path = safeReturnPath(returnTo) ?? guestHome;
  return `/login?${new URLSearchParams({ returnTo: path })}`;
};

export const browseDestination = (returnTo: string | null): string => {
  const destination = safeReturnPath(returnTo);
  if (!destination) return guestHome;
  const pathname = destination.split(/[?#]/)[0];
  return /^\/cliente\/(?:explore|services|booking)\/?$/.test(pathname) ||
    /^\/cliente\/(?:business|shop)\/\d+\/?$/.test(pathname) ||
    /^\/b\/[^/]+\/?$/.test(pathname)
    ? destination
    : guestHome;
};

export const authenticatedDestination = (
  role: User["role"],
  returnTo: string | null,
): string => {
  const destination = safeReturnPath(returnTo);
  if (!destination) return roleHome(role);
  const pathname = new URL(destination, "https://habitu.invalid").pathname;
  const workspace = {
    CLIENTE: "/cliente/",
    SUPERADMIN: "/superadmin/",
    ADMIN_BARBERIA: "/admin/",
    PROFESSIONAL: "/professional/",
  }[role];
  if (pathname.startsWith(workspace) || pathname.startsWith("/account/"))
    return destination;
  return roleHome(role);
};
