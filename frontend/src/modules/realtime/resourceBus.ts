import type { ResourceChange } from "@/modules/realtime/types";

// STATE
const listeners = new Set<(change: ResourceChange) => void>();
const seen = new Map<string, number>();

// ACTIONS
export const subscribeResourceChanges = (
  listener: (change: ResourceChange) => void,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const publishResourceChange = (change: ResourceChange): void => {
  if (!change.topics.length) return;
  if (change.revision) {
    if (seen.has(change.revision)) return;
    seen.set(change.revision, Date.now());
    if (seen.size > 500) seen.delete(seen.keys().next().value || "");
  }
  listeners.forEach((listener) => listener(change));
};
export const clearResourceHistory = (): void => {
  seen.clear();
};
export const matchesTopics = (
  observed: readonly string[],
  changed: readonly string[],
): boolean =>
  observed.includes("*") ||
  changed.includes("*") ||
  observed.some((topic) => changed.includes(topic));

export const topicsForUrl = (url: string): string[] => {
  const path = url
    .split("?")[0]
    .replace(/^\/api/, "")
    .replace(/^\/v2/, "");
  if (/^\/(auth|profile|users|roles|permissions)/.test(path))
    return ["account", "users"];
  if (/notification/.test(path)) return ["notifications"];
  if (/on-demand/.test(path)) return ["on-demand"];
  if (/tracking/.test(path)) return ["tracking"];
  if (/smart-queue/.test(path)) return ["queues", "appointments"];
  if (/waitlist/.test(path)) return ["waitlist", "appointments"];
  if (/availability|available-slots/.test(path))
    return [
      "availability",
      "appointments",
      "branches",
      "services",
      "professionals",
    ];
  if (/appointment|booking/.test(path)) return ["appointments", "availability"];
  if (/dashboard|analytics|reports|earnings|income-chart|\/stats$/.test(path))
    return [
      "reports",
      "appointments",
      "on-demand",
      "branches",
      "businesses",
      "clients",
      "wallet",
      "payments",
      "benefits",
      "services",
      "analytics",
    ];
  if (/wallet|checkout|payment|bnpl/.test(path))
    return ["wallet", "appointments", "benefits"];
  if (/chat|conversation/.test(path)) return ["chat"];
  if (/branch/.test(path))
    return ["branches", "businesses", "appointments", "services"];
  if (/favorite/.test(path)) return ["favorites"];
  if (
    /membership|subscription|benefit|loyalty|gamification|referral/.test(path)
  )
    return ["benefits", "loyalty", "gamification"];
  if (/promotion|campaign|ads/.test(path)) return ["promotions", "benefits", "pricing"];
  if (/dynamic-pricing/.test(path)) return ["pricing", "services"];
  if (/service|categor|resource/.test(path))
    return ["services", "availability"];
  if (/professional|barber(?!shop)/.test(path)) return ["professionals"];
  if (/client/.test(path)) return ["clients"];
  if (/business|barbershop|discover|search|marketplace/.test(path))
    return [
      "businesses",
      "services",
      "professionals",
      "branches",
      "reviews",
      "promotions",
      "availability",
    ];
  return ["settings"];
};
