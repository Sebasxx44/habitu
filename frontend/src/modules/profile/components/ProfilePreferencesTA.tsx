import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import type {
  AccountProfile,
  ProfileState,
  AccountPreferences,
} from "@/modules/profile/types";
// COMPONENT
export const ProfilePreferencesTA = ({
  data,
  changes,
}: {
  data: AccountProfile;
  changes: ProfileState["changes"];
}) => {
  const { t } = useTranslation("profile");
  const [form, setForm] = useState(data.preferences);
  const previous = useRef(data.preferences);
  useEffect(() => {
    const last = previous.current;
    setForm(current => ({
      language: current.language === last.language ? data.preferences.language : current.language,
      theme: current.theme === last.theme ? data.preferences.theme : current.theme,
      appointment_reminders: current.appointment_reminders === last.appointment_reminders ? data.preferences.appointment_reminders : current.appointment_reminders,
      email_notifications: current.email_notifications === last.email_notifications ? data.preferences.email_notifications : current.email_notifications,
    }));
    previous.current = data.preferences;
  }, [data.preferences]);
  const update = <K extends keyof AccountPreferences>(
    key: K,
    value: AccountPreferences[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <PanelTA title={t("preferences")} description={t("preferenceDescription")}>
      <form
        className="space-y-6 px-5 pb-6"
        onSubmit={(event) => {
          event.preventDefault();
          void changes.preferences(form);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            {t("language")}
            <select
              disabled={changes.busy}
              value={form.language}
              onChange={(event) =>
                update("language", event.target.value === "en" ? "en" : "es")
              }
              className="min-h-11 w-full rounded-xl border border-input bg-background px-3"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            {t("theme")}
            <select
              disabled={changes.busy}
              value={form.theme}
              onChange={(event) =>
                update(
                  "theme",
                  event.target.value === "light"
                    ? "light"
                    : event.target.value === "dark"
                      ? "dark"
                      : "system",
                )
              }
              className="min-h-11 w-full rounded-xl border border-input bg-background px-3"
            >
              {(["light", "dark", "system"] as const).map((theme) => (
                <option key={theme} value={theme}>
                  {t(theme)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset className="space-y-4 border-t border-border pt-5">
          <legend className="px-1 text-sm font-semibold">
            {t("notifications")}
          </legend>
          {(
            [
              {
                key: "appointment_reminders",
                title: "reminders",
                description: "remindersDescription",
              },
              {
                key: "email_notifications",
                title: "emails",
                description: "emailsDescription",
              },
            ] as const
          ).map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border p-4"
            >
              <span>
                <span className="block text-sm font-medium">
                  {t(item.title)}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {t(item.description)}
                </span>
              </span>
              <input
                type="checkbox"
                className="mt-1 size-5 shrink-0 accent-primary"
                checked={form[item.key]}
                disabled={changes.busy}
                onChange={(event) => update(item.key, event.target.checked)}
              />
            </label>
          ))}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("notificationNote")}
          </p>
          {!data.capabilities.email_delivery && (
            <p className="rounded-xl bg-secondary p-3 text-xs leading-relaxed text-secondary-foreground">
              {t("emailUnavailable")}
            </p>
          )}
        </fieldset>
        <ButtonTA type="submit" disabled={changes.busy}>
          {t(changes.busy ? "saving" : "save")}
        </ButtonTA>
      </form>
    </PanelTA>
  );
};
