import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: { value: number; label: string; isPositive: boolean }
  className?: string
}

export const StatsCard = ({ title, value, subtitle, icon: Icon, trend, className }: StatsCardProps) => {
  return (
    <Card className={cn("stat-card overflow-hidden border border-primary/15 shadow-sm transition-shadow duration-200", className)} size="sm">
      <div className="flex items-center justify-between px-4 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-habitu-muted">{title}</p>
        <div className="rounded-xl bg-habitu-blue p-2 shadow-sm shadow-habitu-blue/20">
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <CardContent className="pb-4 pt-1">
        <div className="text-2xl font-bold tabular-nums tracking-tight text-habitu-ink">{value}</div>
        {(subtitle || trend) && (
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {trend && (
              <span className={cn(
                "flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full",
                trend.isPositive ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
              )}>
                {trend.isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {trend.value}%
              </span>
            )}
            {subtitle && <p className="text-xs text-habitu-muted truncate">{subtitle}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
