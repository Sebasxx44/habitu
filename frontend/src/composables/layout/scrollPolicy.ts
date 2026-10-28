// TYPES
export interface LayoutRoute {
  key: string;
  pathname: string;
  search: string;
  hash: string;
}
export interface LayoutScrollPosition {
  left: number;
  top: number;
}
export type LayoutScrollPlan =
  | { kind: "preserve" }
  | { kind: "top" }
  | { kind: "position"; position: LayoutScrollPosition }
  | { kind: "anchor"; id: string };

// HELPERS
export const rememberScrollPosition = (
  positions: Map<string, LayoutScrollPosition>,
  key: string,
  position: LayoutScrollPosition,
): void => {
  positions.delete(key);
  positions.set(key, position);
  if (positions.size > 100) {
    const oldest = positions.keys().next().value;
    if (oldest !== undefined) positions.delete(oldest);
  }
};

export const routeScrollPlan = (
  previous: LayoutRoute | null,
  next: LayoutRoute,
  navigation: "POP" | "PUSH" | "REPLACE",
  saved?: LayoutScrollPosition,
): LayoutScrollPlan => {
  if (navigation === "POP" && saved)
    return { kind: "position", position: saved };
  if (next.hash.length > 1) {
    try {
      return { kind: "anchor", id: decodeURIComponent(next.hash.slice(1)) };
    } catch {
      return { kind: "anchor", id: next.hash.slice(1) };
    }
  }
  if (!previous || navigation === "POP" || previous.pathname === next.pathname)
    return { kind: "preserve" };
  return { kind: "top" };
};
