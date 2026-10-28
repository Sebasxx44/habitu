import {
  CircleDot,
  Scissors,
  Sparkles,
  Flower2,
  Dumbbell,
  HeartPulse,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DiscoveryFilterChange } from "@/modules/discovery/searchTypes";

// COMPONENT
export const DiscoveryIntentsTA = ({
  onChoose,
}: {
  onChoose: (filters: DiscoveryFilterChange) => void;
}) => {
  const { t } = useTranslation("marketplace");
  const activities = [
    { key: "football", query: "fútbol", icon: CircleDot },
    { key: "haircut", query: "corte", icon: Scissors },
    { key: "manicure", query: "manicure", icon: Sparkles },
    { key: "massage", query: "masaje", icon: Flower2 },
    { key: "workout", query: "entrenamiento", icon: Dumbbell },
    { key: "dental", query: "dental", icon: HeartPulse },
  ];
  return (
    <section aria-labelledby="discovery-intents-title">
      <h2 id="discovery-intents-title" className="mb-4 text-sm font-semibold">
        {t("discovery.intent")}
      </h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {activities.map(({ key, query, icon: Icon }) => (
          <button
            key={key}
            onClick={() =>
              onChoose({
                q: query,
                category_id: "",
                service_id: "",
                professional_id: "",
                resource_id: "",
                page: "1",
              })
            }
            className="flex min-h-24 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card px-2 py-3 text-center text-xs font-medium transition-colors hover:border-primary/40 hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Icon
              className="size-6 stroke-[1.4] text-primary"
              aria-hidden="true"
            />
            {t(`discovery.${key}`)}
          </button>
        ))}
      </div>
    </section>
  );
};
