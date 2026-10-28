// TYPES
export interface MapEnvironment {
  VITE_MAP_PROVIDER?: string;
  VITE_CARTO_BASEMAP_KEY?: string;
}

// CONFIGURATION
export const resolveMapTiles = (environment: MapEnvironment, dark = false) => {
  const key = environment.VITE_CARTO_BASEMAP_KEY?.trim();
  if (environment.VITE_MAP_PROVIDER === "carto" && key) {
    return {
      url: `https://basemaps.cartocdn.com/${dark ? "dark_all" : "light_all"}/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      provider: "carto",
    };
  }
  return {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    provider: "osm",
  };
};
