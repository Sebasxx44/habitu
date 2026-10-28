import { useTranslation } from "react-i18next";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { StateTA } from "@/components/TA/StateTA";
import { useAdsDirectory } from "@/modules/ads/composables/useAdsDirectory";
import { useAdEditor } from "@/modules/ads/composables/useAdEditor";
import { AdEditorTA } from "@/modules/ads/components/AdEditorTA";
import { AdCardTA } from "@/modules/ads/components/AdCardTA";
import type { AdsDirectory, AdsDirectoryState } from "@/modules/ads/types";

// COMPONENTS
const AdsWorkspaceTA = ({
  data,
  directory,
}: {
  data: AdsDirectory;
  directory: AdsDirectoryState;
}) => {
  const { t } = useTranslation("ads");
  const editor = useAdEditor(
    data.businesses[0]?.id || 0,
    directory.listing.refresh,
  );
  return (
    <div className="space-y-5">
      <AdEditorTA state={editor} businesses={data.businesses} />
      {!data.billing_enabled && (
        <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
          {t("billingHelp")}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{t("attributionHelp")}</p>
      {directory.mutation.error && (
        <p role="alert" className="text-sm text-destructive">
          {directory.mutation.error}
        </p>
      )}
      {!data.ads.length && (
        <StateTA title={t("empty")} description={t("description")} />
      )}
      {data.ads.map((ad) => (
        <AdCardTA
          key={ad.id}
          ad={ad}
          moderate={data.can_moderate}
          busy={directory.mutation.busyId !== null || editor.editor.busy}
          actions={directory.actions}
          edit={editor.actions.edit}
        />
      ))}
    </div>
  );
};
export const AdsPage = () => {
  const { t } = useTranslation("ads");
  const directory = useAdsDirectory();
  return (
    <div className="space-y-6 pb-8">
      <ActionHeaderTA
        title={t("title")}
        description={t("description")}
        actions={
          <ButtonTA
            variant="outline"
            disabled={directory.listing.loading}
            onClick={directory.listing.refresh}
          >
            {t("refresh")}
          </ButtonTA>
        }
      />
      {directory.listing.error && (
        <StateTA
          error
          title={directory.listing.error}
          description={t("description")}
          onRetry={directory.listing.refresh}
        />
      )}
      {directory.listing.data ? (
        <AdsWorkspaceTA data={directory.listing.data} directory={directory} />
      ) : (
        <StateTA title={t("loading")} description={t("description")} />
      )}
    </div>
  );
};
