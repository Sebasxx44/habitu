import type { SubscriptionPlan } from '@/services/subscriptions/subscriptionService'
import { cn } from '@/lib/utils'
import { ButtonTA as Button } from '@/components/TA/ButtonTA'
import { Badge } from '@/components/ui/badge'
import { Check, Sparkles } from 'lucide-react'
import { formatCurrency } from '@/utils/dateUtils'

interface PlanCardProps {
  plan: SubscriptionPlan
  isCurrent?: boolean
  onSubscribe: (planId: number) => void
  subscribing?: boolean
}

export const PlanCard = ({ plan, isCurrent = false, onSubscribe, subscribing = false }: PlanCardProps) => {
  const features: string[] = Array.isArray(plan?.features)
    ? plan.features
    : plan?.features
    ? String(plan.features).split(',').map((f: string) => f.trim())
    : []

  return (
    <div
      className={cn(
        'relative flex flex-col gap-6 overflow-hidden rounded-3xl bg-card p-5 sm:p-8 text-sm text-card-foreground ring-1 transition-all duration-300',
        isCurrent
          ? 'ring-primary shadow-xl shadow-primary/10 scale-[1.01]'
          : 'ring-foreground/10 hover:shadow-md hover:ring-foreground/20'
      )}
    >
      {isCurrent && (
        <div className="absolute top-0 right-0 left-0 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-[0.2em] text-center py-2">
          Plan actual
        </div>
      )}

      <div className={cn('space-y-4', isCurrent && 'pt-6')}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xl font-bold tracking-tight">{plan?.name}</h3>
            <p className="text-xs text-muted-foreground font-medium line-clamp-2">
              {plan?.description || `${plan?.credits_per_cycle || 0} créditos por ciclo`}
            </p>
          </div>
          {isCurrent && (
            <Badge className="bg-primary/10 text-primary border-none rounded-lg text-[10px] font-bold uppercase tracking-widest px-2.5 py-1">
              Activo
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-4xl font-bold tracking-tight text-primary">
            {formatCurrency(Number(plan?.price))}
          </span>
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
            / {plan?.billing_cycle || 'mes'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          {plan?.credits_per_cycle || 0} créditos incluidos
        </div>
      </div>

      <div className="flex-1">
        <div className="space-y-3">
          {features.length > 0 ? (
            features.map((feature: string, idx: number) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{feature}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground font-medium">
              Incluye beneficios del plan {plan?.name}
            </p>
          )}
        </div>
      </div>

      <Button
        onClick={() => onSubscribe(plan?.id)}
        disabled={isCurrent || subscribing}
        className={cn(
          'w-full h-12 rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all',
          isCurrent
            ? 'bg-secondary text-muted-foreground cursor-not-allowed'
            : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/10'
        )}
      >
        {subscribing ? 'Procesando...' : isCurrent ? 'Plan activo' : 'Suscribirse'}
      </Button>
    </div>
  )
}
