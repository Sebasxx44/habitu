import { useAccountFavorites } from '@/modules/favorites/FavoritesProvider'
import type { DiscoverySearchState } from '@/modules/discovery/searchTypes'
import { useLocation } from 'react-router-dom'
import { useRequireAccount } from '@/modules/auth/composables/useRequireAccount'

// COMPOSABLE
export const useDiscoveryFavorites = (): DiscoverySearchState['favorites'] => {
  const { state, actions } = useAccountFavorites()
  const location = useLocation()
  const { actions: account } = useRequireAccount()
  const toggle = async (id: number): Promise<void> => {
    if (!account.requireAccount(`${location.pathname}${location.search}#discovery-business-${id}`)) return
    await actions.toggle('business', id)
  }
  return { ids: state.ids.business, busy: state.pending?.startsWith('business:') ? Number(state.pending.split(':')[1]) : null, error: state.error, toggle }
}
