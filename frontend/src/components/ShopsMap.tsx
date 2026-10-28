import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { MapPin } from 'lucide-react'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { useTheme } from '@/components/theme-provider'
import { resolveMapTiles } from '@/modules/discovery/mapConfig'
import type { Business } from '@/types/models'

// TYPES
interface Point { lat: number; lng: number }
interface MapShop extends Business { point: Point; price_from?: number | null }
interface ShopsMapProps {
  shops?: Business[]
  center?: [number, number] | Point
  onSelectShop?: (shop: Business) => void
  onOpenShop?: (shop: Business) => void
  selectedShopId?: number | null
  userLocation?: Point | null
  radius?: number
}

// HELPERS
const validPoint = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
const markerIcon = (text: string, selected: boolean, cluster = false) => {
  const content = document.createElement('span')
  content.textContent = text
  content.className = `discovery-map-marker ${selected ? 'is-selected' : ''} ${cluster ? 'is-cluster' : ''}`
  return L.divIcon({ html: content, className: 'discovery-marker-container', iconSize: [76, 38], iconAnchor: [38, 19], popupAnchor: [0, -20] })
}

// MAP BEHAVIOR
const MapViewport = ({ points, center, selectedId }: { points: MapShop[]; center: Point; selectedId?: number | null }) => {
  const map = useMap()
  const boundsKey = points.map((shop) => `${shop.id}:${shop.point.lat}:${shop.point.lng}`).join('|')
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }))
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  useEffect(() => {
    const coordinates = boundsKey.split('|').filter(Boolean).map((entry) => entry.split(':').slice(1).map(Number) as [number, number])
    if (coordinates.length) map.fitBounds(L.latLngBounds(coordinates), { padding: [48, 48], maxZoom: 15, animate: false })
    else map.setView([center.lat, center.lng], 13, { animate: false })
  }, [boundsKey, center.lat, center.lng, map])
  useEffect(() => {
    const point = points.find((shop) => shop.id === selectedId)?.point
    if (point && !map.getBounds().contains([point.lat, point.lng])) map.panTo([point.lat, point.lng], { animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches })
  }, [selectedId, points, map])
  return null
}

const ShopMarkers = ({ shops, selectedId, onSelect, onOpen }: { shops: MapShop[]; selectedId?: number | null; onSelect?: (shop: Business) => void; onOpen?: (shop: Business) => void }) => {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) })
  const groups = useMemo(() => {
    const buckets = new Map<string, MapShop[]>()
    shops.forEach((shop) => {
      const point = map.project([shop.point.lat, shop.point.lng], zoom)
      const key = shop.id === selectedId || zoom >= 17 ? `shop-${shop.id}` : `${Math.floor(point.x / 72)}:${Math.floor(point.y / 56)}`
      buckets.set(key, [...(buckets.get(key) ?? []), shop])
    })
    return [...buckets.entries()]
  }, [shops, zoom, selectedId, map])
  return <>{groups.map(([key, group]) => {
    const shop = group[0]
    if (group.length > 1) {
      const bounds = L.latLngBounds(group.map((item) => [item.point.lat, item.point.lng]))
      return <Marker key={key} position={bounds.getCenter()} icon={markerIcon(`${group.length} lugares`, false, true)} title={`${group.length} establecimientos; acercar mapa`} eventHandlers={{ click: () => map.fitBounds(bounds, { padding: [40, 40], maxZoom: Math.min(18, zoom + 3) }) }} />
    }
    const prices = shop.services?.map((service) => Number(service.price)).filter(Number.isFinite) ?? []
    const price = shop.price_from ?? (prices.length ? Math.min(...prices) : null)
    const label = price === null ? 'Ver lugar' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0, notation: 'compact' }).format(price)
    return <Marker key={key} position={[shop.point.lat, shop.point.lng]} title={shop.name} alt={shop.name} icon={markerIcon(label, selectedId === shop.id)} eventHandlers={{ click: () => onSelect?.(shop) }}>
      <Tooltip direction="top">{shop.name}</Tooltip>
      <Popup minWidth={230} maxWidth={280}>
        <div className="space-y-3 text-foreground"><strong className="block text-sm">{shop.name}</strong><span className="block text-xs text-muted-foreground">{shop.address || shop.main_branch?.address || 'Consulta la ubicación del establecimiento'}</span>{(shop.reviews_count ?? 0) > 0 && <span className="block text-xs">★ {Number(shop.rating).toFixed(1)} · {shop.reviews_count} reseñas</span>}{onOpen && <ButtonTA className="w-full" onClick={() => onOpen(shop)}>Ver establecimiento</ButtonTA>}</div>
      </Popup>
    </Marker>
  })}</>
}

// COMPONENT
export const ShopsMap = ({ shops = [], center, onSelectShop, onOpenShop, selectedShopId, userLocation, radius }: ShopsMapProps) => {
  const { theme } = useTheme()
  const [tileError, setTileError] = useState(false)
  const [retry, setRetry] = useState(0)
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const tiles = resolveMapTiles(import.meta.env, dark)
  const validShops = useMemo<MapShop[]>(() => shops.flatMap((shop) => {
    const branch = shop.main_branch ?? shop.mainBranch ?? shop.branches?.find((entry) => entry.is_main_branch) ?? shop.branches?.[0]
    const rawLat = shop.lat ?? shop.latitude ?? branch?.lat
    const rawLng = shop.lng ?? shop.longitude ?? branch?.lng
    if (rawLat == null || rawLng == null || !validPoint(Number(rawLat), Number(rawLng))) return []
    return [{ ...shop, address: shop.address ?? branch?.address, point: { lat: Number(rawLat), lng: Number(rawLng) } }]
  }), [shops])
  const requestedCenter = Array.isArray(center) ? { lat: center[0], lng: center[1] } : center
  const mapCenter = requestedCenter && validPoint(requestedCenter.lat, requestedCenter.lng) ? requestedCenter : userLocation ?? { lat: 4.8133, lng: -75.6961 }
  const locationValid = userLocation && validPoint(userLocation.lat, userLocation.lng)

  return <div className="discovery-map relative isolate h-full min-h-64 w-full overflow-hidden rounded-2xl border border-border" aria-label="Mapa de establecimientos">
    <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={13} className="h-full min-h-64 w-full" scrollWheelZoom={false}>
      <MapViewport points={validShops} center={mapCenter} selectedId={selectedShopId} />
      <TileLayer key={`${tiles.url}:${retry}`} attribution={tiles.attribution} url={tiles.url} maxZoom={19} eventHandlers={{ tileerror: () => setTileError(true) }} />
      {locationValid && <><Circle center={[userLocation.lat, userLocation.lng]} radius={25} pathOptions={{ color: '#087f70', weight: 3, fillOpacity: 0.8 }}><Tooltip>Tu ubicación aproximada</Tooltip></Circle>{radius && <Circle center={[userLocation.lat, userLocation.lng]} radius={radius * 1000} pathOptions={{ color: '#087f70', weight: 1, fillOpacity: 0.035, dashArray: '5 6' }} />}</>}
      <ShopMarkers shops={validShops} selectedId={selectedShopId} onSelect={onSelectShop} onOpen={onOpenShop} />
    </MapContainer>
    {tileError && <div role="status" className="absolute bottom-8 left-3 right-3 z-[500] flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-xs shadow-lg"><span className="flex items-center gap-2"><MapPin className="size-4 shrink-0" />El mapa no pudo cargar. Puedes seguir usando la lista.</span><ButtonTA variant="outline" onClick={() => { setTileError(false); setRetry((value) => value + 1) }}>Reintentar</ButtonTA></div>}
  </div>
}
