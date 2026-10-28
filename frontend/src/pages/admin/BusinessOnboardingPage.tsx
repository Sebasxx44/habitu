import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { BusinessCreateForm, BusinessCreatePayload, BusinessCreateResponse } from '@/modules/businesses/types'
import { httpService } from '@/services/auth/authService'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight, Building2, Scissors, Users, Clock, DollarSign, MapPin, PenTool, Sparkles, Droplets, Dumbbell, Goal, Music, Footprints, Gamepad2 } from 'lucide-react'
import { ButtonTA as Button } from '@/components/TA/ButtonTA'
import { InputTA as Input } from '@/components/TA/InputTA'
import { Textarea } from '@/components/ui/textarea'
import { businessService } from '@/services'
import { useBusinessCategories } from '@/hooks/useBusinessCategories'
import { useToast } from '@/components/ui/Toast'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Scissors, PenTool, Sparkles, Droplets, Dumbbell, Goal, Music, Footprints, Gamepad2
}

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
]

export const BusinessOnboardingPage = () => {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { categories } = useBusinessCategories()
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<BusinessCreateForm>({
    name: '',
    address: '',
    phone: '',
    email: '',
    description: '',
    category_id: null as number | null,
    primary_color: 'var(--habitu-primary)',
    logo_url: '',
    uses_professionals: true,
    uses_resources: false,
    services: [{ name: '', price: '', duration: '' }],
    professionals: [{ name: '', specialty: '' }],
    resources: [{ name: '', description: '', type: 'ROOM' }],
    schedule: {
      monday: { open: '09:00', close: '19:00', closed: false },
      tuesday: { open: '09:00', close: '19:00', closed: false },
      wednesday: { open: '09:00', close: '19:00', closed: false },
      thursday: { open: '09:00', close: '19:00', closed: false },
      friday: { open: '09:00', close: '19:00', closed: false },
      saturday: { open: '09:00', close: '17:00', closed: false },
      sunday: { open: '09:00', close: '17:00', closed: true },
    },
  })

  const selectedCategory = categories.find(c => c.id === form.category_id)

  const updateForm = <Key extends keyof BusinessCreateForm>(key: Key, value: BusinessCreateForm[Key]) => {
    setForm(previous => ({ ...previous, [key]: value }))
  }

  const updateSchedule = (day: string, changes: Partial<BusinessCreateForm['schedule'][string]>) => {
    setForm(previous => ({ ...previous, schedule: { ...previous.schedule, [day]: { ...previous.schedule[day], ...changes } } }))
  }

  // Build dynamic steps based on flags
  const baseSteps = [
    { id: 1, title: 'Categoría e Info', icon: Building2 },
    { id: 2, title: 'Servicios', icon: DollarSign },
  ]
  if (form.uses_professionals) baseSteps.push({ id: 3, title: 'Profesionales', icon: Users })
  if (form.uses_resources) baseSteps.push({ id: form.uses_professionals ? 4 : 3, title: 'Recursos', icon: MapPin })
  const scheduleStepId = baseSteps.length + 1
  baseSteps.push({ id: scheduleStepId, title: 'Horarios', icon: Clock })
  baseSteps.push({ id: scheduleStepId + 1, title: 'Finalizar', icon: Check })

  const totalSteps = baseSteps.length

  const handleFinish = async () => {
    if (saving || !form.category_id) return
    setSaving(true)
    try {
      const payload: BusinessCreatePayload = {
        name: form.name,
        address: form.address,
        phone: form.phone,
        email: form.email,
        description: form.description,
        business_category_id: form.category_id,
        primary_color: form.primary_color,
        logo_url: form.logo_url,
        uses_professionals: form.uses_professionals,
        uses_resources: form.uses_resources,
        services: form.services.filter(s => s.name),
        professionals: form.uses_professionals ? form.professionals.filter(p => p.name) : [],
        resources: form.uses_resources ? form.resources.filter(r => r.name) : [],
        schedule: form.schedule,
      }
      await httpService.post<BusinessCreateResponse>('/v2/businesses', payload)
      addToast('Negocio creado exitosamente', 'success')
      navigate('/admin/dashboard')
    } catch {
      addToast('Error al crear el negocio', 'error')
    } finally {
      setSaving(false)
    }
  }

  const renderStepContent = () => {
    // Step 1: Category + Basic Info
    if (currentStep === 1) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">¿Qué tipo de negocio eres?</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.icon || ''] || Building2
                const active = form.category_id === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => updateForm('category_id', cat.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 ${
                      active
                        ? 'bg-secondary border-primary text-primary'
                        : 'bg-card border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-bold text-center">{cat.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <h2 className="text-lg font-semibold">Datos básicos</h2>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Nombre del negocio *</label>
              <Input className="bg-card border-input text-foreground"
                value={form.name} onChange={e => updateForm('name', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Dirección</label>
              <Input className="bg-card border-input text-foreground"
                value={form.address} onChange={e => updateForm('address', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Teléfono</label>
                <Input className="bg-card border-input text-foreground"
                  value={form.phone} onChange={e => updateForm('phone', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
                <Input className="bg-card border-input text-foreground"
                  value={form.email} onChange={e => updateForm('email', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Descripción</label>
              <Textarea className="bg-card border-input text-foreground"
                value={form.description} onChange={e => updateForm('description', e.target.value)} />
            </div>

            {/* Logo URL */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">URL del logo</label>
              <Input className="bg-card border-input text-foreground"
                placeholder="https://..."
                value={form.logo_url} onChange={e => updateForm('logo_url', e.target.value)} />
              {form.logo_url && (
                <div className="mt-2">
                  <img src={form.logo_url} alt="Logo preview" className="w-16 h-16 rounded-xl object-cover border border-border" />
                </div>
              )}
            </div>

            {/* Primary Color */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Color principal del tema</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={e => updateForm('primary_color', e.target.value)}
                  className="w-10 h-10 rounded-lg bg-transparent border border-border cursor-pointer"
                />
                <Input className="bg-card border-input text-foreground flex-1"
                  value={form.primary_color} onChange={e => updateForm('primary_color', e.target.value)} />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground font-semibold">¿Cómo operas?</p>
              <label className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border cursor-pointer">
                <input type="checkbox" checked={form.uses_professionals}
                  onChange={e => updateForm('uses_professionals', e.target.checked)}
                  className="w-4 h-4 rounded accent-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Con profesionales</p>
                  <p className="text-xs text-muted-foreground">Clientes reservan con una persona específica</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border cursor-pointer">
                <input type="checkbox" checked={form.uses_resources}
                  onChange={e => updateForm('uses_resources', e.target.checked)}
                  className="w-4 h-4 rounded accent-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Con recursos/espacios</p>
                  <p className="text-xs text-muted-foreground">Clientes reservan un espacio o equipo (canchas, salas, máquinas)</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      )
    }

    // Step 2: Services
    if (currentStep === 2) {
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mb-4">Tus Servicios</h2>
          {form.services.map((svc, i) => (
            <div key={i} className="p-4 rounded-xl bg-card border border-border space-y-3">
              <Input className="bg-background border-input text-foreground" placeholder="Nombre del servicio"
                value={svc.name} onChange={e => {
                  const newServices = [...form.services]
                  newServices[i].name = e.target.value
                  updateForm('services', newServices)
                }} />
              <div className="grid grid-cols-2 gap-3">
                <Input className="bg-background border-input text-foreground" placeholder="Precio" type="number"
                  value={svc.price} onChange={e => {
                    const newServices = [...form.services]
                    newServices[i].price = e.target.value
                    updateForm('services', newServices)
                  }} />
                <Input className="bg-background border-input text-foreground" placeholder="Duración (min)" type="number"
                  value={svc.duration} onChange={e => {
                    const newServices = [...form.services]
                    newServices[i].duration = e.target.value
                    updateForm('services', newServices)
                  }} />
              </div>
            </div>
          ))}
          <Button variant="ghost" className="w-full rounded-xl text-primary"
            onClick={() => updateForm('services', [...form.services, { name: '', price: '', duration: '' }])}>
            + Agregar otro servicio
          </Button>
        </div>
      )
    }

    // Dynamic step 3: Professionals (if enabled)
    if (form.uses_professionals && currentStep === 3) {
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mb-4">Tu Equipo de Profesionales</h2>
          {form.professionals.map((prof, i) => (
            <div key={i} className="p-4 rounded-xl bg-card border border-border space-y-3">
              <Input className="bg-background border-input text-foreground" placeholder="Nombre del profesional"
                value={prof.name} onChange={e => {
                  const newProfs = [...form.professionals]
                  newProfs[i].name = e.target.value
                  updateForm('professionals', newProfs)
                }} />
              <Input className="bg-background border-input text-foreground" placeholder="Especialidad o rol"
                value={prof.specialty} onChange={e => {
                  const newProfs = [...form.professionals]
                  newProfs[i].specialty = e.target.value
                  updateForm('professionals', newProfs)
                }} />
            </div>
          ))}
          <Button variant="ghost" className="w-full rounded-xl text-primary"
            onClick={() => updateForm('professionals', [...form.professionals, { name: '', specialty: '' }])}>
            + Agregar otro profesional
          </Button>
        </div>
      )
    }

    // Dynamic step: Resources (if enabled)
    const resourceStepIndex = form.uses_professionals ? 4 : 3
    if (form.uses_resources && currentStep === resourceStepIndex) {
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mb-4">Tus Recursos / Espacios</h2>
          <p className="text-xs text-muted-foreground mb-2">
            Define los espacios o equipos que los clientes pueden reservar (canchas, salas, máquinas, camillas, etc.)
          </p>
          {form.resources.map((res, i) => (
            <div key={i} className="p-4 rounded-xl bg-card border border-border space-y-3">
              <Input className="bg-background border-input text-foreground" placeholder="Nombre del recurso (ej: Cancha 1)"
                value={res.name} onChange={e => {
                  const newRes = [...form.resources]
                  newRes[i].name = e.target.value
                  updateForm('resources', newRes)
                }} />
              <Input className="bg-background border-input text-foreground" placeholder="Descripción breve"
                value={res.description} onChange={e => {
                  const newRes = [...form.resources]
                  newRes[i].description = e.target.value
                  updateForm('resources', newRes)
                }} />
              <select
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                value={res.type}
                onChange={e => {
                  const newRes = [...form.resources]
                  newRes[i].type = e.target.value
                  updateForm('resources', newRes)
                }}
              >
                <option value="ROOM">Sala / Cuarto</option>
                <option value="SPACE">Espacio abierto</option>
                <option value="COURT">Cancha</option>
                <option value="STATION">Estación / Puesto</option>
                <option value="TABLE">Mesa</option>
                <option value="EQUIPMENT">Equipo / Máquina</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
          ))}
          <Button variant="ghost" className="w-full rounded-xl text-primary"
            onClick={() => updateForm('resources', [...form.resources, { name: '', description: '', type: 'ROOM' }])}>
            + Agregar otro recurso
          </Button>
        </div>
      )
    }

    // Schedule step
    if (currentStep === scheduleStepId) {
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mb-4">Horarios de Atención</h2>
          {DAYS.map(({ key, label }) => {
            const hours = form.schedule[key]
            return (
              <div key={key} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={!hours.closed}
                    onChange={e => updateSchedule(key, { closed: !e.target.checked })}
                    className="w-4 h-4 rounded accent-primary" />
                  <span className="text-sm capitalize">{label}</span>
                </div>
                {!hours.closed && (
                  <div className="flex items-center gap-2">
                    <input type="time" value={hours.open}
                      onChange={e => updateSchedule(key, { open: e.target.value })}
                      className="bg-background border border-border rounded-lg px-2 py-1 text-sm text-foreground" />
                    <span className="text-muted-foreground">-</span>
                    <input type="time" value={hours.close}
                      onChange={e => updateSchedule(key, { close: e.target.value })}
                      className="bg-background border border-border rounded-lg px-2 py-1 text-sm text-foreground" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    // Final step
    if (currentStep === scheduleStepId + 1) {
      return (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">¡Todo listo!</h2>
          <p className="text-sm text-muted-foreground">Tu negocio está configurado y listo para recibir clientes.</p>
          <div className="p-4 rounded-xl bg-card border border-border text-left space-y-2">
            <p className="text-sm"><strong>Negocio:</strong> {form.name || 'Sin nombre'}</p>
            <p className="text-sm"><strong>Categoría:</strong> {selectedCategory?.name || 'Sin categoría'}</p>
            <p className="text-sm"><strong>Servicios:</strong> {form.services.filter(s => s.name).length}</p>
            {form.uses_professionals && <p className="text-sm"><strong>Profesionales:</strong> {form.professionals.filter(p => p.name).length}</p>}
            {form.uses_resources && <p className="text-sm"><strong>Recursos:</strong> {form.resources.filter(r => r.name).length}</p>}
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Configura tu Negocio</h1>
          <p className="text-sm text-muted-foreground">Paso {currentStep} de {totalSteps}</p>
        </div>

        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2 mb-8">
          {baseSteps.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                step.id <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              }`}>
                <step.icon className="w-5 h-5" />
              </div>
              {i < baseSteps.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${step.id < currentStep ? 'bg-primary' : 'bg-secondary'}`} />
              )}
            </div>
          ))}
        </div>

        {renderStepContent()}

        <div className="flex justify-between mt-8">
          {currentStep > 1 && (
            <Button variant="ghost" className="rounded-xl text-muted-foreground" onClick={() => setCurrentStep(s => s - 1)}>
              Atrás
            </Button>
          )}
          {currentStep < totalSteps ? (
            <Button className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground ml-auto"
              onClick={() => setCurrentStep(s => s + 1)}>
              Siguiente <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground ml-auto" onClick={handleFinish} disabled={saving}>
              {saving ? 'Guardando...' : 'Ir al Dashboard'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
