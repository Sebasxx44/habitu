import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import {
  getAnalyticsPreferences,
  saveAnalyticsPreferences,
} from "@/modules/analytics/tracking";

// COMPONENT
export const AnalyticsPreferencesTA = () => {
  const { t } = useTranslation("analytics");
  const [value, setValue] = useState({
    measurement: false,
    personalization: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const mutation = useRef(false);
  useEffect(() => {
    let active = true;
    void getAnalyticsPreferences()
      .then((preferences) => {
        if (active && preferences) setValue(preferences);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const save = async () => {
    if (mutation.current) return;
    mutation.current = true;
    setSaving(true);
    setFeedback(null);
    try {
      await saveAnalyticsPreferences(value);
      setFeedback("success");
    } catch {
      setFeedback("error");
    } finally {
      mutation.current = false;
      setSaving(false);
    }
  };
  return (
    <PanelTA
      title={t("preferencesTitle")}
      description={t("preferencesDescription")}
    >
      <div className="space-y-5 px-5 pb-6 sm:px-6">
        {(["measurement", "personalization"] as const).map((key) => (
          <label
            key={key}
            className="flex min-h-11 cursor-pointer items-start gap-3"
          >
            <input
              className="mt-1 size-4 shrink-0 accent-primary"
              type="checkbox"
              disabled={loading || saving}
              checked={value[key]}
              onChange={(event) => {
                setValue((current) => ({
                  ...current,
                  [key]: event.target.checked,
                }));
                setFeedback(null);
              }}
            />
            <span>
              <span className="block text-sm font-medium">{t(key)}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {t(`${key}Description`)}
              </span>
            </span>
          </label>
        ))}
        <ButtonTA disabled={loading || saving} onClick={() => void save()}>
          {t("savePreferences")}
        </ButtonTA>
        {feedback && (
          <p
            role="status"
            className={
              feedback === "error"
                ? "text-xs text-destructive"
                : "text-xs text-primary"
            }
          >
            {t(
              feedback === "success" ? "preferencesSaved" : "preferencesError",
            )}
          </p>
        )}
      </div>
    </PanelTA>
  );
};
