import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function MetricCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 h-[130px] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <div>
        <Skeleton className="h-8 w-16 mb-2 rounded-md" />
        <Skeleton className="h-3 w-32 rounded-sm" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="border-b border-border p-4 flex gap-4 bg-muted/20">
        {Array(columns).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-4 w-24 rounded-sm flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border/50">
        {Array(rows).fill(0).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 rounded-sm" />
                <Skeleton className="h-3 w-24 rounded-sm" />
              </div>
            </div>
            {Array(columns - 1).fill(0).map((_, j) => (
              <Skeleton key={j} className="h-4 w-24 rounded-sm flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartSkeleton({ height = 300 }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-6 flex flex-col gap-4" style={{ height: `${height}px` }}>
      <Skeleton className="h-6 w-48 rounded-md" />
      <div className="flex-1 w-full flex items-end gap-2">
        {Array(12).fill(0).map((_, i) => (
          <Skeleton key={i} className="w-full rounded-t-sm" style={{ height: `${[38, 62, 44, 76, 53, 88, 65, 48, 72, 56, 82, 68][i]}%` }} />
        ))}
      </div>
    </div>
  )
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 rounded-md" />
        <Skeleton className="h-4 w-48 rounded-sm" />
      </div>
      <Skeleton className="h-10 w-36 rounded-xl" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartSkeleton height={400} />
        </div>
        <div className="lg:col-span-1">
          <ChartSkeleton height={400} />
        </div>
      </div>
    </div>
  )
}

export function BarberShopsSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card border border-border">
        <Skeleton className="h-9 flex-1 min-w-[200px] rounded-xl" />
        <Skeleton className="h-9 w-40 rounded-xl" />
        <Skeleton className="h-9 w-40 rounded-xl" />
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>
      <TableSkeleton rows={8} columns={5} />
    </div>
  )
}

export function UserPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card border border-border">
        <Skeleton className="h-9 flex-1 min-w-[200px] rounded-xl" />
        <Skeleton className="h-9 w-48 rounded-xl" />
      </div>
      <TableSkeleton rows={10} columns={4} />
    </div>
  )
}
