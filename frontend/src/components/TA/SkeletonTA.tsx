import { useReducedMotion } from "framer-motion";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import { cn } from "@/lib/utils";

// TYPES
interface SkeletonTAProps {
  variant?: "text" | "card" | "list" | "dashboard";
  count?: number;
  label?: string;
  className?: string;
}

// COMPONENTS
const SkeletonCardTA = () => (
  <div className="surface-card space-y-4 p-5">
    <div className="flex items-center justify-between gap-4">
      <Skeleton width={44} height={44} borderRadius={14} />
      <Skeleton width={56} height={22} borderRadius={20} />
    </div>
    <Skeleton width="66%" height={24} />
    <Skeleton count={2} height={12} />
    <Skeleton height={38} borderRadius={12} />
  </div>
);

const SkeletonListTA = ({ count }: { count: number }) => (
  <div className="surface-card divide-y divide-border px-5">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="flex items-center gap-4 py-5">
        <Skeleton width={44} height={44} borderRadius={14} />
        <div className="min-w-0 flex-1 space-y-1">
          <Skeleton width={`${72 - (index % 3) * 12}%`} height={14} />
          <Skeleton width="45%" height={10} />
        </div>
        <div className="hidden sm:block">
          <Skeleton width={72} height={28} borderRadius={20} />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonTA = ({
  variant = "list",
  count = 3,
  label = "Cargando contenido…",
  className,
}: SkeletonTAProps) => {
  // COMPOSABLES
  const reduceMotion = useReducedMotion();

  // RENDER
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn("ta-skeleton", className)}
    >
      <span className="sr-only">{label}</span>
      <SkeletonTheme
        baseColor="hsl(var(--primary) / 0.07)"
        highlightColor="hsl(var(--primary) / 0.015)"
        borderRadius={8}
        duration={1.8}
        enableAnimation={!reduceMotion}
      >
        <div aria-hidden="true">
          {variant === "text" && <Skeleton count={count} height={14} />}
          {variant === "list" && <SkeletonListTA count={count} />}
          {variant === "card" && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: count }, (_, index) => (
                <SkeletonCardTA key={index} />
              ))}
            </div>
          )}
          {variant === "dashboard" && (
            <div className="space-y-6">
              <div className="surface-card space-y-4 border-primary/10 bg-primary/5 p-6 sm:p-8">
                <Skeleton width={104} height={24} borderRadius={20} />
                <Skeleton width="65%" height={34} />
                <Skeleton width="85%" height={14} />
                <Skeleton width={148} height={40} borderRadius={12} />
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="surface-card space-y-3 p-5">
                    <Skeleton width={36} height={36} borderRadius={12} />
                    <Skeleton width="70%" height={12} />
                    <Skeleton width="55%" height={28} />
                  </div>
                ))}
              </div>
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <SkeletonListTA count={4} />
                </div>
                <SkeletonCardTA />
              </div>
            </div>
          )}
        </div>
      </SkeletonTheme>
    </div>
  );
};
