import { brand } from '@/config/brand'
import { useState } from 'react'
import { 
  Mail, Phone, Star, Calendar, Users, DollarSign, TrendingUp, 
  Award, Camera, ChevronLeft, ChevronRight, X,
  Image as ImageIcon, Link2, Globe, ExternalLink,
  History, MapPin, Share2
} from 'lucide-react'
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge, MetricCard, DashboardCard, LoadingState, CustomTabs, PremiumModal } from '@/components/premium'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog } from '@/components/ui/dialog'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f43f5e', '#8b5cf6']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border p-3 rounded-xl shadow-xl">
        <p className="text-xs font-bold mb-1 text-muted-foreground">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm font-bold text-primary">
            {p.name}: {p.name.toLowerCase().includes('ingresos') ? `$${Number(p.value).toLocaleString('es-CO')}` : p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

interface BarberDetailsViewProps {
  barber: any
  barberData: any
  loading?: boolean
}

export function BarberDetailsView({ barber, barberData, loading }: BarberDetailsViewProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [portfolioSlider, setPortfolioSlider] = useState<{ open: boolean; index: number }>({ open: false, index: 0 })
  const [activeTab, setActiveTab] = useState('analytics')

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingState text="Sincronizando perfil profesional..." /></div>
  }

  if (!barber) return null

  // Merge barber data - barberData.barber has portfolios loaded from backend
  const fullBarber = barberData?.barber || barber
  const portfolios = fullBarber?.portfolios || []

  const formatCurrency = (v: any) => v ? `$${Number(v).toLocaleString('es-CO')}` : '$0'

  const handlePortfolioClick = (index: number) => {
    setPortfolioSlider({ open: true, index })
  }

  const nextSlide = () => {
    setPortfolioSlider(prev => ({ ...prev, index: (prev.index + 1) % portfolios.length }))
  }

  const prevSlide = () => {
    setPortfolioSlider(prev => ({ ...prev, index: (prev.index - 1 + portfolios.length) % portfolios.length }))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header - Always Visible */}
      <div className="relative shrink-0 bg-[#020617] overflow-hidden">
        <div className="absolute inset-0 opacity-40 bg-gradient-to-br from-primary via-primary/20 to-transparent" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        
        <div className="relative p-6 pb-8 flex items-end gap-6">
          <Avatar className="w-20 h-20 rounded-full shadow-2xl shrink-0">
            <AvatarImage src={fullBarber.photo_url} className="object-cover" />
            <AvatarFallback className="bg-primary/5 text-primary text-2xl font-black">{fullBarber.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1.5">
              <h2 className="text-2xl font-black tracking-tight text-white truncate">{fullBarber.name}</h2>
              <StatusBadge status={fullBarber.active ? 'active' : 'inactive'} />
            </div>
            <div className="flex items-center gap-5 flex-wrap">
              <div className="flex items-center gap-1.5 text-white/70 text-xs font-medium">
                <Award className="w-3.5 h-3.5 text-primary" /> {fullBarber.specialty || 'Master Barber'}
              </div>
              <div className="flex items-center gap-1.5 text-white/70 text-xs font-medium">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> 4.9 <span className="opacity-50">(142 reseñas)</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/70 text-xs font-medium">
                <MapPin className="w-3.5 h-3.5 text-primary" /> {fullBarber.barber_shop?.name || brand.name}
              </div>
            </div>
          </div>

          <div className="shrink-0 flex gap-2">
             <Button size="sm" className="rounded-xl bg-white text-black hover:bg-white/90 font-black px-4 gap-2 h-9 text-xs">
                <Share2 className="w-3.5 h-3.5" /> Compartir
             </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full space-y-10 pb-12">
          {/* Quick Metrics */}
          <div className="px-8 pt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <MetricCard title="Ingresos Mes" value={formatCurrency(barberData?.stats?.monthRevenue)} icon={DollarSign} color="emerald" />
             <MetricCard title="Servicios" value={barberData?.stats?.monthAppointments || 0} icon={Calendar} color="cyan" />
             <MetricCard title="Clientes Únicos" value={barberData?.stats?.totalClients || 0} icon={Users} color="amber" />
             <MetricCard title="Hoy" value={formatCurrency(barberData?.stats?.dayRevenue)} icon={TrendingUp} color="rose" />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-8 mb-8">
              <CustomTabs 
                id="barber-details-tabs"
                activeTab={activeTab}
                onChange={setActiveTab}
                tabs={[
                  { id: 'analytics', label: 'Analíticas' },
                  { id: 'clients', label: 'Historial de Citas' },
                  { id: 'portfolio', label: 'Portafolio' },
                  { id: 'info', label: 'Perfil Público' },
                ]}
                className="w-full md:w-fit"
              />
            </div>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full mt-0">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <DashboardCard title="Ingresos Semanales" subtitle="Últimos 7 días de actividad profesional">
                     <div className="h-[280px] w-full pt-4 min-h-[280px]">
                        <ResponsiveContainer width="100%" height="100%" minHeight={100}>
                          <AreaChart data={(barberData?.dailyIncome || []).map((d:any) => ({ label: d.label, ingresos: Number(d.income) }))}>
                            <defs>
                              <linearGradient id="colorBarberIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/30" />
                            <XAxis dataKey="label" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis hide />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="ingresos" stroke="var(--primary)" strokeWidth={4} fill="url(#colorBarberIncome)" />
                          </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </DashboardCard>

                  <DashboardCard title="Servicios Populares" subtitle="Distribución por categoría">
                     <div className="h-[280px] w-full pt-4 min-h-[280px]">
                        <ResponsiveContainer width="100%" height="100%" minHeight={100}>
                           <BarChart data={(barberData?.serviceBreakdown || []).map((s:any) => ({ name: s.name, total: Number(s.value) }))} layout="vertical">
                             <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-muted/30" />
                             <XAxis type="number" hide />
                             <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} fontSize={10} width={100} />
                             <Tooltip content={<CustomTooltip />} />
                             <Bar dataKey="total" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={24} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </DashboardCard>
               </div>
            </TabsContent>

            {/* Appointments History Tab */}
            <TabsContent value="clients" className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full px-8 mt-0">
               <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xl w-full">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-secondary/20">
                        <th className="text-left px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cliente</th>
                        <th className="text-left px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Servicio</th>
                        <th className="text-left px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Fecha</th>
                        <th className="text-left px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Precio</th>
                        <th className="text-right px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {(barberData?.recentAppointments || []).length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-16 text-muted-foreground font-medium">No hay citas en este período</td></tr>
                      ) : (
                        (barberData?.recentAppointments || []).map((app: any) => (
                        <tr 
                          key={app.id} 
                          className="group hover:bg-secondary/10 transition-all cursor-pointer"
                          onClick={() => setSelectedAppointment(app)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 rounded-xl border border-border group-hover:border-primary/30 transition-colors">
                                <AvatarFallback className="bg-primary/5 text-primary font-black text-xs">{app.client?.name?.substring(0,2)}</AvatarFallback>
                              </Avatar>
                              <span className="font-bold text-sm tracking-tight">{app.client?.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-muted-foreground">{app.service?.name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                               <span className="text-sm font-bold">{app.date?.split('T')[0]}</span>
                               <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{app.time}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-black text-primary">{formatCurrency(app.price)}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <Badge variant={app.status === 'COMPLETADA' ? 'success' : 'secondary'} className="rounded-lg h-6 px-3 font-black text-[9px] uppercase tracking-widest">
                                {app.status}
                             </Badge>
                          </td>
                        </tr>
                        ))
                      )}
                    </tbody>
                  </table>
               </div>
            </TabsContent>

            {/* Portfolio Tab - Read Only */}
            <TabsContent value="portfolio" className="px-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full mt-0">
               {portfolios.length === 0 ? (
                 <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mb-6">
                       <Camera className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    <h4 className="text-lg font-black tracking-tight mb-2">Sin trabajos en portafolio</h4>
                    <p className="text-sm text-muted-foreground max-w-md">El barbero puede subir sus trabajos desde su perfil personal. Los resultados aparecerán aquí automáticamente.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {portfolios.map((item: any, idx: number) => (
                      <div 
                        key={item.id} 
                        className="aspect-[4/5] rounded-2xl bg-card border border-border overflow-hidden relative group cursor-pointer"
                        onClick={() => handlePortfolioClick(idx)}
                      >
                         <img src={item.image_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-5 flex flex-col justify-end">
                            <p className="text-white font-black text-sm tracking-tight">{item.title || 'Corte Premium'}</p>
                            {item.description && <p className="text-white/60 text-[10px] uppercase font-black tracking-widest mt-1">{item.description}</p>}
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="info" className="px-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full mt-0">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-8">
                     <div className="p-8 rounded-2xl bg-card border border-border shadow-sm">
                        <h4 className="text-sm font-black uppercase tracking-widest text-primary mb-4">Acerca de</h4>
                        <p className="text-muted-foreground leading-relaxed font-medium">
                           {fullBarber.bio || 'Este barbero maestro combina técnicas clásicas con las últimas tendencias internacionales. Con más de 5 años de experiencia, se especializa en perfeccionar cada detalle para resaltar tu estilo único.'}
                        </p>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="p-8 rounded-2xl bg-card border border-border shadow-sm">
                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6">Información de Contacto</h4>
                        <div className="space-y-4">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                 <Mail className="w-4 h-4 text-primary" />
                              </div>
                              <div className="overflow-hidden">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Correo</p>
                                 <p className="font-bold text-sm truncate">{fullBarber.email}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                 <Phone className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Teléfono</p>
                                 <p className="font-bold text-sm">{fullBarber.phone}</p>
                              </div>
                           </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-border/50">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Presencia Digital</h4>
                           <div className="flex gap-2">
                              <Button variant="outline" size="icon" className="rounded-xl border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all">
                                 <Globe className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="icon" className="rounded-xl border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all">
                                 <Link2 className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="icon" className="rounded-xl border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all">
                                 <ExternalLink className="w-4 h-4" />
                              </Button>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Appointment Detail Modal */}
      <PremiumModal 
        open={!!selectedAppointment} 
        onOpenChange={(o) => !o && setSelectedAppointment(null)}
        maxWidth="max-w-xl"
        padding={false}
        showCloseButton={true}
        closeButtonColor="light"
      >
        {selectedAppointment && (
          <div className="flex flex-col">
             <div className="p-8 pt-20 bg-gradient-to-br from-primary to-primary-foreground text-white">
                <div className="flex items-center justify-between mb-6">
                   <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md px-4 py-1 font-black text-[10px] uppercase tracking-widest">
                      {selectedAppointment.status}
                   </Badge>
                </div>
                <div className="flex items-center gap-5">
                   <Avatar className="w-16 h-16 rounded-full shadow-xl">
                      <AvatarFallback className="bg-white/10 text-white text-xl font-black">{selectedAppointment.client?.name?.substring(0,2)}</AvatarFallback>
                   </Avatar>
                   <div>
                      <h3 className="text-2xl font-black tracking-tight leading-none">{selectedAppointment.client?.name}</h3>
                      <p className="text-white/70 mt-2 font-medium flex items-center gap-2 text-sm">
                         <Calendar className="w-4 h-4 opacity-50" /> {selectedAppointment.date?.split('T')[0]} • {selectedAppointment.time}
                      </p>
                   </div>
                </div>
             </div>
             <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 rounded-2xl bg-secondary/10 border border-border/30">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Servicio</p>
                      <p className="text-base font-black text-foreground">{selectedAppointment.service?.name}</p>
                   </div>
                   <div className="p-5 rounded-2xl bg-secondary/10 border border-border/30">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Pagado</p>
                      <p className="text-xl font-black text-primary">{formatCurrency(selectedAppointment.price)}</p>
                   </div>
                </div>
                <div>
                   <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Valoración
                   </h4>
                   <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
                      <div className="flex gap-1 mb-3">
                         {[1,2,3,4,5].map(s => (
                           <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />
                         ))}
                      </div>
                      <p className="text-muted-foreground font-medium italic text-sm">
                         "Excelente servicio. Muy profesional y detallista con el degradado."
                      </p>
                   </div>
                </div>
                <Button variant="outline" className="w-full h-12 rounded-xl font-bold border-border/50" onClick={() => setSelectedAppointment(null)}>Cerrar</Button>
             </div>
          </div>
        )}
      </PremiumModal>

      {/* Portfolio Slider/Lightbox - Custom fullscreen overlay */}
      {portfolioSlider.open && portfolios.length > 0 && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md" onClick={() => setPortfolioSlider({ open: false, index: 0 })}>
          {/* Close Button - Always visible at top right */}
          <button
            onClick={() => setPortfolioSlider({ open: false, index: 0 })}
            className="fixed top-6 right-6 z-[110] w-11 h-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Main content - prevent closing when clicking inside */}
          <div className="flex flex-col items-center max-w-4xl w-full px-4" onClick={e => e.stopPropagation()}>
            {/* Image */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-black/50 max-h-[60vh]">
              <img 
                src={portfolios[portfolioSlider.index]?.image_url} 
                alt={portfolios[portfolioSlider.index]?.title}
                className="w-full h-full max-h-[60vh] object-contain"
              />

              {/* Navigation Arrows */}
              {portfolios.length > 1 && (
                <>
                  <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/80 transition-colors border border-white/10"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/80 transition-colors border border-white/10"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Info Card */}
            <div className="mt-5 w-full max-w-lg mx-auto p-5 rounded-2xl bg-[#1a1a2e] border border-white/10 text-center">
              <h3 className="text-lg font-black text-white tracking-tight">
                {portfolios[portfolioSlider.index]?.title || 'Sin título'}
              </h3>
              {portfolios[portfolioSlider.index]?.description && (
                <p className="text-white/70 text-sm mt-1.5 font-medium">
                  {portfolios[portfolioSlider.index]?.description}
                </p>
              )}
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-3">
                {portfolioSlider.index + 1} de {portfolios.length}
              </p>
            </div>

            {/* Thumbnails */}
            {portfolios.length > 1 && (
              <div className="flex gap-2 mt-5 overflow-x-auto max-w-full pb-2 justify-center">
                {portfolios.map((item: any, idx: number) => (
                  <button
                    key={item.id}
                    onClick={() => setPortfolioSlider(prev => ({ ...prev, index: idx }))}
                    className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      idx === portfolioSlider.index 
                        ? 'border-primary opacity-100 scale-110' 
                        : 'border-white/10 opacity-50 hover:opacity-80'
                    }`}
                  >
                    <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
