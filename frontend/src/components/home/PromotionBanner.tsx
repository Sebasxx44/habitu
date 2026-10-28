import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/Toast'
import { Copy, Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Promotion {
  id: number
  code: string
  discount_value: number
  description: string
  end_date?: string
  type?: 'PORCENTAJE' | 'FIJO'
  [key: string]: any
}

interface PromotionBannerProps {
  promotions: Promotion[]
}

function useCountdown(endDate?: string) {
  const calculateTimeLeft = useCallback(() => {
    if (!endDate) return null
    const difference = new Date(endDate).getTime() - Date.now()
    if (difference <= 0)
      return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 }
    return {
      expired: false,
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    }
  }, [endDate])

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft)

  useEffect(() => {
    if (!endDate) return
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)
    return () => clearInterval(timer)
  }, [endDate, calculateTimeLeft])

  return timeLeft
}

function Countdown({ endDate }: { endDate?: string }) {
  const timeLeft = useCountdown(endDate)
  if (!timeLeft) return null
  if (timeLeft.expired)
    return <span className="text-[10px] text-destructive font-medium">Expirado</span>

  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <span className="text-[10px] text-muted-foreground font-mono">
      {timeLeft.days > 0 && `${timeLeft.days}d `}
      {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
    </span>
  )
}

export function PromotionBanner({ promotions }: PromotionBannerProps) {
  const { addToast } = useToast()
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const handleCopy = (code: string, id: number) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    addToast('Código copiado', 'success')
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (!promotions || promotions.length === 0) return null

  return (
    <div className="w-full">
      <div
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-4 px-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {promotions.map((promo) => (
          <div
            key={promo.id}
            className="snap-start shrink-0 w-72 bg-card border border-border rounded-2xl p-4 space-y-3 hover:border-[#D4AF37]/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <Badge className="bg-[#D4AF37] text-black hover:bg-[#B8962E] border-0">
                {promo.discount_value}
                {promo.type === 'FIJO' ? '$' : '%'} OFF
              </Badge>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <Countdown endDate={promo.end_date} />
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Código
              </p>
              <p className="text-lg font-bold text-[#D4AF37] font-mono tracking-wide">
                {promo.code}
              </p>
            </div>

            <p className="text-sm text-foreground line-clamp-2">
              {promo.description}
            </p>

            <Button
              onClick={() => handleCopy(promo.code, promo.id)}
              variant="outline"
              className={cn(
                'w-full h-9 text-xs font-semibold transition-all',
                copiedId === promo.id
                  ? 'border-green-500 text-green-500'
                  : 'border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]'
              )}
            >
              {copiedId === promo.id ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copiar código
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
