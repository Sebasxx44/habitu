import {
  CalendarDays,
  MapPin,
  Tag,
  CircleDot,
  Sparkles,
  Flower2,
  RotateCcw,
  CalendarCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  conciergeIntents,
  type ConciergeIntent,
} from "@/modules/assistant/config";
import { cn } from "@/lib/utils";
import { ButtonTA } from "@/components/TA/ButtonTA";

// COMPONENT
export const ConciergeQuickActionsTA = ({
  onChoose,
  disabled = false,
  compact = false,
}: {
  onChoose: (intent: ConciergeIntent) => void;
  disabled?: boolean;
  compact?: boolean;
}) => {
  const { t } = useTranslation("marketplace");
  const icons = {
    today: CalendarDays,
    nearby: MapPin,
    promotions: Tag,
    football: CircleDot,
    beauty: Sparkles,
    wellness: Flower2,
    repeat: RotateCcw,
    appointments: CalendarCheck,
  };
  return (
    <div className={cn("grid grid-cols-2 gap-2", !compact && "sm:grid-cols-4")}>
      {conciergeIntents.map((intent) => {
        const Icon = icons[intent];
        return (
          <ButtonTA
            variant="outline"
            type="button"
            key={intent}
            disabled={disabled}
            onClick={() => onChoose(intent)}
            className={cn(
              "flex min-h-12 min-w-0 justify-start items-center gap-2 whitespace-normal rounded-xl border border-border bg-card p-3 text-left text-sm font-medium transition-colors hover:border-primary/40 hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50",
              !compact && "sm:flex-col sm:items-start sm:gap-3 sm:p-4",
            )}
          >
            <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {t(`concierge.${intent}`)}
          </ButtonTA>
        );
      })}
    </div>
  );
};
