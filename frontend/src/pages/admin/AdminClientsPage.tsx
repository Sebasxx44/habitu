import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/App'
import { ActionHeaderTA } from '@/components/TA/ActionHeaderTA'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { StateTA } from '@/components/TA/StateTA'
import { ClientDirectoryTA } from '@/modules/clients/components/ClientDirectoryTA'
import { ClientFormTA } from '@/modules/clients/components/ClientFormTA'
import { ClientProfileTA } from '@/modules/clients/components/ClientProfileTA'
import { ClientRemovalTA } from '@/modules/clients/components/ClientRemovalTA'
import { useClientProfile } from '@/modules/clients/composables/useClientProfile'

// TYPES
interface ClientViewProps { id: number; mode: 'profile' | 'edit' | 'delete'; businessId?: number | null }

// COMPONENTS
const ClientViewTA = ({ id, mode, businessId }: ClientViewProps) => {
  const profile = useClientProfile(id, businessId, mode === 'profile')
  if (profile.record.loading) return <div role="status" aria-label="Cargando perfil del cliente" className="space-y-5"><div className="h-24 animate-pulse rounded-2xl bg-muted" /><div className="h-80 animate-pulse rounded-2xl bg-muted" /></div>
  if (profile.record.error || !profile.record.client) return <div className="space-y-6"><ActionHeaderTA eyebrow="Directorio / Clientes" title="Perfil del cliente" actions={<ButtonTA variant="outline" render={<Link to="/admin/clients" />} nativeButton={false}><ArrowLeft /> Volver a clientes</ButtonTA>} /><StateTA error title="Cliente no disponible" description={profile.record.error || 'No encontramos el perfil que buscas.'} onRetry={profile.record.reload} /></div>
  if (mode === 'edit') return <ClientFormTA key={id} client={profile.record.client} businessId={businessId} />
  if (mode === 'delete') return <ClientRemovalTA client={profile.record.client} />
  return <ClientProfileTA profile={profile} />
}

export const AdminClientsPage = () => {
  const { user } = useAuth()
  const params = useParams()
  const path = (params['*'] || '').split('/').filter(Boolean)
  const businessId = user?.barber_shop_id

  if (!path.length) return <ClientDirectoryTA businessId={businessId} businessName={user?.barber_shop?.name || 'tu negocio'} />
  if (path[0] === 'new' && path.length === 1) return <ClientFormTA businessId={businessId} />
  const id = Number(path[0])
  const mode = path[1] === 'edit' ? 'edit' : path[1] === 'delete' ? 'delete' : 'profile'
  if (Number.isSafeInteger(id) && id > 0 && path.length <= 2 && (!path[1] || ['edit', 'delete'].includes(path[1]))) return <ClientViewTA key={`${id}-${mode}`} id={id} mode={mode} businessId={businessId} />
  return <div className="space-y-6"><ActionHeaderTA title="Página no encontrada" description="Esta vista de clientes no existe." /><ButtonTA variant="outline" render={<Link to="/admin/clients" />} nativeButton={false}><ArrowLeft /> Volver a clientes</ButtonTA></div>
}
