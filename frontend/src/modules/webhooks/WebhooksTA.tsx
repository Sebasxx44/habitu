import { useTranslation } from "react-i18next";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { useWebhooks, webhookEvents } from "@/modules/webhooks/useWebhooks";

// COMPONENT
export const WebhooksTA = () => {
  // COMPOSABLES
  const { t } = useTranslation("automation");
  const { directory, editor, history, secret } = useWebhooks();
  // RENDER
  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-8">
      <ActionHeaderTA
        title={t("webhooks")}
        description={t("webhookDescription")}
      />
      {directory.error && (
        <p role="alert" className="text-sm text-destructive">
          {t("error")}{" "}
          <ButtonTA variant="ghost" onClick={directory.refresh}>
            {t("retry")}
          </ButtonTA>
        </p>
      )}
      <PanelTA title={t(editor.editingId ? "editWebhook" : "newWebhook")}>
        <form
          className="space-y-4 px-5 pb-5"
          onSubmit={(event) => {
            event.preventDefault();
            void editor.create();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              {t("name")}
              <InputTA
                required
                maxLength={100}
                value={editor.value.name}
                onChange={(event) =>
                  editor.setValue((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label className="space-y-2 text-sm">
              {t("url")}
              <InputTA
                required
                type="url"
                pattern="https://.*"
                maxLength={500}
                placeholder="https://"
                value={editor.value.url}
                onChange={(event) =>
                  editor.setValue((current) => ({
                    ...current,
                    url: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {webhookEvents.map((event) => (
              <ButtonTA
                key={event}
                type="button"
                size="sm"
                aria-pressed={editor.value.events.includes(event)}
                variant={
                  editor.value.events.includes(event) ? "default" : "outline"
                }
                onClick={() => editor.toggleEvent(event)}
              >
                {event}
              </ButtonTA>
            ))}
          </div>
          <ButtonTA
            type="submit"
            disabled={directory.busy || editor.value.events.length === 0}
          >
            {t(editor.editingId ? "saveWebhook" : "create")}
          </ButtonTA>
          {editor.editingId && (
            <ButtonTA type="button" variant="ghost" onClick={editor.cancel}>
              {t("cancelEdit")}
            </ButtonTA>
          )}
        </form>
      </PanelTA>
      {directory.loading ? (
        <p role="status">{t("loading")}</p>
      ) : directory.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noWebhooks")}</p>
      ) : (
        directory.items.map((item) => (
          <PanelTA
            key={item.id}
            title={item.name}
            description={t(item.active ? "enabled" : "disabled")}
          >
            <div className="space-y-4 px-5 pb-5">
              <p className="break-all text-sm">{item.url}</p>
              <p className="break-words text-xs text-muted-foreground">
                {item.events.join(" · ")}
              </p>
              <div className="flex flex-wrap gap-2">
                <ButtonTA
                  size="sm"
                  variant="outline"
                  disabled={directory.busy}
                  onClick={() => editor.edit(item)}
                >
                  {t("editWebhook")}
                </ButtonTA>
                <ButtonTA
                  size="sm"
                  variant="outline"
                  disabled={directory.busy}
                  onClick={() => void directory.toggle(item)}
                >
                  {t(item.active ? "pause" : "resume")}
                </ButtonTA>
                <ButtonTA
                  size="sm"
                  variant="outline"
                  disabled={directory.busy}
                  onClick={() => void history.show(item.id)}
                >
                  {t("deliveries")}
                </ButtonTA>
                <ButtonTA
                  size="sm"
                  variant="ghost"
                  onClick={() => secret.toggle(item.id)}
                >
                  {t("showSecret")}
                </ButtonTA>
                <ButtonTA
                  size="sm"
                  variant="ghost"
                  disabled={directory.busy}
                  onClick={() => void directory.remove(item.id)}
                >
                  {t("remove")}
                </ButtonTA>
              </div>
              {secret.visible === item.id && (
                <label className="block space-y-2 text-xs">
                  {t("secret")}
                  <InputTA
                    readOnly
                    type="text"
                    autoComplete="off"
                    value={item.secret ?? ""}
                    onFocus={(event) => event.target.select()}
                  />
                </label>
              )}
              {history.webhookId === item.id && (
                <div className="space-y-3 border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">
                    {t("webhookSafety")}
                  </p>
                  {history.items.length === 0 ? (
                    <p className="text-sm">{t("noDeliveries")}</p>
                  ) : (
                    history.items.map((delivery) => (
                      <div
                        key={delivery.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                      >
                        <div className="min-w-0 text-sm">
                          <p>
                            {delivery.event} ·{" "}
                            {t(
                              delivery.outbox_id
                                ? (delivery.state ?? "PENDING")
                                : "legacy",
                            )}
                          </p>
                          <p className="break-all text-xs text-muted-foreground">
                            {delivery.outbox_id ?? delivery.id} ·{" "}
                            {t("attempts")}: {delivery.attempt}
                            {delivery.status_code
                              ? ` · HTTP ${delivery.status_code}`
                              : ""}
                          </p>
                          {delivery.error_message && (
                            <p className="text-xs">{delivery.error_message}</p>
                          )}
                        </div>
                        {delivery.outbox_id && delivery.state === "FAILED" && (
                          <ButtonTA
                            size="sm"
                            variant="outline"
                            disabled={directory.busy}
                            onClick={() => void history.replay(delivery.id)}
                          >
                            {t("replay")}
                          </ButtonTA>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </PanelTA>
        ))
      )}
    </main>
  );
};
