import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useState, useRef, useMemo } from 'react'
import { 
  Settings, Save, Clock, MapPin, Phone, Mail, 
  Camera, Layout, User, Lock, Eye, EyeOff,
  Globe, Info, Shield, CheckCircle2, AlertCircle,
  Share2, ExternalLink, Trash2, MessageCircle, ChevronRight,
  Plus, Calendar, CreditCard, Banknote, Landmark, Smartphone,
  TrendingUp, DollarSign, Activity, Users, Search, Filter, Download
} from 'lucide-react'
import { barberShopService, authService } from '@/services'
import { LoadingState, CustomTabs, PremiumModal } from '@/components/premium'
import { useAuth } from '@/App'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/Toast'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { StateTA } from '@/components/TA/StateTA'
import { visibleNavigation } from '@/components/TA/navigation'
import type { ManagedBusiness, BusinessHours } from '@/modules/businesses/types'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icon in Leaflet
delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: () => string })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export const AdminBarberiaPage = () => {
  const { addToast } = useToast()
  const { user: currentUser, permissions } = useAuth()
  const allowedPaths = new Set(currentUser ? visibleNavigation(currentUser.role, permissions).map(item => item.path) : [])
  const [shop, setShop] = useState<ManagedBusiness | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [editingDay, setEditingDay] = useState<string | null>(null)
  
  // Quick Config States
  const [quickModal, setQuickModal] = useState<string | null>(null)
  const realtimeRevision = useRealtimeRevision(['businesses'], { enabled: !editing && !editingDay && !quickModal && !saving })

  // File upload refs
  const bannerRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    description: '',
    banner_url: '',
    photo_url: '',
    opening_hours: {
      Lun: { active: true, start: '08:00', end: '20:00' },
      Mar: { active: true, start: '08:00', end: '20:00' },
      Mie: { active: true, start: '08:00', end: '20:00' },
      Jue: { active: true, start: '08:00', end: '20:00' },
      Vie: { active: true, start: '08:00', end: '20:00' },
      Sab: { active: true, start: '08:00', end: '20:00' },
      Dom: { active: false, start: '08:00', end: '20:00' }
    } as Record<string, BusinessHours>,
    whatsapp: '',
    instagram: '',
    active: true,
    lat: null as number | null,
    lng: null as number | null,
  })

  useEffect(() => { fetchShop() }, [realtimeRevision])

  const fetchShop = async () => {
    setLoading(true)
    try {
      let userShop: ManagedBusiness | null = null;
      if (currentUser?.barber_shop_id) {
        const id = currentUser.barber_shop_id;
        userShop = await barberShopService.getById(id);
      } else {
        const res = await barberShopService.getAll({})
        userShop = res.businesses[0] || null
      }
      
      if (userShop) {
        let schedule: Record<string, BusinessHours> = {
          Lun: { active: true, start: '08:00', end: '20:00' },
          Mar: { active: true, start: '08:00', end: '20:00' },
          Mie: { active: true, start: '08:00', end: '20:00' },
          Jue: { active: true, start: '08:00', end: '20:00' },
          Vie: { active: true, start: '08:00', end: '20:00' },
          Sab: { active: true, start: '08:00', end: '20:00' },
          Dom: { active: false, start: '08:00', end: '20:00' }
        }

        try {
          if (userShop.hours && userShop.hours.length > 0) {
            const reverseMapping: Record<string, string> = {
              'LUNES': 'Lun',
              'MARTES': 'Mar',
              'MIERCOLES': 'Mie',
              'JUEVES': 'Jue',
              'VIERNES': 'Vie',
              'SABADO': 'Sab',
              'DOMINGO': 'Dom'
            }

            userShop.hours.forEach(h => {
              const dayKey = reverseMapping[h.day]
              if (dayKey) {
                schedule[dayKey] = {
                  active: !h.closed,
                  start: h.open_time.substring(0, 5),
                  end: h.close_time.substring(0, 5)
                }
              }
            })
          } else if (userShop.opening_hours) {
            const parsed: Record<string, BusinessHours> = typeof userShop.opening_hours === 'string' ? JSON.parse(userShop.opening_hours) : userShop.opening_hours
            schedule = { ...schedule, ...parsed }
          }
        } catch (e) { console.error("Error parsing opening_hours", e) }

        setShop(userShop)
        setForm({
          name: userShop.name || '',
          address: userShop.address || '',
          phone: userShop.phone || '',
          email: userShop.email || '',
          description: userShop.description || '',
          banner_url: userShop.banner_url || '',
          photo_url: userShop.logo_url || userShop.photo_url || '',
          opening_hours: schedule,
          whatsapp: userShop.whatsapp || '',
          instagram: userShop.instagram || '',
          active: userShop.is_active !== false,
          lat: userShop.lat == null ? null : Number(userShop.lat),
          lng: userShop.lng == null ? null : Number(userShop.lng),
        })
        

      }
    } catch (e) { 
      console.error(e)
      addToast('Error al cargar la información', 'error')
    }
    finally { setLoading(false) }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'logo') => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setForm(prev => ({ ...prev, [type === 'banner' ? 'banner_url' : 'photo_url']: base64 }))
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!shop || saving) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        logo_url: form.photo_url,
        is_active: form.active,
        opening_hours: JSON.stringify(form.opening_hours)
      }
      await barberShopService.update(shop.id, payload)
      addToast('Configuración guardada con éxito', 'success')
      setEditing(false)
      setQuickModal(null)
      fetchShop()
    } catch (e) { 
      console.error(e)
      addToast('Error al guardar los cambios', 'error')
    }
    finally { setSaving(false) }
  }

  const MapPicker = () => {
    const LocationMarker = () => {
      useMapEvents({
        click(e) {
          setForm(f => ({ ...f, lat: e.latlng.lat, lng: e.latlng.lng }))
        },
      })
      if (form.lat === null || form.lng === null) return null
      return <Marker position={[form.lat, form.lng]} draggable={true} eventHandlers={{
        dragend: (e) => {
          const marker = e.target
          const position = marker.getLatLng()
          setForm(f => ({ ...f, lat: position.lat, lng: position.lng }))
        }
      }} />
    }

    return (
      <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
        <MapContainer center={[form.lat ?? 0, form.lng ?? 0]} zoom={form.lat === null ? 2 : 15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LocationMarker />
        </MapContainer>
      </div>
    )
  }

  if (loading) return <LoadingState text="Cargando configuración..." />

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      {/* 1. HEADER (HERO) */}
      <div className="relative group rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="h-64 w-full relative overflow-hidden bg-slate-100 dark:bg-slate-800">
          {form.banner_url ? (
            <img src={form.banner_url} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800">
              <Layout className="w-16 h-16 text-slate-300 dark:text-slate-700" />
            </div>
          )}
          {form.banner_url && <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />}
          
          <div className="absolute top-6 right-6 flex items-center gap-3">
              <Button 
                variant="ghost"
                className="bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-xl gap-2 h-9 px-4 text-xs font-medium border-none"
              >
                <Share2 className="w-4 h-4" /> Compartir
              </Button>
              <Button 
                className="bg-accent hover:bg-accent/85 text-accent-foreground rounded-xl gap-2 h-9 px-6 text-xs font-bold shadow-lg shadow-habitu-gold/20 border-none transition-all active:scale-95"
                onClick={() => setEditing(true)}
              >
                Editar perfil
              </Button>
          </div>
        </div>

        <div className="px-8 py-6 relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-end gap-6 -mt-20">
            <div className="relative group/logo shadow-2xl">
              <div className="w-32 h-32 md:w-36 md:h-36 rounded-2xl border-[6px] border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                {form.photo_url ? (
                  <img src={form.photo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                  </div>
                )}
              </div>
              <button onClick={() => logoRef.current?.click()} className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-accent text-accent-foreground shadow-lg transform hover:scale-110 transition-all opacity-0 group-hover/logo:opacity-100">
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="mb-2 space-y-1.5">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">{shop?.name}</h1>
              <div className="flex items-center gap-3">
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <MapPin className="w-4 h-4 text-slate-400" /> {shop?.address}
                </p>
                <Badge className="bg-habitu-primary/10 dark:bg-habitu-primary/10 text-habitu-primary dark:text-habitu-primary border-habitu-border dark:border-habitu-primary/20 rounded-full text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5">Activa</Badge>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-8 mb-2">
            <div className="text-center"><p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Citas</p><p className="text-xl font-bold text-slate-900 dark:text-white">1.2k</p></div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
            <div className="text-center"><p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Rating</p><p className="text-xl font-bold text-slate-900 dark:text-white">4.9</p></div>
          </div>
        </div>
      </div>

      <input type="file" ref={bannerRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} />
      <input type="file" ref={logoRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />

      {/* 2. GRID PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        <div className="lg:col-span-7 space-y-8">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center"><Info className="w-4 h-4 text-slate-500 dark:text-slate-400" /></div><h2 className="text-base font-semibold text-slate-900 dark:text-white">Sobre la barbería</h2></div>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="text-slate-400 text-xs font-medium h-8">Editar</Button>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm whitespace-pre-wrap font-medium">{shop?.description || "Aún no hay descripción."}</p>
          </section>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center"><Phone className="w-4 h-4 text-slate-500 dark:text-slate-400" /></div><h2 className="text-base font-semibold text-slate-900 dark:text-white">Información de contacto</h2></div>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="text-slate-400 text-xs font-medium h-8">Editar</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: Mail, label: 'Email público', value: form.email, color: 'text-slate-400' },
                { icon: Phone, label: 'Teléfono', value: form.phone, color: 'text-slate-400' },
                { icon: MessageCircle, label: 'WhatsApp', value: form.whatsapp || 'No configurado', color: 'text-primary' },
                { icon: Globe, label: 'Instagram', value: form.instagram || 'No configurado', color: 'text-slate-400' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30 transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
                  <div className={cn("w-10 h-10 rounded-lg bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center", item.color)}><item.icon className="w-4.5 h-4.5" /></div>
                  <div><p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">{item.label}</p><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.value}</p></div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center"><Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" /></div><h2 className="text-base font-semibold text-slate-900 dark:text-white">Horario comercial</h2></div>
            </div>
            <div className="flex flex-wrap gap-3">
              {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((day) => {
                const dayData = form.opening_hours[day] || { active: false, start: '08:00', end: '20:00' };
                const formatTime = (time: string) => {
                  if (!time) return '--';
                  const [h, m] = time.split(':');
                  const hour = parseInt(h);
                  const ampm = hour >= 12 ? 'PM' : 'AM';
                  const hour12 = hour % 12 || 12;
                  return `${hour12.toString().padStart(2, '0')}:${m} ${ampm}`;
                };

                return (
                  <div key={day} className={cn(
                    "flex-1 min-w-[140px] p-4 rounded-2xl border transition-all duration-300",
                    dayData.active 
                      ? "border-habitu-gold bg-habitu-gold/20 dark:bg-habitu-gold/5 dark:border-habitu-gold/20" 
                      : "border-slate-100 bg-slate-50/50 dark:bg-slate-800/30 opacity-60"
                  )}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-3">{day}</p>
                    <div className="flex justify-center mb-3">
                      <Switch 
                        checked={dayData.active} 
                        onCheckedChange={async (checked) => {
                          const newHours = {
                            ...form.opening_hours,
                            [day]: { ...dayData, active: checked }
                          };
                          setForm(f => ({ ...f, opening_hours: newHours }));
                          
                          try {
                            const payload = {
                              ...form,
        logo_url: form.photo_url,
        is_active: form.active,
                              opening_hours: JSON.stringify(newHours)
                            };
                            if (!shop) return;
                            await barberShopService.update(shop.id, payload);
                            addToast(`${day} actualizado`, 'success');
                          } catch (e) {
                            addToast('Error al actualizar horario', 'error');
                          }
                        }}
                        className="data-[state=checked]:bg-primary" 
                      />
                    </div>
                    <div className="text-center space-y-2">
                       <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-tight">
                         {dayData.active ? `${formatTime(dayData.start)} - ${formatTime(dayData.end)}` : 'Cerrado'}
                       </p>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="h-7 w-full text-[9px] font-black uppercase tracking-widest text-primary hover:bg-habitu-gold/10 dark:hover:bg-habitu-gold/10 rounded-lg"
                         onClick={() => setEditingDay(day)}
                       >
                         Modificar
                       </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <section className="bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
             <div className="flex items-center gap-2.5 mb-5"><Shield className="w-4 h-4 text-slate-400" /><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Estado de la cuenta</h3></div>
             <div className="flex items-center justify-between mb-6"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-habitu-gold animate-pulse" /><span className="text-sm font-bold text-slate-700 dark:text-slate-200">Cuenta Activa</span></div><Badge className="bg-habitu-primary/10 text-habitu-primary border-none rounded-md px-1.5 py-0 text-[9px] font-bold">PRO</Badge></div>
             <div className="space-y-3.5">
                <div className="flex justify-between items-center text-[11px]"><span className="text-slate-400 font-medium">Plan actual</span><span className="text-habitu-primary font-bold uppercase tracking-wider">Free Plan</span></div>
                <div className="flex justify-between items-center text-[11px]"><span className="text-slate-400 font-medium">Desde el</span><span className="text-slate-600 dark:text-slate-300 font-semibold">12 Mar 2024</span></div>
             </div>
          </section>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5"><div className="flex items-center gap-2.5"><Camera className="w-4 h-4 text-slate-400" /><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Branding</h3></div></div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 overflow-hidden shadow-sm"><img src={form.photo_url} className="w-full h-full object-cover" /></div><span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-tight">Logo</span></div>
                <Button variant="ghost" className="h-7 text-[10px] font-bold text-slate-400 hover:text-slate-900 rounded-md uppercase tracking-wider" onClick={() => logoRef.current?.click()}>Cambiar</Button>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3"><div className="w-14 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 overflow-hidden shadow-sm"><img src={form.banner_url} className="w-full h-full object-cover" /></div><span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-tight">Banner</span></div>
                <Button variant="ghost" className="h-7 text-[10px] font-bold text-slate-400 hover:text-slate-900 rounded-md uppercase tracking-wider" onClick={() => bannerRef.current?.click()}>Cambiar</Button>
              </div>
            </div>
          </section>

          {/* 🎯 CONFIGURACIÓN RÁPIDA (FUNCIONAL) */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 mb-4"><Settings className="w-4 h-4 text-slate-400" /><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Configuración rápida</h3></div>
            <div className="space-y-0.5 -mx-2">
              {[
                { icon: CreditCard, label: 'Métodos de pago', id: 'payments' },
                { icon: MapPin, label: 'Ubicación y mapa', id: 'map' },
                { icon: User, label: 'Barberos activos', id: 'barbers' },
                { icon: DollarSign, label: 'Cierres de agenda', id: 'commissions' }
              ].map((item, i) => (
                <button key={i} onClick={() => setQuickModal(item.id)} className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                  <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    <item.icon className="w-3.5 h-3.5" /><span className="text-xs font-medium">{item.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* --- QUICK CONFIG MODALS --- */}

      {/* 💳 MÉTODOS DE PAGO */}
      <PremiumModal open={quickModal === 'payments'} onOpenChange={(open) => !open && setQuickModal(null)} title="Métodos de pago" description="Configuración de medios de pago.">
        <StateTA title="Configuración no disponible" description="La configuración de medios de pago de esta sede aún no está conectada. Los métodos se informan durante la reserva." />
      </PremiumModal>

      {/* 🗺️ UBICACIÓN Y MAPA */}
      <PremiumModal 
        open={quickModal === 'map'} 
        onOpenChange={(o) => !o && setQuickModal(null)}
        title="Ubicación en el Mapa"
        description="Mueve el marcador o haz clic en cualquier punto para actualizar tu ubicación exacta."
        maxWidth="sm:max-w-4xl"
        footer={
          <div className="flex w-full items-center justify-between">
            <Button variant="ghost" className="rounded-xl h-11 px-8 font-bold" onClick={() => setQuickModal(null)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl px-8 h-11 shadow-lg shadow-habitu-gold/20 border-none font-bold">Actualizar Ubicación</Button>
          </div>
        }
      >
        <div className="space-y-6">
          <MapPicker />
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black font-bold text-slate-400 uppercase tracking-widest mb-1">Latitud</p><p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{form.lat?.toFixed(6) ?? 'Sin ubicar'}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black font-bold text-slate-400 uppercase tracking-widest mb-1">Longitud</p><p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{form.lng?.toFixed(6) ?? 'Sin ubicar'}</p>
            </div>
          </div>
        </div>
      </PremiumModal>

      {/* 👥 EQUIPO Y COMISIONES */}
      <PremiumModal open={quickModal === 'barbers'} onOpenChange={(open) => !open && setQuickModal(null)} title="Mi equipo" description="Consulta y gestiona los profesionales de tu negocio.">
        <div className="py-5">{allowedPaths.has('/admin/professionals') && <Link to="/admin/professionals" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">Abrir gestión de profesionales</Link>}</div>
      </PremiumModal>
      <PremiumModal open={quickModal === 'commissions'} onOpenChange={(open) => !open && setQuickModal(null)} title="Comisiones y pagos" description="Estado de las liquidaciones de tu equipo.">
        <StateTA title="Liquidaciones no disponibles" description="Aún no hay una integración de liquidaciones por profesional para esta sede. Puedes consultar la actividad real en tus reportes." />
        <div className="pb-5 text-center">{allowedPaths.has('/admin/reports') && <Link to="/admin/reports" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold text-primary">Ver reportes</Link>}</div>
      </PremiumModal>

      {/* ⏰ MODAL: EDITAR HORARIO POR DÍA */}
      <PremiumModal 
        open={!!editingDay} 
        onOpenChange={(o) => !o && setEditingDay(null)}
        title={`Horario: ${editingDay}`}
        description="Define el rango de apertura y cierre para este día específico."
        maxWidth="sm:max-w-md"
        footer={
          <Button 
            onClick={async () => {
              try {
                const payload = {
                  ...form,
        logo_url: form.photo_url,
        is_active: form.active,
                  opening_hours: JSON.stringify(form.opening_hours)
                };
                if (!shop) return;
                            await barberShopService.update(shop.id, payload);
                addToast('Horario actualizado', 'success');
                setEditingDay(null);
              } catch (e) {
                addToast('Error al guardar horario', 'error');
              }
            }} 
            className="w-full bg-[var(--habitu-gold)] hover:bg-[var(--habitu-primary)] text-white rounded-2xl h-14 shadow-lg shadow-[var(--habitu-gold)]/20 border-none font-black uppercase tracking-widest active:scale-95 transition-all text-lg"
          >
            Guardar Horario
          </Button>
        }
      >
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Apertura</label>
              <Input 
                type="time" 
                className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border-slate-200 font-black text-lg"
                value={editingDay ? form.opening_hours[editingDay]?.start : ''}
                onChange={(e) => setForm(f => ({
                  ...f,
                  opening_hours: {
                    ...f.opening_hours,
                    [editingDay!]: { ...f.opening_hours[editingDay!], start: e.target.value, active: true }
                  }
                }))}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Cierre</label>
              <Input 
                type="time" 
                className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border-slate-200 font-black text-lg"
                value={editingDay ? form.opening_hours[editingDay]?.end : ''}
                onChange={(e) => setForm(f => ({
                  ...f,
                  opening_hours: {
                    ...f.opening_hours,
                    [editingDay!]: { ...f.opening_hours[editingDay!], end: e.target.value, active: true }
                  }
                }))}
              />
            </div>
          </div>

          <div className="p-6 rounded-[2rem] bg-habitu-primary/10 dark:bg-habitu-primary/100/5 border border-habitu-gold dark:border-habitu-gold/10 flex items-center justify-between">
             <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-habitu-gold/20 dark:bg-primary/20 flex items-center justify-center text-habitu-primary shadow-sm"><CheckCircle2 className="w-5 h-5" /></div>
               <span className="text-xs font-black text-amber-900 dark:text-habitu-primary uppercase tracking-widest">Día Laborable</span>
             </div>
             <Switch 
               checked={editingDay ? form.opening_hours[editingDay]?.active : false} 
               onCheckedChange={(checked) => setForm(f => ({
                 ...f,
                 opening_hours: {
                   ...f.opening_hours,
                   [editingDay!]: { ...f.opening_hours[editingDay!], active: checked }
                 }
               }))}
               className="data-[state=checked]:bg-[var(--habitu-gold)]"
             />
          </div>
        </div>
      </PremiumModal>

      {/* --- RE-USING PREVIOUS EDIT MODAL --- */}
      <PremiumModal 
        open={editing} 
        onOpenChange={setEditing}
        title="Editar Barbería"
        description="Actualiza los detalles de tu negocio y cómo te verán los clientes en la plataforma."
        maxWidth="max-w-[95vw] lg:max-w-6xl"
        padding={false}
        footer={
          <div className="flex w-full items-center justify-between">
            <Button variant="ghost" className="rounded-2xl h-14 px-10 font-bold text-slate-400 hover:text-rose-500 transition-all" onClick={() => setEditing(false)}>CANCELAR</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[var(--habitu-gold)] hover:bg-[var(--habitu-primary)] text-white rounded-2xl h-14 px-12 font-black shadow-xl shadow-[var(--habitu-gold)]/20 text-lg transition-all active:scale-95">
              {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
            </Button>
          </div>
        }
      >
        <div className="bg-card border-b border-border/50 px-10 py-6">
          <CustomTabs 
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: 'general', label: 'Información General', icon: Info },
              { id: 'design', label: 'Imágenes y Branding', icon: Camera },
              { id: 'security', label: 'Seguridad y Acceso', icon: Lock },
            ]}
          />
        </div>
        <div className="p-10 overflow-y-auto custom-scrollbar pb-32">
          {activeTab === 'general' && (
            <div className="mt-0 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Nombre del Negocio</label>
                  <Input className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-900 dark:text-white px-6 font-bold text-lg" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Email público</label>
                  <Input className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-900 dark:text-white px-6 font-bold text-lg" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">WhatsApp de contacto</label>
                  <Input className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-900 dark:text-white px-6 font-bold text-lg" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Usuario de Instagram</label>
                  <Input className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-900 dark:text-white px-6 font-bold text-lg" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Dirección física</label>
                <div className="relative">
                  <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input className="h-14 pl-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-900 dark:text-white font-bold text-lg" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
              </div>
            </div>
          )}
          {activeTab === 'design' && (
            <div className="mt-0 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Logo Upload Section */}
                <div className="space-y-6">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Logo / Avatar de la Barbería</label>
                  <div className="relative group/edit-logo">
                    <div className="w-full aspect-video rounded-[2.5rem] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center relative shadow-inner">
                      {form.photo_url ? (
                        <img src={form.photo_url} alt="Logo Preview" className="w-full h-full object-cover transition-transform group-hover/edit-logo:scale-105" />
                      ) : (
                        <div className="text-center space-y-3">
                           <User className="w-16 h-16 text-slate-300 mx-auto opacity-30" />
                           <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Sin logo cargado</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/edit-logo:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                         <Button onClick={() => logoRef.current?.click()} variant="secondary" className="rounded-2xl font-black gap-2 h-12 px-8 shadow-2xl">
                            <Camera className="w-5 h-5" /> CAMBIAR LOGO
                         </Button>
                         <p className="text-[10px] text-white/60 font-black tracking-widest">PNG o JPG • 500x500px recomendado</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banner Upload Section */}
                <div className="space-y-6">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Banner Principal</label>
                  <div className="relative group/edit-banner">
                    <div className="w-full aspect-video rounded-[2.5rem] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center relative shadow-inner">
                      {form.banner_url ? (
                        <img src={form.banner_url} alt="Banner Preview" className="w-full h-full object-cover transition-transform group-hover/edit-banner:scale-105" />
                      ) : (
                        <div className="text-center space-y-3">
                           <Layout className="w-16 h-16 text-slate-300 mx-auto opacity-30" />
                           <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Sin banner cargado</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/edit-banner:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                         <Button onClick={() => bannerRef.current?.click()} variant="secondary" className="rounded-2xl font-black gap-2 h-12 px-8 shadow-2xl">
                            <Camera className="w-5 h-5" /> CAMBIAR BANNER
                         </Button>
                         <p className="text-[10px] text-white/60 font-black tracking-widest">1200x400px recomendado</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 rounded-[2rem] bg-habitu-primary/100/5 border border-habitu-gold/10 flex items-center gap-4">
                 <AlertCircle className="w-6 h-6 text-primary" />
                 <p className="text-sm text-habitu-primary dark:text-habitu-primary font-medium">
                   Las imágenes se guardan automáticamente al presionar "Guardar Cambios". Asegúrate de que los archivos no superen los 2MB para una carga óptima.
                 </p>
              </div>
            </div>
          )}
          {activeTab === 'security' && <StateTA title="Seguridad de la cuenta" description="El cambio de contraseña debe realizarse desde una función de seguridad de cuenta. La configuración del negocio no modifica credenciales." />}
        </div>
      </PremiumModal>

    </div>
  )
}
