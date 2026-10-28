import { cn } from "@/lib/utils"

const Skeleton = ({ className, ...props }: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="skeleton"
      className={cn("skeleton-shimmer rounded-2xl bg-primary/10", className)}
      aria-hidden="true"
      {...props}
    />
  )
}

export { Skeleton }
