/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONCIERGE_NAME?: string
  readonly VITE_MAP_PROVIDER?: 'osm' | 'carto';
  readonly VITE_CARTO_BASEMAP_KEY?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_PUSHER_APP_KEY?: string;
  readonly VITE_PUSHER_APP_CLUSTER?: string;
  readonly VITE_PUSHER_HOST?: string;
  readonly VITE_PUSHER_PORT?: string;
  readonly VITE_PUSHER_SCHEME?: string;
}
