// TYPES
interface NavigationPath {
  path: string;
}

// HELPERS
export const uniqueNavigationItems = <Item extends NavigationPath>(
  items: Item[],
): Item[] => {
  const paths = new Set<string>();
  return items.filter((item) => {
    if (paths.has(item.path)) return false;
    paths.add(item.path);
    return true;
  });
};

export const bottomNavigationItems = <Item extends NavigationPath>(
  items: Item[],
  limit = 4,
): Item[] =>
  uniqueNavigationItems(items).slice(0, Math.max(0, Math.min(4, limit)));
