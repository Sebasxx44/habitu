import { useState, useCallback } from 'react'
import { barberService } from '@/services'
import type { Barber } from '@/types/models'

export function useBarbers() {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBarbers = useCallback(async (shopId?: number) => {
    setLoading(true)
    setError(null)
    try {
      const data = await barberService.getAll(shopId)
      setBarbers(data)
    } catch (e: any) {
      setError(e.message || 'Error al cargar barberos')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async (shopId: number) => {
    try {
      const data = await barberService.getStats(shopId)
      setStats(data)
    } catch (e: any) {
      console.error('Error stats barber:', e)
    }
  }, [])

  const createBarber = async (data: Partial<Barber>) => {
    const newBarber = await barberService.create(data)
    setBarbers(prev => [newBarber, ...prev])
    return newBarber
  }

  const updateBarber = async (id: number, data: Partial<Barber>) => {
    const updated = await barberService.update(id, data)
    setBarbers(prev => prev.map(b => b.id === id ? updated : b))
    return updated
  }

  const deleteBarber = async (id: number) => {
    await barberService.delete(id)
    setBarbers(prev => prev.filter(b => b.id !== id))
  }

  return {
    barbers,
    stats,
    loading,
    error,
    fetchBarbers,
    fetchStats,
    createBarber,
    updateBarber,
    deleteBarber
  }
}
