import type {
  DiscoveryNavigationState,
  DiscoveryOrigin,
} from "@/modules/discovery/navigationTypes";

// CONFIGURATION
const discoveryPaths = new Set([
  "/cliente/explore",
  "/cliente/on-demand",
  "/cliente/services",
]);

// HELPERS
export const discoveryNavigationState = (
  origin: DiscoveryOrigin,
): DiscoveryNavigationState | null =>
  discoveryPaths.has(origin.pathname) &&
  Boolean(origin.key) &&
  origin.key.length <= 128 &&
  (!origin.search || origin.search.startsWith("?")) &&
  (!origin.hash || origin.hash.startsWith("#"))
    ? {
        discoveryOrigin: {
          pathname: origin.pathname,
          search: origin.search,
          hash: origin.hash,
          key: origin.key,
        },
      }
    : null;

export const readDiscoveryNavigationState = (
  state: object | null | undefined,
): DiscoveryNavigationState | null => {
  if (!state || typeof state !== "object" || !("discoveryOrigin" in state))
    return null;
  const origin = state.discoveryOrigin;
  if (
    !origin ||
    typeof origin !== "object" ||
    !("pathname" in origin) ||
    typeof origin.pathname !== "string" ||
    !("search" in origin) ||
    typeof origin.search !== "string" ||
    !("hash" in origin) ||
    typeof origin.hash !== "string" ||
    !("key" in origin) ||
    typeof origin.key !== "string"
  )
    return null;
  return discoveryNavigationState({
    pathname: origin.pathname,
    search: origin.search,
    hash: origin.hash,
    key: origin.key,
  });
};
