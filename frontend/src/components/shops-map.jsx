import { useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix default Leaflet icons for bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

// Custom green marker for shops
const shopIcon = new L.DivIcon({
  className: "",
  html: `<div style="
    width:36px;height:36px;border-radius:50%;
    background:#D4AF37;color:white;
    display:flex;align-items:center;justify-content:center;
    font-size:11px;font-weight:900;
    border:3px solid white;
    box-shadow:0 4px 12px rgba(5,150,105,0.4);
  ">✂</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
})

// Custom blue pulsing dot for user location
const userIcon = new L.DivIcon({
  className: "",
  html: `<div style="
    width:16px;height:16px;border-radius:50%;
    background:#3b82f6;
    border:3px solid white;
    box-shadow:0 0 0 6px rgba(59,130,246,0.25);
    animation:pulse 2s infinite;
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function MapRecenter({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || 13)
    }
  }, [center, zoom, map])
  return null
}

/**
 * ShopsMap – a pure UI component.
 * Props:
 *   shops  : array of { id, name, lat, lng, rating, distance }
 *   center : [lat, lng] – map center (defaults to Pereira)
 *   radius : number in km – draws a translucent circle
 *   userLoc: [lat, lng] – blue dot for user position
 */
export function ShopsMap({ shops = [], center, radius, userLoc }) {
  const mapCenter = center || userLoc || [4.8143, -75.6901]
  const validShops = shops.filter(s => s.lat && s.lng && !isNaN(s.lat) && !isNaN(s.lng))

  return (
    <div style={{ height: "100%", width: "100%", minHeight: "200px" }}>
      <style>{`
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 6px rgba(59,130,246,0.25); }
          50%      { box-shadow: 0 0 0 12px rgba(59,130,246,0.05); }
        }
        .leaflet-container { border-radius: inherit; }
      `}</style>

      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter center={mapCenter} zoom={13} />

        {/* User location dot */}
        {userLoc && userLoc[0] && userLoc[1] && (
          <Marker position={userLoc} icon={userIcon}>
            <Popup>
              <div className="text-xs font-bold text-blue-600">📍 Tu ubicación</div>
            </Popup>
          </Marker>
        )}

        {/* Radius circle */}
        {userLoc && radius && (
          <Circle
            center={userLoc}
            radius={radius * 1000}
            pathOptions={{ color: "#D4AF37", fillColor: "#D4AF37", fillOpacity: 0.06, weight: 1.5, dashArray: "6,4" }}
          />
        )}

        {/* Shop markers */}
        {validShops.map(shop => (
          <Marker key={shop.id} position={[shop.lat, shop.lng]} icon={shopIcon}>
            <Popup>
              <div style={{ minWidth: "180px", padding: "4px" }}>
                <p style={{ fontWeight: 900, fontSize: "13px", marginBottom: "4px" }}>{shop.name}</p>
                {shop.rating > 0 && (
                  <p style={{ fontSize: "11px", color: "#d97706" }}>⭐ {shop.rating}</p>
                )}
                {shop.distance !== null && (
                  <p style={{ fontSize: "11px", color: "#6b7280" }}>📍 {shop.distance} km</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}