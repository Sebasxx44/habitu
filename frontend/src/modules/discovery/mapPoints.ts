import type { Branch, Business } from "@/types/models";

// TYPES
type CoordinateValue = number | string | null | undefined;
export interface MapPoint {
  lat: number;
  lng: number;
}
interface CoordinateSource {
  lat?: CoordinateValue;
  lng?: CoordinateValue;
  latitude?: CoordinateValue;
  longitude?: CoordinateValue;
}
export interface MapShop extends Business {
  point: MapPoint;
  price_from?: number | null;
  currency?: string;
}
export interface MapMarkerGroup {
  key: string;
  shops: MapShop[];
  point: MapPoint;
}
interface MapPixel {
  x: number;
  y: number;
}

// COORDINATES
const coordinateNumber = (value: CoordinateValue): number | null => {
  if (value == null || (typeof value === "string" && !value.trim()))
    return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const mapPoint = (
  lat: CoordinateValue,
  lng: CoordinateValue,
): MapPoint | null => {
  const latitude = coordinateNumber(lat);
  const longitude = coordinateNumber(lng);
  if (
    latitude === null ||
    longitude === null ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return null;
  return { lat: latitude, lng: longitude };
};

const sourcePoint = (source: CoordinateSource): MapPoint | null =>
  mapPoint(source.lat, source.lng) ??
  mapPoint(source.latitude, source.longitude);

const businessBranches = (shop: Business): Branch[] =>
  [
    shop.main_branch,
    shop.mainBranch,
    ...(shop.branches ?? []).filter((branch) => branch.is_main_branch),
    ...(shop.branches ?? []),
  ].filter(
    (branch): branch is Branch =>
      Boolean(branch) && branch?.is_active !== false,
  );

export const resolveMapShop = (shop: Business): MapShop | null => {
  const ownPoint = sourcePoint(shop);
  if (ownPoint) return { ...shop, point: ownPoint };
  for (const branch of businessBranches(shop)) {
    const point = sourcePoint(branch);
    if (point)
      return { ...shop, address: branch.address || shop.address, point };
  }
  return null;
};

export const resolveMapShops = (
  shops: Business[],
): { located: MapShop[]; missing: Business[] } => {
  const located: MapShop[] = [];
  const missing: Business[] = [];
  for (const shop of shops) {
    const resolved = resolveMapShop(shop);
    if (resolved) located.push(resolved);
    else missing.push(shop);
  }
  return { located, missing };
};

// MARKERS
export const mapMarkerLabel = (shop: MapShop): string => {
  if (shop.booking_mode === "external") return "Ver lugar";
  const prices =
    shop.services
      ?.map((service) => service.price)
      .filter((price) => Number.isFinite(price) && price >= 0) ?? [];
  const price = shop.price_from ?? (prices.length ? Math.min(...prices) : null);
  if (price === null || !Number.isFinite(price) || price < 0)
    return "Ver lugar";
  const currency =
    shop.currency && /^[A-Z]{3}$/.test(shop.currency) ? shop.currency : "COP";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(price);
};

export const groupMapMarkers = (
  shops: MapShop[],
  project: (point: MapPoint) => MapPixel,
  selectedId?: number | null,
): MapMarkerGroup[] => {
  const buckets = new Map<string, MapShop[]>();
  for (const shop of shops) {
    const pixel = project(shop.point);
    const key =
      shop.id === selectedId
        ? `shop-${shop.id}`
        : `${Math.floor(pixel.x / 96)}:${Math.floor(pixel.y / 64)}`;
    buckets.set(key, [...(buckets.get(key) ?? []), shop]);
  }
  return [...buckets].map(([key, group]) => ({
    key,
    shops: group,
    point: {
      lat: group.reduce((sum, shop) => sum + shop.point.lat, 0) / group.length,
      lng: group.reduce((sum, shop) => sum + shop.point.lng, 0) / group.length,
    },
  }));
};
