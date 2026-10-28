import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { useRetentionRecipes } from "@/modules/automation/useRetentionRecipes";
import type { RecipeKind } from "@/modules/automation/types";

// COMPONENT
export const RetentionRecipesTA = ({ businessId }: { businessId: number }) => {
  // COMPOSABLES
  const { t } = useTranslation("automation");
  const { directory, editor, actions } = useRetentionRecipes(businessId);
  const kinds: RecipeKind[] = [
    "RETURN_REMINDER",
    "MEMBERSHIP_EXPIRING",
    "OPEN_SLOTS_PROMOTION",
  ];
  const fields =
    editor.value.kind === "OPEN_SLOTS_PROMOTION"
      ? (["lead_days", "minimum_discount", "maximum_discount"] as const)
      : editor.value.kind === "RETURN_REMINDER"
        ? (["inactive_days", "frequency_days"] as const)
        : (["lead_days", "frequency_days"] as const);
  // RENDER
  return (
    <div className="space-y-5">
      <PanelTA title={t("recipes")} description={t("honest")}>
        <div className="space-y-5 px-5 pb-5">
          <nav className="flex flex-wrap gap-2" aria-label={t("recipes")}>
            {kinds.map((kind) => (
              <ButtonTA
                key={kind}
                size="sm"
                variant={editor.value.kind === kind ? "default" : "outline"}
                aria-pressed={editor.value.kind === kind}
                onClick={() => editor.select(kind)}
              >
                {t(kind)}
              </ButtonTA>
            ))}
          </nav>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void editor.save();
            }}
          >
            <ButtonTA
              type="button"
              variant="outline"
              aria-pressed={editor.value.enabled}
              onClick={() =>
                editor.setValue((current) => ({
                  ...current,
                  enabled: !current.enabled,
                }))
              }
            >
              {t(editor.value.enabled ? "enabled" : "disabled")}
            </ButtonTA>
            <div className="grid gap-4 sm:grid-cols-3">
              {fields.map((field) => (
                <label className="space-y-2 text-sm" key={field}>
                  {t(field)}
                  <InputTA
                    type="number"
                    required
                    min={
                      field.includes("discount")
                        ? 0
                        : field === "lead_days"
                          ? 1
                          : 7
                    }
                    max={
                      field.includes("discount")
                        ? 50
                        : field === "lead_days"
                          ? 30
                          : 365
                    }
                    value={editor.value[field]}
                    onChange={(event) =>
                      editor.setValue((current) => ({
                        ...current,
                        [field]: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            <ButtonTA
              type="submit"
              disabled={directory.busy || !directory.data}
            >
              {t("save")}
            </ButtonTA>
          </form>
          {directory.data?.clinical_marketing_excluded && (
            <p className="text-sm text-muted-foreground">{t("clinical")}</p>
          )}
          <p className="text-sm text-muted-foreground">{t("waitlist")}</p>
        </div>
      </PanelTA>
      {directory.error && (
        <p role="alert" className="text-sm text-destructive">
          {t("error")}{" "}
          <ButtonTA variant="ghost" onClick={directory.refresh}>
            {t("retry")}
          </ButtonTA>
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("proposals")}</h2>
        <ButtonTA
          variant="outline"
          disabled={directory.busy || !directory.data}
          onClick={() => void directory.scan()}
        >
          {t("prepare")}
        </ButtonTA>
      </div>
      {!directory.data ? (
        <p role="status">{t("loading")}</p>
      ) : directory.data.actions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {directory.data.actions.map((action) => (
            <PanelTA
              key={action.id}
              title={action.payload.title}
              description={t(action.state)}
            >
              <div className="space-y-3 px-5 pb-5 text-sm">
                {action.payload.message && <p>{action.payload.message}</p>}
                {action.payload.free_start_options !== undefined && (
                  <p>
                    {action.payload.date} · {t("starts")}:{" "}
                    {action.payload.free_start_options}
                    <br />
                    {t("discount")}: {action.payload.suggested_discount}%
                  </p>
                )}
                {action.state === "NOTIFIED_IN_APP" && (
                  <p>{t(action.read_in_app ? "read" : "unread")}</p>
                )}
                {action.state === "NOTIFIED_IN_APP" && (
                  <p className="text-xs text-muted-foreground">
                    {action.clicked && <span>{t("clicked")} · </span>}
                    {t("attributed")}: {action.completed_bookings}
                    <br />
                    {t("attributionNote")}
                  </p>
                )}
                {action.state === "PROPOSED" && (
                  <>
                    <p className="text-muted-foreground">
                      {t("expires")}:{" "}
                      {new Date(action.expires_at).toLocaleString()}
                    </p>
                    <ButtonTA
                      disabled={directory.busy}
                      onClick={() => void actions.approve(action)}
                    >
                      {t(
                        action.kind === "OPEN_SLOTS_PROMOTION"
                          ? "publish"
                          : "approve",
                      )}
                    </ButtonTA>
                  </>
                )}
              </div>
            </PanelTA>
          ))}
        </div>
      )}
    </div>
  );
};
