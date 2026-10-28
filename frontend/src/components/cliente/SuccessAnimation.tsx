import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Calendar, MapPin, User, Scissors, Share2, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatTime, formatCurrency } from '@/utils/dateUtils'

export function SuccessAnimation({ appointment, onHome }: { appointment: any; onHome: () => void }) {
  const [visible, setVisible] = useState(false)
  const navigate = useNavigate()
  const { addToast } = useToast()

  useEffect(() => { const t = setTimeout(() => setVisible(true), 100); return () => clearTimeout(t) }, [])

  const shareWhatsApp = () => {
    const msg = `Reserva confirmada ✂️\n\n${appointment.service?.name}\n${formatDate(appointment.date)} a las ${formatTime(appointment.time)}\nCon: ${appointment.barber?.name}\nEn: ${appointment.barberShop?.name || 'Tu barbería'}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const addToCalendar = () => {
    try {
      const parts = String(appointment.time || '09:00').split(':')
      const hours = String(parts[0] || '09').padStart(2, '0')
      const minutes = String(parts[1] || '00').padStart(2, '0')
      const seconds = String(parts[2] || '00').padStart(2, '0')
      const normalizedTime = `${hours}:${minutes}:${seconds}`
      const rawDate = appointment.date
      if (!rawDate) { addToast('Fecha no disponible', 'error'); return }
      const start = new Date(`${rawDate}T${normalizedTime}`)
      if (isNaN(start.getTime())) { addToast('No se pudo generar el calendario', 'error'); return }
      const duration = appointment.service?.duration_minutes || appointment.service?.duration || 30
      const end = new Date(start.getTime() + Number(duration) * 60000)
      const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
        `&text=${encodeURIComponent(appointment.service?.name || 'Cita')}` +
        `&dates=${fmt(start)}/${fmt(end)}` +
        `&details=${encodeURIComponent(`Cita en ${appointment.barberShop?.name || 'Tu barbería'} con ${appointment.barber?.name || 'tu barbero'}`)}` +
        `&location=${encodeURIComponent(appointment.barberShop?.address || '')}`
      window.open(url, '_blank')
    } catch { addToast('Error al generar calendario', 'error') }
  }

  const viewLocation = () => {
    const shopId = appointment.barber_shop_id || appointment.barberShop?.id
    if (shopId) navigate(`/cliente/shop/${shopId}`)
    else addToast('Ubicación no disponible', 'error')
  }

  return (
    <div className={`text-center space-y-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="w-20 h-20 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto ring-4 ring-amber-500/5">
        <CheckCircle2 className="w-10 h-10 text-amber-500" />
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-1">Reserva confirmada</h2>
        <p className="text-sm text-muted-foreground">Te esperamos puntual</p>
      </div>

      <div className="rounded-2xl bg-card border border-border p-5 text-left space-y-3 shadow-sm">
        {[
          { icon: Scissors, label: 'Servicio', value: appointment.service?.name },
          { icon: User, label: 'Barbero', value: appointment.barber?.name },
          { icon: Calendar, label: 'Fecha y hora', value: `${formatDate(appointment.date)} · ${formatTime(appointment.time)}` },
          { icon: MapPin, label: 'Ubicación', value: appointment.barberShop?.name || 'Tu barbería' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <item.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className="text-sm font-semibold">{item.value}</p>
            </div>
          </div>
        ))}
        <div className="pt-3 border-t border-border flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-xl font-bold text-amber-500">{formatCurrency(appointment.price)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Button variant="outline" className="w-full h-11 gap-2 border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400" onClick={addToCalendar}>
          <Calendar className="w-4 h-4" /> Añadir a calendario
        </Button>
        <Button variant="outline" className="w-full h-11 gap-2" onClick={shareWhatsApp}>
          <Share2 className="w-4 h-4" /> Compartir por WhatsApp
        </Button>
        <Button variant="outline" className="w-full h-11 gap-2" onClick={viewLocation}>
          <Navigation className="w-4 h-4" /> Ver ubicación
        </Button>
      </div>

      <Button onClick={onHome} className="w-full h-11 bg-amber-600 hover:bg-amber-500 text-white">Volver al inicio</Button>
    </div>
  )
}
