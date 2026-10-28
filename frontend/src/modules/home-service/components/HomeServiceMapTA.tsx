import { useEffect, useState } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { MapPin } from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { useTheme } from "@/components/theme-provider";
import { resolveMapTiles } from "@/modules/discovery/mapConfig";
import { homeServiceDistance } from "@/modules/home-service/helpers";
import type { HomeServicePoint } from "@/modules/home-service/types";

// TYPES
interface HomeServiceMapProps {
  point: HomeServicePoint | null;
  professional?: HomeServicePoint | null;
  onSelect?: (point: HomeServicePoint) => void;
  className?: string;
}

// MAP BEHAVIOR
const MapBehavior = ({
  point,
  professional,
  onSelect,
}: HomeServiceMapProps) => {
  const map = useMap();
  useMapEvents({
    click: (event) => {
      onSelect?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  useEffect(() => {
    const observer = new ResizeObserver(() =>
      map.invalidateSize({ pan: false }),
    );
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  useEffect(() => {
    if (!point) return;
    if (professional)
      map.fitBounds(
        [
          [point.lat, point.lng],
          [professional.lat, professional.lng],
        ],
        { padding: [45, 45], maxZoom: 16, animate: false },
      );
    else map.setView([point.lat, point.lng], 16, { animate: false });
  }, [map, point?.lat, point?.lng, professional?.lat, professional?.lng]);
  return null;
};

// COMPONENT
export const HomeServiceMapTA = ({
  point,
  professional,
  onSelect,
  className = "",
}: HomeServiceMapProps) => {
  // STATE
  const [tileError, setTileError] = useState(false);
  const [retry, setRetry] = useState(0);

  // SERVICES
  const { theme } = useTheme();
  const tiles = resolveMapTiles(
    import.meta.env,
    theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches),
  );

  // RENDER
  return (
    <div className={`space-y-2 ${className}`}>
      <div
        className="discovery-map relative isolate h-80 overflow-hidden rounded-2xl border border-border sm:h-96"
        aria-label={
          onSelect
            ? "Mapa: selecciona el punto donde recibirás el servicio"
            : "Ubicación del servicio a domicilio"
        }
      >
        <MapContainer
          center={point ? [point.lat, point.lng] : [4.5, -74]}
          zoom={point ? 16 : 5}
          className="h-full w-full"
          scrollWheelZoom={false}
        >
          <MapBehavior
            point={point}
            professional={professional}
            onSelect={onSelect}
          />
          <TileLayer
            key={`${tiles.url}:${retry}`}
            url={tiles.url}
            attribution={tiles.attribution}
            maxZoom={19}
            eventHandlers={{ tileerror: () => setTileError(true) }}
          />
          {point && (
            <>
              {point.accuracy && (
                <Circle
                  center={[point.lat, point.lng]}
                  radius={Math.min(point.accuracy, 5000)}
                  pathOptions={{
                    color: "#6366f1",
                    fillOpacity: 0.06,
                    weight: 1,
                  }}
                />
              )}
              <CircleMarker
                center={[point.lat, point.lng]}
                radius={10}
                pathOptions={{
                  color: "#ffffff",
                  fillColor: "#6366f1",
                  fillOpacity: 1,
                  weight: 3,
                }}
              >
                <Tooltip permanent direction="top">
                  Punto de atención
                </Tooltip>
              </CircleMarker>
            </>
          )}
          {professional && (
            <CircleMarker
              center={[professional.lat, professional.lng]}
              radius={10}
              pathOptions={{
                color: "#ffffff",
                fillColor: "#087f70",
                fillOpacity: 1,
                weight: 3,
              }}
            >
              <Tooltip permanent direction="top">
                Profesional
              </Tooltip>
            </CircleMarker>
          )}
        </MapContainer>
        {tileError && (
          <div
            role="status"
            className="absolute inset-x-3 bottom-8 z-[500] flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-xs shadow-lg"
          >
            <span>
              El mapa no cargó. Tu ubicación y el formulario se conservan.
            </span>
            <ButtonTA
              variant="outline"
              size="sm"
              onClick={() => {
                setTileError(false);
                setRetry((current) => current + 1);
              }}
            >
              Reintentar
            </ButtonTA>
          </div>
        )}
      </div>
      {professional && point ? (
        <p className="text-xs text-muted-foreground">
          Separación en línea recta:{" "}
          {homeServiceDistance(point, professional).toFixed(1)} km. El tiempo de
          llegada depende de la ruta y el tráfico.
        </p>
      ) : (
        onSelect && (
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            {point
              ? "Revisa el punto marcado. Puedes tocar el mapa para ajustarlo."
              : "Usa tu ubicación para acercar el mapa o busca tu zona y toca el punto de atención."}
          </p>
        )
      )}
    </div>
  );
};
