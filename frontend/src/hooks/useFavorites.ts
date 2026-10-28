import { useAccountFavorites } from '@/modules/favorites/FavoritesProvider'
import type { FavoriteType } from '@/modules/favorites/types'

// COMPATIBILITY COMPOSABLE
export const useFavorites = () => {
  const { state, actions } = useAccountFavorites()
  const normalize = (type: FavoriteType | 'barber'): FavoriteType => type === 'barber' ? 'professional' : type
  const favorites = (Object.keys(state.ids) as FavoriteType[]).flatMap(type => state.ids[type].map(id => ({ id, type })))
  const isFavorite = (id: number, type: FavoriteType | 'barber') => state.ids[normalize(type)].includes(id)
  const toggle = (item: {id: number; type: FavoriteType | 'barber'; name?: string}) => actions.toggle(normalize(item.type), item.id)
  const getFavoritesByType = (type: FavoriteType | 'barber') => favorites.filter(item => item.type === normalize(type))
  return { favorites, isFavorite, toggle, getFavoritesByType, loading: state.loading, error: state.error }
}
