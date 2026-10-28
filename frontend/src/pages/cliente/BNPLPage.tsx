import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { bnplService } from '@/services/finance/bnplService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CreditCard, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react'

export function BNPLPage() {
  const realtimeRevision = useRealtimeRevision(["wallet"]);
  const navigate = useNavigate()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [realtimeRevision])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await bnplService.getMyApplications()
      setApplications(Array.isArray(res) ? res : [])
    } catch {
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-500/10 text-emerald-500'
      case 'PENDING': return 'bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200'
      case 'COMPLETED': return 'bg-primary/10 text-primary'
      case 'REJECTED': return 'bg-destructive/10 text-destructive'
      default: return 'bg-secondary text-secondary-foreground'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="w-3.5 h-3.5" />
      case 'PENDING': return <Clock className="w-3.5 h-3.5" />
      case 'COMPLETED': return <CheckCircle className="w-3.5 h-3.5" />
      case 'REJECTED': return <AlertCircle className="w-3.5 h-3.5" />
      default: return <Clock className="w-3.5 h-3.5" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cliente/dashboard')} className="rounded-xl">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Paga Después</h1>
          <p className="text-sm text-muted-foreground">Gestiona tus pagos diferidos y cuotas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {applications.map(app => (
          <Card key={app.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Solicitud #{app.id}</CardTitle>
                <p className="text-xs text-muted-foreground">Cita #{app.appointment_id}</p>
              </div>
              <Badge className={getStatusColor(app.status)}>
                <span className="flex items-center gap-1">
                  {getStatusIcon(app.status)}
                  {app.status}
                </span>
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Monto total</span>
                <span className="font-bold">${parseFloat(app.total_amount).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cuotas</span>
                <span className="font-medium">{app.installments_count}x sin interés</span>
              </div>
              {app.provider !== 'INTERNAL' && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Proveedor</span>
                  <span className="font-medium">{app.provider}</span>
                </div>
              )}

              {app.installments && app.installments.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cuotas</p>
                  {app.installments.map((inst: any) => (
                    <div key={inst.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Cuota {inst.installment_number}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">${parseFloat(inst.amount).toLocaleString()}</span>
                        <Badge variant={inst.status === 'PAID' ? 'default' : 'outline'} className="text-[10px]">
                          {inst.status === 'PAID' ? 'Pagada' : 'Pendiente'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {applications.length === 0 && !loading && (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">No tienes pagos diferidos</p>
                  <p className="text-sm text-muted-foreground">Al agendar una cita, podrás elegir pagar en cuotas.</p>
                </div>
                <Button onClick={() => navigate('/cliente/explore')} className="rounded-xl bg-primary">Explorar Servicios</Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
