import { CalendarDays, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatTime } from '@/utils/dateUtils'

export function AppointmentCard({ appt, onReschedule, onCancel }: { appt: any; onReschedule: () => void; onCancel: () => void }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Próxima cita</CardTitle>
          <Badge variant="secondary">{appt.status === 'CONFIRMADA' ? 'Confirmada' : 'Pendiente'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-lg font-semibold">{appt.service?.name}</p>
          <p className="text-sm text-muted-foreground">{appt.barber?.name}</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" />
            {formatDate(appt.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {formatTime(appt.time)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" />
          {appt.barberShop?.name}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onReschedule}>Ver detalle</Button>
        <Button variant="ghost" size="sm" className="flex-1" onClick={onReschedule}>Reagendar</Button>
      </CardFooter>
    </Card>
  )
}

export function EmptyAppointmentCard({ onBook }: { onBook: () => void }) {
  return (
    <Card>
      <CardContent className="pt-6 pb-4 text-center space-y-3">
        <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto" />
        <div>
          <p className="text-sm font-medium">No tienes citas pendientes</p>
          <p className="text-xs text-muted-foreground">Agenda tu próximo corte</p>
        </div>
        <Button onClick={onBook} className="w-full">Agendar cita</Button>
      </CardContent>
    </Card>
  )
}


