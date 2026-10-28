import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import type { Permission, PermissionDirectory, Role } from '@/types/auth'
import { useEffect, useState, type ChangeEvent } from 'react'
import {
  Shield, Plus, Check, Search, Save, Edit, Trash2,
  ChevronRight, Lock, Users, Settings
} from 'lucide-react'
import { StatusBadge, SearchInput, LoadingState, TableSkeleton } from '@/components/premium'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { httpService } from '@/services/auth/authService'
import { cn } from '@/lib/utils'

export const RolesPermissionsPage = () => {
  const realtimeRevision = useRealtimeRevision(["users","account"]);
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<PermissionDirectory>({ permissions: [], grouped: {} })
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [form, setForm] = useState<{ name: string; slug: string; description: string; permissions: number[] }>({ name: '', slug: '', description: '', permissions: [] })
  const [saving, setSaving] = useState(false)
  const [permSearch, setPermSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { fetchData() }, [realtimeRevision])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [rolesRes, permsRes] = await Promise.all([
        httpService.get<Role[]>('/roles'),
        httpService.get<PermissionDirectory>('/permissions'),
      ])
      setRoles(rolesRes)
      setPermissions(permsRes)
      if (rolesRes.length > 0 && !selectedRole) setSelectedRole(rolesRes[0])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const openEdit = (role: Role) => {
    setForm({
      name: role.name,
      slug: role.slug,
      description: role.description || '',
      permissions: role.permissions?.map(p => p.id) || []
    })
    setEditing(role)
    setShowCreate(true)
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      const data = { name: form.name, slug: form.slug, description: form.description, permissions: form.permissions }
      if (editing) {
        await httpService.put(`/roles/${editing.id}`, data)
        if (selectedRole?.id === editing.id) setSelectedRole({ ...selectedRole, ...data, permissions: (permissions.permissions || []).filter(p => form.permissions.includes(p.id)) })
      } else {
        await httpService.post('/roles', data)
      }
      setShowCreate(false)
      fetchData()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const handlePermissionToggle = async (permissionId: number) => {
    if (!selectedRole || saving) return
    const permission = permissions.permissions.find(item => item.id === permissionId)
    if (!permission) return
    const nextPermissions = selectedRole.permissions?.some(item => item.id === permissionId)
      ? selectedRole.permissions.filter(item => item.id !== permissionId)
      : [...(selectedRole.permissions ?? []), permission]
    setSaving(true)
    setError('')
    try {
      const updated = await httpService.put<Role>(`/roles/${selectedRole.id}`, { permissions: nextPermissions.map(item => item.id) })
      setSelectedRole(updated)
      setRoles(current => current.map(role => role.id === updated.id ? updated : role))
    } catch {
      setError('No se pudieron guardar los permisos. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (role: Role) => {
    if (role.type === 'system') return
    if (!confirm(`Eliminar rol "${role.name}"?`)) return
    try { await httpService.delete(`/roles/${role.id}`); fetchData() } catch (e) { alert('Error al eliminar') }
  }

  const togglePerm = (id: number) => setForm(f => ({
    ...f,
    permissions: f.permissions.includes(id) ? f.permissions.filter(p => p !== id) : [...f.permissions, id]
  }))

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted animate-pulse rounded-md" />
          <div className="h-4 w-48 bg-muted animate-pulse rounded-sm" />
        </div>
      </div>
      <TableSkeleton rows={6} columns={3} />
    </div>
  )

  const groups = Object.entries(permissions.grouped || {})
  const filteredGroups = permSearch
    ? groups.map(([g, perms]): [string, Permission[]] => [g, perms.filter(p => p.name.toLowerCase().includes(permSearch.toLowerCase()))]).filter(([_, p]) => p.length > 0)
    : groups

  return (
    <div className="space-y-6 animate-fade-in">
      {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roles y Permisos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona acceso y permisos del sistema</p>
        </div>
        <Button onClick={() => { setForm({ name: '', slug: '', description: '', permissions: [] }); setEditing(null); setShowCreate(true) }} className="h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-medium">
          <Plus className="w-4 h-4" />
          Nuevo Rol
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Shield className="w-4 h-4 text-primary" />
                Roles del Sistema
              </div>
            </div>
            <div className="p-2 space-y-1 max-h-[600px] overflow-y-auto">
              {roles.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No hay roles configurados.
                </div>
              )}
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => { setSelectedRole(role); setError('') }}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all',
                    selectedRole?.id === role.id
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-muted border border-transparent'
                  )}
                >
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                    selectedRole?.id === role.id ? 'bg-primary/20' : 'bg-muted'
                  )}>
                    <Shield className={cn('w-4 h-4', selectedRole?.id === role.id ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{role.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{role.permissions?.length || 0} permisos</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={role.type === 'system' ? 'Sistema' : 'Custom'} size="sm" />
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Permissions Panel */}
        <div className="lg:col-span-2">
          {selectedRole ? (
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">{selectedRole.name}</h3>
                    <p className="text-xs text-muted-foreground">{selectedRole.description || 'Sin descripción'}</p>
                  </div>
                </div>
<div className="flex items-center gap-2">
                    <StatusBadge status={selectedRole.type === 'system' ? 'Sistema' : 'Custom'} />
                    {selectedRole.type !== 'system' ? (
                      <>
                        <Button size="sm" variant="ghost" className="rounded-lg text-muted-foreground hover:text-foreground" onClick={() => openEdit(selectedRole)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="rounded-lg text-rose-400 hover:text-rose-400 hover:bg-rose-400/10" onClick={() => handleDelete(selectedRole)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" className="rounded-lg text-muted-foreground hover:text-foreground" onClick={() => openEdit(selectedRole)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
              </div>

              <div className="p-4 border-b border-border">
                <SearchInput value={permSearch} onChange={(e: ChangeEvent<HTMLInputElement>) => setPermSearch(e.target.value)} placeholder="Buscar permiso..." className="max-w-sm" />
              </div>

              <div className="p-4 space-y-5 max-h-[450px] overflow-y-auto">
                {filteredGroups.map(([group, perms]) => (
                  <div key={group}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-xs font-bold text-muted-foreground">{group.charAt(0).toUpperCase()}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground capitalize">{group}</h4>
                      <span className="text-xs text-muted-foreground">({perms.length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {perms.map(perm => {
                        const checked = selectedRole.permissions?.some(p => p.id === perm.id)
                        return (
                          <label
                            key={perm.id}
                            className={cn(
                              'flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer',
                              checked ? 'border-primary/30 bg-primary/5' : 'border-border hover:border-border'
                            )}
                          >
                            <Checkbox disabled={saving} onCheckedChange={() => { void handlePermissionToggle(perm.id) }} checked={checked} className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{perm.name}</p>
                              <p className="text-xs text-muted-foreground">{perm.slug}</p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {filteredGroups.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No se encontraron permisos</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-card border border-border flex items-center justify-center h-96">
              <div className="text-center">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Selecciona un rol para ver sus permisos</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[90vh] overflow-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">{editing ? 'Editar Rol' : 'Nuevo Rol'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre *</label>
                <Input className="h-10 rounded-xl bg-card border-border text-foreground text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Slug *</label>
                <Input className="h-10 rounded-xl bg-card border-border text-foreground text-sm" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} disabled={!!editing} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descripción</label>
              <Input className="h-10 rounded-xl bg-card border-border text-foreground text-sm" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Permisos — {form.permissions.length} seleccionados</label>
              <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                {groups.map(([group, perms]) => (
                  <div key={group}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {perms.map(p => (
                        <label key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                          <Checkbox checked={form.permissions.includes(p.id)} onCheckedChange={() => togglePerm(p.id)} />
                          <span className="text-sm text-muted-foreground">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-xl text-muted-foreground" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.slug} className="rounded-xl bg-primary hover:bg-primary/90">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
