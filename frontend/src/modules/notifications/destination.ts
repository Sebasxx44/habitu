import type { UserRole } from "@/types/auth";

// ROUTING
const rolePrefix: Record<UserRole, string> = {
  CLIENTE: "/cliente/",
  PROFESSIONAL: "/professional/",
  ADMIN_BARBERIA: "/admin/",
  SUPERADMIN: "/superadmin/",
};
export const notificationDestination = (
  value: string | undefined,
  role: UserRole | undefined,
): string | null => {
  if (
    !value ||
    !role ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    [...value].some((character) => character.charCodeAt(0) < 32)
  )
    return null;
  try {
    const parsed = new URL(value, "https://habitu.invalid");
    if (role === "PROFESSIONAL" && parsed.pathname.startsWith("/barbero/"))
      parsed.pathname = parsed.pathname.replace("/barbero/", "/professional/");
    if (
      parsed.origin !== "https://habitu.invalid" ||
      !parsed.pathname.startsWith(rolePrefix[role])
    )
      return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
};
