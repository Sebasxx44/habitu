import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import {
  OperationFieldTA,
  OperationSelectTA,
} from "@/modules/operations/components/OperationFieldsTA";
import { distributionService } from "@/modules/distribution/distributionService";
import type { DistributionContext } from "@/modules/distribution/types";

// COMPONENT
export const WidgetSettingsTA = ({
  data,
  refresh,
}: {
  data: DistributionContext;
  refresh: () => void;
}) => {
  const { t } = useTranslation("distribution");
  const [settings, setSettings] = useState(data.settings);
  const [origins, setOrigins] = useState(
    data.settings.allowed_origins.join("\n"),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await distributionService.settings(data.business_id, {
        ...settings,
        allowed_origins: origins
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
      });
      refresh();
    } catch {
      setError(t("saveError"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <PanelTA title={t("widget")} description={t("widgetHelp")}>
      <form
        className="space-y-4 px-5 pb-5"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                enabled: event.target.checked,
              }))
            }
          />
          {t("enabled")}
        </label>
        <OperationFieldTA label={t("origins")}>
          <textarea
            className="min-h-24 w-full rounded-xl border border-border bg-background p-3 text-sm"
            value={origins}
            onChange={(event) => setOrigins(event.target.value)}
            placeholder="https://example.com"
          />
        </OperationFieldTA>
        <div className="grid gap-4 sm:grid-cols-2">
          <OperationFieldTA label={t("theme")}>
            <OperationSelectTA
              value={settings.theme}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  theme: event.target.value === "dark" ? "dark" : "light",
                }))
              }
            >
              <option value="light">{t("light")}</option>
              <option value="dark">{t("dark")}</option>
            </OperationSelectTA>
          </OperationFieldTA>
          <OperationFieldTA label={t("language")}>
            <OperationSelectTA
              value={settings.locale}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  locale: event.target.value === "en" ? "en" : "es",
                }))
              }
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </OperationSelectTA>
          </OperationFieldTA>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <ButtonTA type="submit" disabled={busy}>
          {t("save")}
        </ButtonTA>
      </form>
    </PanelTA>
  );
};
