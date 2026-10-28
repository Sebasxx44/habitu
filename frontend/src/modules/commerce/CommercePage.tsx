import { useTranslation } from "react-i18next";
import { Gift, RefreshCw, Store } from "lucide-react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { StateTA } from "@/components/TA/StateTA";
import { SkeletonTA } from "@/components/TA/SkeletonTA";
import {
  OperationFieldTA,
  OperationSelectTA,
} from "@/modules/operations/components/OperationFieldsTA";
import { useCommerceContext } from "@/modules/commerce/composables/useCommerceContext";
import { PackagesTA } from "@/modules/commerce/components/PackagesTA";
import { GiftsTA } from "@/modules/commerce/components/GiftsTA";

// COMPONENT
export const CommercePage = () => {
  // COMPOSABLES
  const { t } = useTranslation("commerce");
  const { listing, selection } = useCommerceContext();
  const data = listing.data;
  return (
    <div className="space-y-6 pb-8">
      <ActionHeaderTA
        icon={Gift}
        title={t("title")}
        description={t("description")}
        actions={
          <ButtonTA
            variant="outline"
            disabled={listing.loading}
            onClick={listing.refresh}
          >
            <RefreshCw className={listing.loading ? "size-4 animate-spin motion-reduce:animate-none" : "size-4"} />
            {t("refresh")}
          </ButtonTA>
        }
      />
      {listing.error && (
        <StateTA
          error
          title={listing.error}
          description={t("description")}
          onRetry={listing.refresh}
        />
      )}
      {!data && !listing.error ? (
        <SkeletonTA variant="dashboard" label={t("loading")} />
      ) : data ? (
        <>
          <div className="surface-card max-w-xl rounded-2xl border border-primary/15 p-5">
            <Store className="mb-3 size-5 text-primary" aria-hidden="true" />
            <OperationFieldTA label={t("business")}>
              <OperationSelectTA
                disabled={listing.loading}
                value={selection.businessId || data.business_id}
                onChange={(event) =>
                  selection.setBusinessId(event.target.value)
                }
              >
                {data.businesses.map((business) => (
                  <option value={business.id} key={business.id}>
                    {business.name}
                  </option>
                ))}
              </OperationSelectTA>
            </OperationFieldTA>
          </div>
          <div key={data.business_id} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <PackagesTA data={data} refresh={listing.refresh} />
            <GiftsTA data={data} refresh={listing.refresh} />
          </div>
        </>
      ) : null}
    </div>
  );
};
