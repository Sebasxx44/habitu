import { PaymentPolicyEditorTA } from "@/modules/checkout/PaymentPolicyEditorTA";
import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { StateTA } from "@/components/TA/StateTA";
import { useOperationsContext } from "@/modules/operations/composables/useOperationsContext";
import { OperationSelectTA } from "@/modules/operations/components/OperationFieldsTA";
import { ProfessionalScheduleTA } from "@/modules/operations/components/ProfessionalScheduleTA";
import { OperationalBlocksTA } from "@/modules/operations/components/OperationalBlocksTA";
import { ResourceOperationsTA } from "@/modules/operations/components/ResourceOperationsTA";
import { TodayOperationsTA } from "@/modules/operations/components/TodayOperationsTA";

// COMPONENT
export const OperationsPage = ({
  professionalId,
}: {
  professionalId?: number;
}) => {
  // COMPOSABLES
  const { t } = useTranslation("operations");
  const { data, request, selection } = useOperationsContext();
  // STATE
  const [tab, setTab] = useState(professionalId ? "availability" : "today");
  // RENDER
  return (
    <div className="space-y-6 pb-8">
      <ActionHeaderTA
        icon={CalendarClock}
        title={t("title")}
        description={t("description")}
        actions={
          <ButtonTA
            variant="outline"
            disabled={request.loading}
            onClick={request.reload}
          >
            {t("refresh")}
          </ButtonTA>
        }
      />
      {data && data.businesses.length > 1 && (
        <label className="block max-w-sm space-y-2 text-sm">
          <span>{t("business")}</span>
          <OperationSelectTA
            value={selection.businessId || data.business.id}
            onChange={(event) => selection.setBusinessId(event.target.value)}
          >
            {data.businesses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </OperationSelectTA>
        </label>
      )}
      {!data ? (
        <StateTA
          loading={request.loading && !request.error}
          error={Boolean(request.error)}
          title={request.error || t("loading")}
          description={t("description")}
          onRetry={request.error ? request.reload : undefined}
        />
      ) : (
        <div key={data.business.id} className="space-y-6">
          <nav aria-label={t("sections")} className="flex flex-wrap gap-2">
            {[
              "today",
              "availability",
              "blocks",
              ...(data.can_manage_resources ? ["resources", "payments"] : []),
            ].map((value) => (
              <ButtonTA
                key={value}
                variant={tab === value ? "default" : "outline"}
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
              >
                {t(value)}
              </ButtonTA>
            ))}
          </nav>
          {tab === "today" && <TodayOperationsTA context={data} />}
          {tab === "availability" &&
            (data.professionals.length ? (
              <ProfessionalScheduleTA
                context={data}
                reload={request.reload}
                initialId={professionalId}
              />
            ) : (
              <StateTA
                title={t("noProfessionals")}
                description={t("resourcesDescription")}
              />
            ))}
          {tab === "blocks" && (
            <OperationalBlocksTA context={data} reload={request.reload} />
          )}
          {tab === "payments" && data.can_manage_resources && (
            <PaymentPolicyEditorTA businessId={data.business.id} />
          )}
          {tab === "resources" && data.can_manage_resources && (
            <ResourceOperationsTA context={data} reload={request.reload} />
          )}
        </div>
      )}
    </div>
  );
};
