import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Circle, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { MapPin } from 'lucide-react'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { useTheme } from '@/components/theme-provider'
import { resolveMapTiles } from '@/modules/discovery/mapConfig'
import { groupMapMarkers, mapMarkerLabel, mapPoint, resolveMapShops, type MapPoint, type MapShop } from '@/modules/discovery/mapPoints'
import type { Business } from '@/types/models'

// TYPES
interface ShopsMapProps {
  shops?: Business[]
  center?: [number, number] | MapPoint
  onSelectShop?: (shop: Business) => void
  onOpenShop?: (shop: Business) => void
  selectedShopId?: number | null
  userLocation?: MapPoint | null
  radius?: number
}

// HELPERS
const markerIcon = (text: string, selected: boolean, cluster = false, accessibleLabel = text) => {
  const content = document.createElement('span')
  const visual = document.createElement('span')
  visual.textContent = text
  visual.setAttribute('aria-hidden', 'true')
  const label = document.createElement('span')
  label.className = 'sr-only'
  label.textContent = accessibleLabel
  content.append(visual, label)
  content.className = `discovery-map-marker ${selected ? 'is-selected' : ''} ${cluster ? 'is-cluster' : ''}`
  content.style.minHeight = '44px'
  content.style.minWidth = '80px'
  return L.divIcon({ html: content, className: 'discovery-marker-container', iconSize: [80, 44], iconAnchor: [40, 22], popupAnchor: [0, -22] })
}
const openMarkerOnSpace = (event: L.LeafletKeyboardEvent) => {
  if (event.originalEvent.key !== ' ') return
  event.originalEvent.preventDefault()
  ;(event.target as L.Marker).fire('click').openPopup()
}

// MAP BEHAVIOR
const MapViewport = ({ points, center, selectedId }: { points: MapShop[]; center: MapPoint; selectedId?: number | null }) => {
  const map = useMap()
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }))
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  useEffect(() => {
    const coordinates: [number, number][] = points.map((shop) => [shop.point.lat, shop.point.lng])
    if (coordinates.length) map.fitBounds(L.latLngBounds(coordinates), { padding: [48, 48], maxZoom: 15, animate: false })
    else map.setView([center.lat, center.lng], 13, { animate: false })
  }, [points, center.lat, center.lng, map])
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
  const groups = useMemo(() => groupMapMarkers(shops, (point) => map.project([point.lat, point.lng], zoom), selectedId), [shops, zoom, selectedId, map])
  return <>{groups.map(({ key, shops: group, point }) => {
    const shop = group[0]
    if (group.length > 1) {
      const bounds = L.latLngBounds(group.map((item) => [item.point.lat, item.point.lng]))
      const label = `${group.length} establecimientos; ver opciones`
      return <Marker key={key} position={[point.lat, point.lng]} keyboard title={label} alt={label} icon={markerIcon(`${group.length} lugares`, false, true, label)} eventHandlers={{ keydown: openMarkerOnSpace }}>
        <Tooltip direction="top">{label}</Tooltip>
        <Popup minWidth={230} maxWidth={280}>
          <div className="space-y-3 text-foreground">
            <strong className="block text-sm">{group.length} establecimientos en esta zona</strong>
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {group.map((item) => <li key={item.id} className="space-y-1 border-b border-border pb-2 last:border-0">
                <span className="block text-sm font-medium">{item.name}</span>
                {item.address && <span className="block text-xs text-muted-foreground">{item.address}</span>}
                <div className="flex flex-wrap gap-1">
                  {onSelect && <ButtonTA variant="ghost" className="text-xs" aria-label={`Seleccionar ${item.name}`} onClick={() => onSelect(item)}>Seleccionar</ButtonTA>}
                  {onOpen && <ButtonTA variant="outline" className="text-xs" aria-label={`Ver establecimiento ${item.name}`} onClick={() => onOpen(item)}>Ver perfil</ButtonTA>}
                </div>
              </li>)}
            </ul>
            {zoom < 19 && <ButtonTA variant="outline" className="w-full" onClick={() => map.fitBounds(bounds, { padding: [40, 40], maxZoom: Math.min(19, zoom + 3) })}>Acercar mapa</ButtonTA>}
          </div>
        </Popup>
      </Marker>
    }
    return <Marker key={`shop-${shop.id}`} position={[shop.point.lat, shop.point.lng]} keyboard zIndexOffset={selectedId === shop.id ? 1000 : 0} title={shop.name} alt={shop.name} icon={markerIcon(mapMarkerLabel(shop), selectedId === shop.id, false, `Ver establecimiento ${shop.name}`)} eventHandlers={{ click: () => onSelect?.(shop), keydown: openMarkerOnSpace, keypress: (event) => { if (event.originalEvent.key === 'Enter') onSelect?.(shop) } }}>
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
  const { located: validShops, missing } = useMemo(() => resolveMapShops(shops), [shops])
  const requestedCenter = Array.isArray(center) ? { lat: center[0], lng: center[1] } : center
  const location = mapPoint(userLocation?.lat, userLocation?.lng)
  const mapCenter = mapPoint(requestedCenter?.lat, requestedCenter?.lng) ?? location ?? { lat: 4.8133, lng: -75.6961 }

  return <div className="discovery-map relative isolate h-full min-h-64 w-full overflow-hidden rounded-2xl border border-border [&_.leaflet-control-zoom_a]:!size-11 [&_.leaflet-control-zoom_a]:!leading-[44px]" aria-label="Mapa de establecimientos">
    <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={13} zoomControl={false} className="h-full min-h-64 w-full" scrollWheelZoom={false}>
      <ZoomControl position="topleft" zoomInTitle="Acercar mapa" zoomOutTitle="Alejar mapa" />
      <MapViewport points={validShops} center={mapCenter} selectedId={selectedShopId} />
      <TileLayer key={`${tiles.url}:${retry}`} attribution={tiles.attribution} url={tiles.url} maxZoom={19} eventHandlers={{ tileerror: () => setTileError(true) }} />
      {location && <><Circle center={[location.lat, location.lng]} radius={25} pathOptions={{ color: '#087f70', weight: 3, fillOpacity: 0.8 }}><Tooltip>Tu ubicación aproximada</Tooltip></Circle>{radius && Number.isFinite(radius) && radius > 0 && <Circle center={[location.lat, location.lng]} radius={radius * 1000} pathOptions={{ color: '#087f70', weight: 1, fillOpacity: 0.035, dashArray: '5 6' }} />}</>}
      <ShopMarkers shops={validShops} selectedId={selectedShopId} onSelect={onSelectShop} onOpen={onOpenShop} />
    </MapContainer>
    {(missing.length > 0 || tileError) && <div className="absolute bottom-8 left-3 right-3 z-[500] space-y-2">
    {missing.length > 0 && <div className="rounded-xl border border-border bg-card p-3 text-xs shadow-lg">
      <p role="status">{missing.length === shops.length ? 'Estos establecimientos aún no tienen una ubicación precisa publicada.' : `${missing.length} ${missing.length === 1 ? 'establecimiento no tiene' : 'establecimientos no tienen'} ubicación precisa publicada.`} No se muestran como puntos en el mapa.</p>
      {(onOpenShop || onSelectShop) && <details className="mt-2">
        <summary className="min-h-11 cursor-pointer content-center font-medium">Ver establecimientos sin punto en el mapa ({missing.length})</summary>
        <ul className="max-h-36 space-y-2 overflow-y-auto pt-2">{missing.map((shop) => <li key={shop.id}>
          <ButtonTA variant="outline" className="w-full justify-start whitespace-normal text-left text-xs" onClick={() => onOpenShop ? onOpenShop(shop) : onSelectShop?.(shop)}>{shop.name}</ButtonTA>
        </li>)}</ul>
      </details>}
    </div>}
    {tileError && <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-xs shadow-lg"><span className="flex items-center gap-2"><MapPin className="size-4 shrink-0" />El mapa no pudo cargar. Puedes seguir usando la lista.</span><ButtonTA variant="outline" onClick={() => { setTileError(false); setRetry((value) => value + 1) }}>Reintentar</ButtonTA></div>}
    </div>}
  </div>
}
