import { InteractiveChartTA } from "@/components/TA/InteractiveChartTA";
import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import type { User as AppUser, UserRole, UserDetails, UsersDirectory } from '@/types/auth'
import { httpService } from '@/services/auth/authService'
import { useEffect, useState, type ChangeEvent } from 'react'
import { Plus, Edit, Trash2, Search, User, Mail, Building2, Shield, Save, Filter, Scissors, Phone, MapPin, Activity, Calendar, Star, DollarSign, Receipt, Briefcase, ChevronDown, Users } from 'lucide-react'
import { StatusBadge, SearchInput, LoadingState, ActionMenu, UserPageSkeleton, PremiumSelect } from '@/components/premium'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { authService, clientService, professionalService, businessService } from '@/services'
import { cn } from '@/lib/utils'

export const UsersPage = () => {
  const realtimeRevision = useRealtimeRevision(["users","account"]);
  const [data, setData] = useState<UsersDirectory>({ users: [], roles: [], barberShops: [] })
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [form, setForm] = useState<{ name: string; email: string; password: string; role: UserRole; barber_shop_id: string; roles: number[] }>({ name: '', email: '', password: '', role: 'CLIENTE', barber_shop_id: '', roles: [] })
  const [saving, setSaving] = useState(false)
  const [filters, setFilters] = useState({ search: '', role: '' })
  
  const [visibleCount, setVisibleCount] = useState(15)
  const [detailUser, setDetailUser] = useState<AppUser | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState<UserDetails | null>(null)


  const fetchData = async () => {
    setLoading(true)
    try {
      const r = await authService.users(filters)
      setData(r)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { 
    setVisibleCount(15)
    fetchData() 
  }, [filters, realtimeRevision])

  const openDetail = async (user: AppUser) => {
    setDetailUser(user)
    setDetailData(null)
    setDetailLoading(true)
    try {
      if (user.role === 'CLIENTE' && user.cliente_id) {
        const res = await httpService.get<{ data: UserDetails }>(`/v2/clients/${user.cliente_id}`)
        setDetailData(res.data)
      } else if (user.role === 'PROFESSIONAL' && user.barber_id) {
        const res = await httpService.get<{ data: UserDetails }>(`/v2/professionals/${user.barber_id}`)
        setDetailData(res.data)
      } else if (user.role === 'ADMIN_BARBERIA' && user.barber_shop_id) {
        const res = await httpService.get<{ data: UserDetails }>(`/v2/businesses/${user.barber_shop_id}`)
        setDetailData(res.data)
      } else {
        setDetailData({})
      }
    } catch (e) {
      console.error(e)
    } finally {
      setDetailLoading(false)
    }
  }

  const openCreate = () => { setForm({ name: '', email: '', password: '', role: 'CLIENTE', barber_shop_id: '', roles: [] }); setEditing(null); setShowCreate(true) }
  const openEdit = (user: AppUser) => {
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      barber_shop_id: user.barber_shop_id ? String(user.barber_shop_id) : '',
      roles: user.roles?.map(r => r.id) || []
    })
    setEditing(user)
    setShowCreate(true)
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      if (editing) {
        const updateData = { ...form, barber_shop_id: form.barber_shop_id ? Number(form.barber_shop_id) : null, password: form.password || undefined }
        await authService.updateUser(editing.id, updateData)
      } else {
        await authService.createUser({ ...form, barber_shop_id: form.barber_shop_id ? Number(form.barber_shop_id) : null })
      }
      setShowCreate(false)
      fetchData()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const handleDelete = async (user: AppUser) => {
    if (!confirm(`Eliminar usuario "${user.name}"?`)) return
    try { await authService.deleteUser(user.id); fetchData() }
    catch (e) { alert('No se puede eliminar este usuario') }
  }

  if (loading) return <UserPageSkeleton />

  const roleColors: Record<UserRole, string> = {
    SUPERADMIN: 'text-amber-400',
    ADMIN_BARBERIA: 'text-cyan-400',
    PROFESSIONAL: 'text-amber-400',
    CLIENTE: 'text-violet-400',
  }

  const roleLabels: Record<UserRole, string> = {
    SUPERADMIN: 'Superadmin',
    ADMIN_BARBERIA: 'Admin Barbería',
    PROFESSIONAL: 'Profesional',
    CLIENTE: 'Cliente',
  }

  // Derived data
  const filteredUsers = data.users.filter((u) => {
    if (filters.search && !u.name.toLowerCase().includes(filters.search.toLowerCase()) && !u.email.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.role && u.role !== filters.role) return false;
    return true;
  })
  const visibleUsers = filteredUsers.slice(0, visibleCount)

  // KPIs
  const totalUsers = data.users.length
  const totalClients = data.users.filter((u) => u.role === 'CLIENTE').length
  const totalBarbers = data.users.filter((u) => u.role === 'PROFESSIONAL').length
  const totalAdmins = data.users.filter((u) => u.role === 'ADMIN_BARBERIA').length

  const roleDistribution = [
    { name: 'Clientes', value: totalClients, color: '#8b5cf6' },
    { name: 'Barberos', value: totalBarbers, color: 'var(--habitu-gold)' },
    { name: 'Admins', value: totalAdmins, color: '#06b6d4' },
    { name: 'Superadmin', value: totalUsers - totalClients - totalBarbers - totalAdmins, color: 'var(--habitu-primary)' }
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Premium Header & KPIs */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-foreground tracking-tight">Gestión de Usuarios</h1>
              <p className="text-sm text-muted-foreground mt-1">Administra el acceso y roles de la plataforma</p>
            </div>
            <Button onClick={openCreate} className="h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-medium shadow-sm">
              <Plus className="w-4 h-4" />
              Nuevo Usuario
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-black leading-tight">{totalUsers}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Total Usuarios</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-black leading-tight">{totalClients}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Clientes</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-habitu-gold/10 flex items-center justify-center shrink-0">
                <Scissors className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-black leading-tight">{totalBarbers}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Barberos</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-black leading-tight">{totalAdmins}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Admins Local</p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full min-w-0 lg:w-[420px] shrink-0">
          <InteractiveChartTA title="Distribución de roles" description="Estado actual de los usuarios que coinciden con los filtros." initialType="pie" allowedTypes={["bar", "pie", "table"]} height={200}
            data={roleDistribution.map((role) => ({ label: role.name, values: { users: role.value } }))}
            series={[{ key: "users", label: "Usuarios" }]} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <SearchInput value={filters.search} onChange={(e: ChangeEvent<HTMLInputElement>) => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Buscar usuario por nombre o correo..." className="border-0 shadow-none bg-transparent h-9" />
        </div>
        <div className="w-px h-8 bg-border hidden sm:block"></div>
        <PremiumSelect 
          label="Filtrar Rol"
          value={filters.role}
          onValueChange={v => setFilters(f => ({ ...f, role: v as UserRole }))}
          options={[
            { value: '', label: 'Todos los roles', description: 'Cualquier perfil', icon: Filter },
            { value: 'SUPERADMIN', label: 'Superadmin', description: 'Acceso total', icon: Shield, iconColor: 'text-amber-400' },
            { value: 'ADMIN_BARBERIA', label: 'Admin Barbería', description: 'Gestión local', icon: Building2, iconColor: 'text-cyan-400' },
            { value: 'PROFESSIONAL', label: 'Profesional', description: 'Especialista', icon: Scissors, iconColor: 'text-amber-400' },
            { value: 'CLIENTE', label: 'Cliente', description: 'Usuario final', icon: User, iconColor: 'text-violet-400' }
          ]}
          triggerClassName="w-52 h-9 border-0 bg-transparent"
        />
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuario</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rol</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Barbería</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Permisos</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((user) => (
              <tr key={user.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openDetail(user)}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-cyan-400/20 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={cn('text-sm font-semibold', roleColors[user.role] || 'text-muted-foreground')}>
                    {roleLabels[user.role] || user.role}
                  </span>
                </td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{user.barber_shop?.name || '—'}</span>
                  </div>
                </td>
                <td className="px-5 py-4 hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {user.roles?.slice(0, 3).map(r => (
                      <span key={r.id} className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">{r.name}</span>
                    ))}
                    {(user.roles?.length ?? 0) > 3 && <span className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">+{(user.roles?.length ?? 0) - 3}</span>}
                  </div>
                </td>
                <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <ActionMenu items={[
                    { label: 'Editar', icon: Edit, onClick: () => openEdit(user) },
                    { label: 'Eliminar', icon: Trash2, onClick: () => handleDelete(user), danger: true },
                  ]} />
                </td>
              </tr>
            ))}
            {data.users.length === 0 && (
              <tr><td colSpan={5} className="py-16 text-center">
                <User className="w-12 h-12 text-[#1E293B] mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No hay usuarios</p>
              </td></tr>
            )}
          </tbody>
        </table>
        
        {visibleCount < filteredUsers.length && (
          <div className="p-4 flex justify-center border-t border-border bg-muted/10">
            <Button variant="outline" className="rounded-full bg-card gap-2 text-xs font-bold px-6 shadow-sm border-border hover:bg-muted/50" onClick={() => setVisibleCount(c => c + 15)}>
              <ChevronDown className="w-4 h-4" />
              Cargar más usuarios ({filteredUsers.length - visibleCount} restantes)
            </Button>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      <Dialog open={!!detailUser} onOpenChange={o => !o && setDetailUser(null)}>
        <DialogContent showCloseButton={false} className="bg-card border border-border text-foreground max-w-2xl sm:max-w-2xl rounded-3xl p-0 overflow-hidden shadow-2xl">
          {detailLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : detailData && detailUser && (
            <div className="flex flex-col">
              {/* Header */}
              <div className="p-6 pb-8 bg-card border-b border-border relative">
                <Button variant="ghost" size="icon" className="absolute top-4 right-4 bg-background/50 backdrop-blur-sm rounded-full" onClick={() => setDetailUser(null)}>
                  <Plus className="w-5 h-5 rotate-45" />
                </Button>
                
                <div className="flex items-center gap-5 mt-2">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-card">
                    {detailUser.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">{detailUser.name}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge className={cn('px-2 py-0.5', roleColors[detailUser.role]?.replace('text-', 'bg-').replace('-400', '-500/20') || 'bg-muted', roleColors[detailUser.role] || 'text-muted-foreground', 'border-transparent')}>
                        {roleLabels[detailUser.role] || detailUser.role}
                      </Badge>
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Mail className="w-3.5 h-3.5" />{detailUser.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Content based on role */}
              <div className="p-6 bg-card min-h-[300px]">
                {detailUser.role === 'CLIENTE' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Actividad del Cliente</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-muted/30 border border-border p-4 rounded-2xl">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Teléfono</p>
                        <p className="text-sm font-semibold">{detailData.phone || 'No registrado'}</p>
                      </div>
                      <div className="bg-muted/30 border border-border p-4 rounded-2xl">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Puntos de Fidelidad</p>
                        <p className="text-xl font-black text-violet-500">{detailData.loyalty_points || 0}</p>
                      </div>
                      <div className="bg-muted/30 border border-border p-4 rounded-2xl">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Fecha Registro</p>
                        <p className="text-sm font-semibold">{detailUser.created_at ? new Date(detailUser.created_at).toLocaleDateString() : 'No disponible'}</p>
                      </div>
                    </div>
                    {detailData.notes && (
                      <div className="bg-habitu-gold/10 border border-habitu-gold/20 p-4 rounded-2xl">
                        <p className="text-[10px] text-habitu-primary uppercase font-bold tracking-wider mb-1">Notas Internas</p>
                        <p className="text-sm text-habitu-primary/80">{detailData.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {detailUser.role === 'PROFESSIONAL' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Scissors className="w-5 h-5 text-primary" /> Rendimiento Profesional</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-muted/30 border border-border p-4 rounded-2xl flex flex-col justify-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Citas Hoy</p>
                        <p className="text-xl font-black">{detailData.stats?.today_appointments || 0}</p>
                      </div>
                      <div className="bg-muted/30 border border-border p-4 rounded-2xl flex flex-col justify-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Ingresos Hoy</p>
                        <p className="text-xl font-black text-emerald-500">${detailData.stats?.today_revenue || 0}</p>
                      </div>
                      <div className="bg-muted/30 border border-border p-4 rounded-2xl flex flex-col justify-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Calificación</p>
                        <p className="text-xl font-black flex items-center gap-1.5"><Star className="w-4 h-4 fill-amber-500 text-amber-600 dark:text-amber-300" /> {detailData.rating || 'N/A'}</p>
                      </div>
                      <div className="bg-muted/30 border border-border p-4 rounded-2xl flex flex-col justify-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Estado</p>
                        <Badge variant={detailData.is_active ? 'default' : 'secondary'} className="w-fit">{detailData.is_active ? 'Activo' : 'Inactivo'}</Badge>
                      </div>
                    </div>
                  </div>
                )}

                {detailUser.role === 'ADMIN_BARBERIA' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-cyan-500" /> Administración de Sucursal</h3>
                    {detailUser.barber_shop ? (
                      <div className="bg-cyan-500/5 border border-cyan-500/20 p-5 rounded-2xl">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-cyan-500" />
                          </div>
                          <div>
                            <p className="text-lg font-bold">{detailUser.barber_shop.name}</p>
                            <p className="text-sm text-muted-foreground">{detailUser.barber_shop.address}</p>
                          </div>
                        </div>
                        <Button variant="outline" className="w-full text-xs font-bold" onClick={() => window.open(`/superadmin/dashboard`, '_blank')}>Ver Dashboard de la Sucursal</Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-xl text-center">Este administrador no tiene una sucursal asignada actualmente.</p>
                    )}
                  </div>
                )}

                {detailUser.role === 'SUPERADMIN' && (
                  <div className="flex flex-col items-center justify-center text-center py-8">
                    <Shield className="w-16 h-16 text-primary/20 mb-4" />
                    <h3 className="text-lg font-bold">Acceso Total al Sistema</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-sm">Este usuario tiene control total sobre todas las configuraciones, usuarios y sucursales de habitu.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border border-border text-foreground max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle className="text-lg">{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre *</label>
                <Input className="h-10 rounded-xl bg-card border-border text-foreground text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email *</label>
                <Input className="h-10 rounded-xl bg-card border-border text-foreground text-sm" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{editing ? 'Nueva contraseña' : 'Contraseña *'}</label>
                <Input className="h-10 rounded-xl bg-card border-border text-foreground text-sm" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editing ? 'Dejar vacío para no cambiar' : ''} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Rol *</label>
                <PremiumSelect 
                  label="Asignar Rol"
                  value={form.role}
                  onValueChange={v => setForm(f => ({ ...f, role: v as UserRole }))}
                  options={[
                    { value: 'SUPERADMIN', label: 'Superadmin', description: 'Control total del sistema', icon: Shield },
                    { value: 'ADMIN_BARBERIA', label: 'Admin Barbería', description: 'Control de sucursal', icon: Building2 },
                    { value: 'PROFESSIONAL', label: 'Profesional', description: 'Perfil de servicio', icon: Scissors },
                    { value: 'CLIENTE', label: 'Cliente', description: 'Acceso a citas', icon: User }
                  ]}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Barbería (opcional)</label>
              <PremiumSelect 
                label="Sucursal"
                value={form.barber_shop_id}
                onValueChange={v => setForm(f => ({ ...f, barber_shop_id: v }))}
                options={[
                  { value: '', label: 'Sin barbería', description: 'Usuario global', icon: Building2 },
                  ...data.barberShops.map(s => ({
                    value: String(s.id),
                    label: s.name,
                    description: s.address,
                    icon: Building2
                  }))
                ]}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Roles adicionales</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {data.roles.length === 0 && (
                  <div className="col-span-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                    No hay roles configurados.
                  </div>
                )}
                {data.roles.map(role => (
                  <label key={role.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                    <input type="checkbox" checked={form.roles.includes(role.id)} onChange={e => setForm(f => ({
                      ...f,
                      roles: e.target.checked ? [...f.roles, role.id] : f.roles.filter(id => id !== role.id)
                    }))} className="accent-primary" />
                    <span className="text-sm text-muted-foreground">
                      {role.name}
                      <span className="ml-1 text-xs opacity-70">({role.permissions?.length || 0} permisos)</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-xl text-muted-foreground" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.email || (!editing && !form.password)} className="rounded-xl bg-primary hover:bg-primary/90">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
