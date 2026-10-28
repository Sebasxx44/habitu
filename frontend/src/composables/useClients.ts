import { useEffect, useMemo, useState } from 'react'
import { clientsService } from '@/modules/clients/services/clientsService'
import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh'
import { clientToday } from '@/modules/clients/utils'
import type { ClientRecord, ClientSegment, ClientSort, ClientsState } from '@/modules/clients/types'

// COMPOSABLE
export const useClients = (businessId?: number | null): ClientsState => {
  // STATE
  const realtimeRevision = useRealtimeRevision(['clients'])
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState<ClientSegment>('all')
  const [sort, setSort] = useState<ClientSort>('recent')
  const [page, setPage] = useState(1)

  // EFFECTS
  useEffect(() => {
    const controller = new AbortController()
    if (!businessId) {
      setClients([])
      setError('No se encontró un negocio asociado a tu cuenta.')
      setLoading(false)
      return () => controller.abort()
    }
    setLoading(true)
    setError(null)
    clientsService.list(businessId, controller.signal)
      .then((records) => { if (!controller.signal.aborted) setClients(records) })
      .catch(() => { if (!controller.signal.aborted) setError('No pudimos cargar el directorio. Inténtalo de nuevo.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [businessId, revision, realtimeRevision])

  // COMPUTED
  const month = clientToday().slice(0, 7)
  const metrics = useMemo(() => ({
    total: clients.length,
    newThisMonth: clients.filter((client) => client.created_at?.slice(0, 7) === month).length,
    complete: clients.filter((client) => client.email?.trim() && client.phone?.trim()).length,
    vip: clients.filter((client) => client.is_vip).length,
  }), [clients, month])
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')
    const phoneQuery = query.replace(/\D/g, '')
    return clients.filter((client) => {
      const matchesSearch = `${client.name} ${client.email || ''} ${client.phone || ''}`.toLocaleLowerCase('es').includes(query)
        || (phoneQuery.length > 0 && (client.phone || '').replace(/\D/g, '').includes(phoneQuery))
      const matchesSegment = segment === 'all' || (segment === 'new' && client.created_at?.slice(0, 7) === month)
        || (segment === 'incomplete' && (!client.email?.trim() || !client.phone?.trim()))
        || (segment === 'vip' && client.is_vip)
      return matchesSearch && matchesSegment
    }).sort((left, right) => sort === 'name' ? left.name.localeCompare(right.name, 'es') : (sort === 'recent' ? -1 : 1) * left.created_at.localeCompare(right.created_at))
  }, [clients, search, segment, sort, month])
  const pages = Math.max(1, Math.ceil(filtered.length / 12))
  const currentPage = Math.min(page, pages)

  // ACTIONS
  const clear = () => { setSearch(''); setSegment('all'); setPage(1) }
  const exportCsv = () => {
    const cell = (value: string | number | null | undefined): string => {
      const text = String(value ?? '')
      const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
      return `"${safe.replace(/"/g, '""')}"`
    }
    const rows = [['Nombre', 'Correo', 'Teléfono', 'Fecha de registro', 'VIP'], ...filtered.map((client) => [client.name, client.email, client.phone, client.created_at.slice(0, 10), client.is_vip ? 'Sí' : 'No'])]
    const blob = new Blob(['\uFEFF', rows.map((row) => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `clientes-${clientToday()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // RETURN
  return {
    directory: { clients, filtered, visible: filtered.slice((currentPage - 1) * 12, currentPage * 12), loading, error, refresh: () => setRevision((value) => value + 1) },
    filters: { search, segment, sort, page: currentPage, pages, setSearch: (value) => { setSearch(value); setPage(1) }, setSegment: (value) => { setSegment(value); setPage(1) }, setSort: (value) => { setSort(value); setPage(1) }, setPage, clear },
    metrics,
    actions: { exportCsv },
  }
}
