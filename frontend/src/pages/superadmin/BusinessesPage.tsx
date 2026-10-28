import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Business } from '@/types/models'
import {
  Building2, Plus, MapPin, Phone, Mail, Eye, Store, Users, Scissors,
  Search, Filter, Map, List, Star, CheckCircle2, XCircle, TrendingUp,
  Calendar, Clock, DollarSign, BarChart3, PieChart as PieIcon, Activity,
  ExternalLink, ChevronRight, X, Briefcase, MessageSquare, Wallet,
  Zap, Award, Percent, ArrowUpRight, ArrowDownRight, Hash, MapPinned,
  UserCheck, UserX, Timer, CreditCard, Receipt, Gift, HeartPulse
} from 'lucide-react'
import { businessService } from '@/services'
import { useBusinessCategories } from '@/hooks/useBusinessCategories'
import { ShopsMap } from '@/components/ShopsMap'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/shared/StatsCard'


export const BusinessesPage = () => {
  const realtimeRevision = useRealtimeRevision(["businesses"]);
  const navigate = useNavigate()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('table')
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>(undefined)
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [filters, setFilters] = useState({ search: '', category_id: '', active: '' })
  const { categories } = useBusinessCategories()
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', slug: '', description: '', email: '', phone: '', address: '', website: '', business_category_id: '', primary_color: '#10B981', lat: '', lng: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => { fetchBusinesses() }, [])
  useEffect(() => { const t = setTimeout(fetchBusinesses, 300); return () => clearTimeout(t) }, [filters.search, filters.category_id, filters.active, realtimeRevision])

  const fetchBusinesses = async () => {
    setLoading(true)
    try {
      const res = await businessService.getAll(filters)
      setBusinesses(res.businesses)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const openDetail = (business: Business) => navigate(`/superadmin/businesses/${business.id}/analytics`)

  const handleCreate = async () => {
    if (!createForm.name || !createForm.business_category_id) return
    setCreating(true)
    try {
      await businessService.create({
        ...createForm,
        business_category_id: Number(createForm.business_category_id),
        lat: createForm.lat ? parseFloat(createForm.lat) : null,
        lng: createForm.lng ? parseFloat(createForm.lng) : null,
      })
      setShowCreate(false)
      setCreateForm({ name: '', slug: '', description: '', email: '', phone: '', address: '', website: '', business_category_id: '', primary_color: '#10B981', lat: '', lng: '' })
      fetchBusinesses()
    } catch (e) { console.error(e) }
    finally { setCreating(false) }
  }

  const activeCount = businesses.filter(b => b.is_active).length
  const verifiedCount = businesses.filter(b => b.verified).length
  const avgRating = businesses.length ? (businesses.reduce((a, b) => a + (Number(b.rating) || 0), 0) / businesses.length).toFixed(1) : '0.0'

  const mapShops = useMemo(() => businesses
    .map(b => {
      const mainBranch = b.main_branch || (Array.isArray(b.branches) ? b.branches.find(br => br.is_main_branch) : null)
      const firstBranch = Array.isArray(b.branches) ? b.branches[0] : null
      const branch = mainBranch || firstBranch
      const lat = b.lat || branch?.lat
      const lng = b.lng || branch?.lng
      return lat && lng ? { ...b, lat: String(lat), lng: String(lng), banner_url: b.banner_url || b.logo_url } : null
    })
    .filter((business): business is NonNullable<typeof business> => business !== null), [businesses])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Negocios</h1>
          <p className="text-sm text-muted-foreground mt-1">{businesses.length} negocios de todos los tipos</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-medium">
          <Plus className="w-4 h-4" /> Nuevo Negocio
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card border border-border">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 h-10 rounded-xl bg-card border-border text-sm" placeholder="Buscar negocio..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          </div>
        </div>
        <select className="h-10 rounded-xl bg-card border border-border text-foreground text-sm px-3" value={filters.category_id} onChange={e => setFilters(f => ({ ...f, category_id: e.target.value }))}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="h-10 rounded-xl bg-card border border-border text-foreground text-sm px-3" value={filters.active} onChange={e => setFilters(f => ({ ...f, active: e.target.value }))}>
          <option value="">Todos los estados</option>
          <option value="1">Activos</option>
          <option value="0">Inactivos</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Total" value={businesses.length} subtitle="Negocios" icon={Store} />
        <StatsCard title="Activos" value={activeCount} subtitle="En operación" icon={CheckCircle2} />
        <StatsCard title="Marcas heredadas" value={verifiedCount} subtitle="Sin comprobación documental" icon={Award} />
        <StatsCard title="Rating" value={avgRating} subtitle="Promedio global" icon={Star} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-10 p-1 rounded-xl bg-card border border-border">
          <TabsTrigger value="table" className="h-8 rounded-lg gap-2"><List className="w-4 h-4" />Tabla</TabsTrigger>
          <TabsTrigger value="map" className="h-8 rounded-lg gap-2"><Map className="w-4 h-4" />Mapa</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-6">
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs font-semibold uppercase">Negocio</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold uppercase">Categoría</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold uppercase hidden md:table-cell">Dirección</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold uppercase">Rating</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold uppercase">Estado</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold uppercase text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {businesses.map(biz => (
                  <TableRow key={biz.id} className="border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openDetail(biz)}>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: biz.primary_color || '#10B981' }}>
                          {biz.name?.charAt(0)?.toUpperCase() || 'N'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{biz.name}</p>
                          {biz.verified && <Badge variant="outline" className="text-[10px] h-4 px-1 mt-0.5 border-blue-500 text-blue-500">Marca heredada</Badge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="secondary" className="text-xs" style={{ backgroundColor: (biz.category?.color || '#666') + '20', color: biz.category?.color || '#666' }}>
                        {biz.category?.name || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 hidden md:table-cell">
                      <p className="text-sm text-muted-foreground">{biz.address || '—'}</p>
                      <p className="text-xs text-muted-foreground">{biz.phone}</p>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500 dark:text-amber-300" />
                        <span className="text-sm font-medium">{biz.rating ?? '—'}</span>
                        <span className="text-xs text-muted-foreground">({biz.reviews_count ?? 0})</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant={biz.is_active ? 'default' : 'secondary'} className="text-xs">{biz.is_active ? 'Activo' : 'Inactivo'}</Badge>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); openDetail(biz) }}>
                        <Eye className="w-4 h-4 text-primary" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {businesses.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-16 text-center">
                    <Store className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No hay negocios</p>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="map" className="mt-6">
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="h-[600px]">
              <ShopsMap shops={mapShops} center={mapCenter} onSelectShop={s => openDetail(s)} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* CREATE MODAL */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border rounded-2xl">
          <DialogHeader><DialogTitle className="text-lg">Nuevo Negocio</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre *</label>
              <Input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoría *</label>
              <select className="w-full h-10 rounded-xl bg-card border border-border text-sm px-3" value={createForm.business_category_id} onChange={e => setCreateForm(f => ({ ...f, business_category_id: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Slug (opcional)</label>
              <Input value={createForm.slug} onChange={e => setCreateForm(f => ({ ...f, slug: e.target.value }))} placeholder="mi-negocio" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripción</label>
              <Input value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
              <Input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Teléfono</label>
              <Input value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Dirección</label>
              <Input value={createForm.address} onChange={e => setCreateForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Website</label>
              <Input value={createForm.website} onChange={e => setCreateForm(f => ({ ...f, website: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Color primario</label>
              <div className="flex items-center gap-2">
                <input type="color" value={createForm.primary_color} onChange={e => setCreateForm(f => ({ ...f, primary_color: e.target.value }))} className="w-10 h-10 rounded-lg" />
                <span className="text-xs text-muted-foreground">{createForm.primary_color}</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Latitud</label>
              <Input value={createForm.lat} onChange={e => setCreateForm(f => ({ ...f, lat: e.target.value }))} placeholder="4.8143" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Longitud</label>
              <Input value={createForm.lng} onChange={e => setCreateForm(f => ({ ...f, lng: e.target.value }))} placeholder="-75.6901" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !createForm.name || !createForm.business_category_id} className="bg-primary hover:bg-primary/90">
              {creating ? 'Creando...' : 'Crear Negocio'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  )
}
