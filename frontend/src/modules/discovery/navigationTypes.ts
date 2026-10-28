// TYPES
export interface DiscoveryOrigin {
  pathname: string;
  search: string;
  hash: string;
  key: string;
}

export interface DiscoveryNavigationState {
  discoveryOrigin: DiscoveryOrigin;
}

export interface DiscoveryNavigationResult {
  navigation: { state: DiscoveryNavigationState | null };
}

export interface BusinessProfileReturn {
  navigation: {
    state: DiscoveryNavigationState | null;
    back: () => void;
  };
}
