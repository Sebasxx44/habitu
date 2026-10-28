// TYPES
export type DiscoveryView = "list" | "map";

// QUERY STATE
export const readDiscoveryView = (params: URLSearchParams): DiscoveryView =>
  params.get("view") === "map" ? "map" : "list";

export const withDiscoveryView = (
  params: URLSearchParams,
  view: DiscoveryView,
): URLSearchParams => {
  const next = new URLSearchParams(params);
  if (view === "map") next.set("view", "map");
  else next.delete("view");
  return next;
};
