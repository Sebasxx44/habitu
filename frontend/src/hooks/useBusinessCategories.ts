import { useState, useEffect, useCallback } from 'react'
import { httpService } from '@/services/auth/authService'
import type { BookingApiResponse } from '@/composables/booking/types'
import type { BusinessCategory } from '@/types/models'
export type { BusinessCategory } from '@/types/models'

// COMPOSABLE
export const useBusinessCategories = () => {
  const [categories, setCategories] = useState<BusinessCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    httpService.get<BookingApiResponse<BusinessCategory[]>>('/v2/businesses/categories', { signal: controller.signal })
      .then((response) => { if (!controller.signal.aborted) setCategories(response.data) })
      .catch(() => { if (!controller.signal.aborted) setError('No pudimos cargar las categorías.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])
  const getCategoryBySlug = useCallback((slug: string) => categories.find((category) => category.slug === slug), [categories])
  const getCategoryById = useCallback((id: number) => categories.find((category) => category.id === id), [categories])
  return { categories, loading, error, getCategoryBySlug, getCategoryById }
}
