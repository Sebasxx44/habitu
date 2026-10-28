import type { ThemeMode } from "@/design-system/tokens";

// HELPERS
export const hasExplicitTheme = (
  saved: string | null,
  choice: string | null,
): boolean =>
  saved === "light" ||
  saved === "dark" ||
  (saved === "system" && choice === "system");

export const resolveThemePreference = (
  saved: string | null,
  choice: string | null,
  fallback: ThemeMode = "light",
): ThemeMode => {
  if (saved === "light" || saved === "dark") return saved;
  if (saved === "system") return choice === "system" ? "system" : "light";
  return fallback;
};

export const resolveAccountTheme = (
  account: ThemeMode,
  saved: string | null,
  choice: string | null,
): ThemeMode =>
  hasExplicitTheme(saved, choice)
    ? resolveThemePreference(saved, choice)
    : account === "system"
      ? "light"
      : account;
