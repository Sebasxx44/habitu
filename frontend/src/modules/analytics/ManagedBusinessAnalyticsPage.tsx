import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { StateTA } from "@/components/TA/StateTA";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsBusinesses } from "@/modules/analytics/composables/useAnalyticsBusinesses";
import {
  AnalyticsPage,
  PlatformAnalyticsPage,
} from "@/modules/analytics/AnalyticsPage";

// COMPONENTS
const OwnedBusinessAnalytics = () => {
  const { t } = useTranslation("analytics");
  const { user } = useAuth();
  const { businesses, selection } = useAnalyticsBusinesses(
    user?.barber_shop_id,
  );
  if (businesses.loading)
    return (
      <div role="status" aria-label={t("loading")}>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  if (businesses.failed || selection.id === null)
    return (
      <div className="space-y-6">
        <ActionHeaderTA
          title={t("businessTitle")}
          description={t("businessDescription")}
        />
        <StateTA
          error={businesses.failed}
          title={t(businesses.failed ? "loadError" : "empty")}
          description={t("emptyDescription")}
        />
      </div>
    );
  return (
    <div className="space-y-5">
      {businesses.items.length > 1 && (
        <label className="flex flex-wrap items-center gap-3 text-sm">
          <span>{t("business")}</span>
          <select
            className="min-h-11 max-w-full rounded-xl border border-input bg-background px-3"
            value={selection.id}
            onChange={(event) => selection.select(Number(event.target.value))}
          >
            {businesses.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <AnalyticsPage key={selection.id} businessId={selection.id} />
    </div>
  );
};
export const ManagedBusinessAnalyticsPage = () => {
  const { user } = useAuth();
  return user?.role === "SUPERADMIN" ? (
    <PlatformAnalyticsPage />
  ) : (
    <OwnedBusinessAnalytics />
  );
};
