// HELPERS
export const nextSuggestionIndex = (
  current: number,
  count: number,
  direction: "ArrowDown" | "ArrowUp",
): number => {
  if (count < 1) return -1;
  const active = current >= 0 && current < count ? current : -1;
  if (direction === "ArrowUp")
    return active < 0 ? count - 1 : Math.max(0, active - 1);
  return Math.min(active + 1, count - 1);
};
