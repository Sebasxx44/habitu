import { useTranslation } from "react-i18next";
import { LinkButtonTA } from "@/components/TA/LinkButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { useTodayOperations } from "@/modules/operations/composables/useTodayOperations";
import type { OperationsContext } from "@/modules/operations/types";

// COMPONENT
export const TodayOperationsTA = ({
  context,
}: {
  context: OperationsContext;
}) => {
  // COMPOSABLES
  const { t } = useTranslation("operations");
  const { attention, resources, actions } = useTodayOperations(context);
  // RENDER
  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        {t("asOf", {
          date: context.today.date,
          time: context.today.time.slice(0, 5),
          timezone: context.timezone,
        })}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["arrivals", "delayed", "unpaid", "recoverable"] as const).map(
          (kind) => (
            <PanelTA
              key={kind}
              title={t(kind)}
              description={
                kind === "recoverable" ? t("recheckAvailability") : undefined
              }
            >
              <div className="px-5 pb-5">
                <p className="text-3xl font-semibold">
                  {attention[kind].length}
                </p>
                {attention[kind].slice(0, 3).map((item) => (
                  <LinkButtonTA
                    key={item.id}
                    to={actions.agenda(item.branch_id, item.id)}
                    variant="ghost"
                    className="mt-2 h-auto w-full justify-start whitespace-normal text-left"
                  >
                    {item.start_time.slice(0, 5)} · {item.client_name} ·{" "}
                    {t("review")}
                  </LinkButtonTA>
                ))}
              </div>
            </PanelTA>
          ),
        )}
      </div>
      {context.today.unassigned > 0 && (
        <PanelTA title={t("unassigned")}>
          <div className="flex items-center justify-between px-5 pb-5">
            <span>{context.today.unassigned}</span>
            <LinkButtonTA to={actions.onDemand}>
              {t("reviewAssignments")}
            </LinkButtonTA>
          </div>
        </PanelTA>
      )}
      <PanelTA
        title={t("nextAppointments")}
        action={
          <LinkButtonTA variant="outline" to={actions.agenda()}>
            {t("openAgenda")}
          </LinkButtonTA>
        }
      >
        <div className="divide-y divide-border px-5 pb-5">
          {attention.next.length ? (
            attention.next.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-medium">
                    {item.start_time.slice(0, 5)} · {item.service_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.client_name} ·{" "}
                    {item.professional_name ??
                      item.resource_name ??
                      t("directBooking")}
                    {item.participants > 1
                      ? ` · ${t("participants", { count: item.participants })}`
                      : ""}
                  </p>
                </div>
                <LinkButtonTA
                  variant="outline"
                  to={actions.agenda(item.branch_id, item.id)}
                >
                  {t("openAttention")}
                </LinkButtonTA>
              </div>
            ))
          ) : (
            <p className="py-5 text-sm text-muted-foreground">
              {t("noAppointments")}
            </p>
          )}
        </div>
      </PanelTA>
      {resources.length > 0 && (
        <PanelTA
          title={t("resourceLoad")}
          description={t("resourceLoadDescription")}
        >
          <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="rounded-xl border border-border p-4"
              >
                <p className="font-medium">{resource.name}</p>
                <p className="text-sm text-muted-foreground">
                  {t("resourceReserved", {
                    minutes: resource.minutes,
                    count: resource.reservations,
                  })}
                </p>
                {!resource.active && (
                  <p className="text-sm text-destructive">{t("inactive")}</p>
                )}
              </div>
            ))}
          </div>
        </PanelTA>
      )}
    </div>
  );
};
