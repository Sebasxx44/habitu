import { useAccountFavorites } from '@/modules/favorites/FavoritesProvider'
import type { DiscoverySearchState } from '@/modules/discovery/searchTypes'

// COMPOSABLE
export const useDiscoveryFavorites = (): DiscoverySearchState['favorites'] => {
  const { state, actions } = useAccountFavorites()
  return { ids: state.ids.business, busy: state.pending?.startsWith('business:') ? Number(state.pending.split(':')[1]) : null, error: state.error, toggle: id => actions.toggle('business', id) }
}
