import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useState, useCallback, useRef } from 'react'
import { subscriptionService, type SubscriptionPlan, type SubscriptionUsage, type UserSubscription } from '@/services/subscriptions/subscriptionService'
import { isAxiosError } from 'axios'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
} from '@/components/ui/progress'
import {
  Crown,
  ChevronDown,
  ChevronUp,
  Zap,
  CalendarDays,
  History,
  Sparkles,
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/utils/dateUtils'
import { PlanCard } from '@/components/subscriptions/PlanCard'

export const SubscriptionsPage = () => {
  const realtimeRevision = useRealtimeRevision(["benefits"]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [mySubscription, setMySubscription] = useState<UserSubscription | null>(null)
  const [usageHistory, setUsageHistory] = useState<SubscriptionUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribingId, setSubscribingId] = useState<number | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const { addToast } = useToast()
  const operationKeys = useRef(new Map<number, string>())
  const submitting = useRef(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [plansData, subData, usageData] = await Promise.all([
        subscriptionService.getPlans(),
        subscriptionService.getMySubscription().catch(error => { if (isAxiosError(error) && error.response?.status === 404) return null; throw error }),
        subscriptionService.getUsageHistory().catch(error => { if (isAxiosError(error) && error.response?.status === 404) return []; throw error }),
      ])
      setPlans(plansData)
      setMySubscription(subData)
      setUsageHistory(usageData)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Error al cargar suscripciones', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchData()
  }, [fetchData, realtimeRevision])

  const handleSubscribe = async (planId: number) => {
    if (submitting.current) return
    submitting.current = true
    setSubscribingId(planId)
    try {
      const key = operationKeys.current.get(planId) ?? crypto.randomUUID()
      operationKeys.current.set(planId, key)
      await subscriptionService.subscribe(planId, key)
      operationKeys.current.delete(planId)
      addToast('Suscripción exitosa', 'success')
      await fetchData()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Error al suscribirse', 'error')
    } finally {
      submitting.current = false
      setSubscribingId(null)
    }
  }

  const isActive = mySubscription?.status === 'ACTIVE'
  const totalCredits = mySubscription?.plan?.credits_per_cycle || 0
  const remainingCredits = mySubscription?.credits_remaining || 0
  const progressPercent = totalCredits > 0 ? ((totalCredits - remainingCredits) / totalCredits) * 100 : 0

  if (loading) {
    return <SubscriptionsSkeleton />
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tighter text-foreground flex items-center gap-3">
          <Crown className="w-8 h-8 text-[var(--habitu-primary)]" />
          Suscripciones
        </h1>
        <p className="text-muted-foreground text-lg font-medium max-w-md leading-relaxed">
          Los planes de pago se cobran una sola vez a tu billetera. Sin renovación automática.
        </p>
      </div>

      {/* Active Subscription */}
      {isActive ? (
        <Card className="rounded-[2.5rem] border border-[var(--habitu-primary)]/30 shadow-xl shadow-habitu-primary/10 overflow-hidden">
          <CardContent className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[1.5rem] bg-[var(--habitu-primary)]/10 flex items-center justify-center text-[var(--habitu-primary)] shrink-0">
                  <Zap className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black tracking-tight">
                      {mySubscription?.plan?.name}
                    </h2>
                    <span className="bg-[var(--habitu-primary)] text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full">
                      Activo
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Renovación: {formatDate(mySubscription?.ends_at)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-[var(--habitu-primary)]">
                  {remainingCredits}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Créditos restantes
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Progress value={progressPercent}>
                <div className="flex items-center justify-between w-full">
                  <ProgressLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Uso del ciclo
                  </ProgressLabel>
                  <ProgressValue className="text-[10px] font-black uppercase tracking-widest text-foreground">
                    {() => `${Math.round(progressPercent)}%`}
                  </ProgressValue>
                </div>
                <ProgressTrack className="h-3 bg-secondary rounded-full">
                  <ProgressIndicator
                    className="bg-[var(--habitu-primary)] rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </ProgressTrack>
              </Progress>
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>{totalCredits - remainingCredits} usados</span>
                <span>{remainingCredits} disponibles</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[var(--habitu-primary)]/10 to-habitu-border/30 border border-[var(--habitu-primary)]/20 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-[1.5rem] bg-[var(--habitu-primary)] flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-xl font-black tracking-tight">
                Aún no tienes una suscripción activa
              </h3>
              <p className="text-xs text-muted-foreground font-medium">
                Suscríbete a un plan y empieza a ahorrar en cada cita con créditos mensuales.
              </p>
            </div>
          </div>
          <Button
            className="h-14 bg-[var(--habitu-primary)] hover:bg-[var(--habitu-primary-dark)] text-white rounded-[1.5rem] px-8 font-black uppercase tracking-widest text-[11px] shadow-md shadow-habitu-primary/10 shrink-0"
            onClick={() => {
              const el = document.getElementById('plans-grid')
              el?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            Ver planes
          </Button>
        </div>
      )}

      {/* Plans Grid */}
      <div id="plans-grid" className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-2xl font-black tracking-tight">Planes disponibles</h3>
          <p className="text-xs text-muted-foreground font-medium">
            {plans.length} plan{plans.length !== 1 ? 'es' : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map((plan: any) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={isActive && mySubscription?.plan_id === plan.id}
              onSubscribe={handleSubscribe}
              subscribing={subscribingId === plan.id}
            />
          ))}
        </div>
      </div>

      {/* Usage History */}
      {usageHistory.length > 0 && (
        <div className="space-y-4">
          <button
            onClick={() => setShowHistory((prev) => !prev)}
            className="flex items-center gap-3 group"
          >
            <History className="w-5 h-5 text-[var(--habitu-primary)]" />
            <h3 className="text-xl font-black tracking-tight">Historial de uso</h3>
            {showHistory ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
          </button>

          {showHistory && (
            <Card className="rounded-[2.5rem] border border-border/50 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <CardContent className="p-8">
                <div className="space-y-1">
                  {usageHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted/50 transition-all duration-300"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[var(--habitu-primary)]/10 flex items-center justify-center shrink-0">
                        <CalendarDays className="w-5 h-5 text-[var(--habitu-primary)]" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-sm font-bold truncate">
                          {item?.description || 'Uso de suscripción'}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black tabular-nums">
                          -{item?.credits_used || 1} crédito
                          {item?.credits_used !== 1 ? 's' : ''}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                          {'Consumo registrado'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function SubscriptionsSkeleton() {
  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <Skeleton className="h-12 w-72 rounded-xl" />
        <Skeleton className="h-6 w-96 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-[2.5rem]" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[420px] rounded-[2.5rem]" />
        ))}
      </div>
    </div>
  )
}
