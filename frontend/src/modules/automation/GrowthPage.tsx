import { useTranslation } from "react-i18next";
import { Sprout } from "lucide-react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { StateTA } from "@/components/TA/StateTA";
import { useOperationsContext } from "@/modules/operations/composables/useOperationsContext";
import { OperationSelectTA } from "@/modules/operations/components/OperationFieldsTA";
import { RetentionRecipesTA } from "@/modules/automation/RetentionRecipesTA";
import { ReferralProgramTA } from "@/modules/automation/ReferralProgramTA";

// COMPONENT
export const GrowthPage = () => {
  // COMPOSABLES
  const { t } = useTranslation("automation");
  const { data, request, selection } = useOperationsContext();
  // RENDER
  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-8">
      <ActionHeaderTA
        icon={Sprout}
        eyebrow="habitu"
        title={t("title")}
        description={t("description")}
      />
      {data && data.businesses.length > 1 && (
        <label className="block max-w-sm space-y-2 text-sm">
          {t("business")}
          <OperationSelectTA
            value={selection.businessId || data.business.id}
            onChange={(event) => selection.setBusinessId(event.target.value)}
          >
            {data.businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </OperationSelectTA>
        </label>
      )}
      {!data || request.loading ? (
        <StateTA
          loading={request.loading && !request.error}
          description={t("description")}
          error={Boolean(request.error)}
          title={request.error || t("loading")}
          onRetry={request.error ? request.reload : undefined}
        />
      ) : (
        <div className="space-y-8" key={data.business.id}>
          <RetentionRecipesTA businessId={data.business.id} />
          <ReferralProgramTA businessId={data.business.id} />
        </div>
      )}
    </main>
  );
};
