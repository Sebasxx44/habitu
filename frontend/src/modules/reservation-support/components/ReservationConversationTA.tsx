import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { reservationSupportCopy } from "@/modules/reservation-support/copy";
import { useReservationConversation } from "@/modules/reservation-support/composables/useReservationConversation";
import type { ReservationReference } from "@/modules/reservation-support/types";

// COMPONENT
export const ReservationConversationTA = (reference: ReservationReference) => {
  // COMPOSABLES
  const { i18n } = useTranslation();
  const { data, actions } = useReservationConversation(reference);
  // STATE
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  // COMPUTED
  const copy =
    reservationSupportCopy[i18n.language.startsWith("en") ? "en" : "es"];
  const send = async () => {
    if (await actions.send(content, file)) {
      setContent("");
      setFile(null);
    }
  };
  // RENDER
  return (
    <PanelTA
      title={copy.title}
      description={copy.description}
      action={
        <ButtonTA
          variant="outline"
          disabled={data.loading}
          onClick={() =>
            void (data.conversation ? actions.refresh() : actions.open())
          }
        >
          {data.loading
            ? copy.loading
            : data.conversation
              ? copy.refresh
              : copy.open}
        </ButtonTA>
      }
    >
      <div className="space-y-4 px-5 pb-5 md:px-6">
        <p className="text-xs text-muted-foreground">{copy.retention}</p>
        {data.error && (
          <p role="alert" className="text-sm text-destructive">
            {copy.error}
          </p>
        )}
        {data.conversation && (
          <>
            <ol
              className="max-h-80 space-y-3 overflow-y-auto"
              aria-live="polite"
            >
              {data.messages.length ? (
                data.messages.map((message) => (
                  <li
                    key={message.id}
                    className="rounded-xl bg-secondary/50 p-3 text-sm"
                  >
                    <p className="font-semibold">
                      {message.sender.name}
                      <time
                        className="ml-2 text-xs font-normal text-muted-foreground"
                        dateTime={message.created_at}
                      >
                        {new Date(message.created_at).toLocaleString(
                          i18n.language,
                        )}
                      </time>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    {message.attachments?.map((id) => (
                      <ButtonTA
                        key={id}
                        variant="ghost"
                        onClick={() => void actions.download(id)}
                      >
                        {copy.file}
                      </ButtonTA>
                    ))}
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">{copy.empty}</li>
              )}
            </ol>
            <div className="flex flex-wrap gap-2">
              {[copy.arrived, copy.late].map((text) => (
                <ButtonTA
                  key={text}
                  variant="outline"
                  onClick={() => setContent(text)}
                >
                  {text}
                </ButtonTA>
              ))}
            </div>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <label
                className="block text-sm font-medium"
                htmlFor={`reservation-message-${reference.kind}-${reference.id}`}
              >
                {copy.message}
              </label>
              <textarea
                id={`reservation-message-${reference.kind}-${reference.id}`}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                required
                maxLength={4000}
                rows={3}
                className="w-full rounded-xl border border-input bg-background p-3 text-sm"
              />
              <label className="block text-xs text-muted-foreground">
                {copy.attach}
                <input
                  key={file?.name ?? "empty"}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  className="mt-2 block w-full text-xs"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <ButtonTA
                type="submit"
                disabled={
                  data.busy ||
                  !content.trim() ||
                  (file?.size ?? 0) > 5 * 1024 * 1024
                }
              >
                {copy.send}
              </ButtonTA>
            </form>
          </>
        )}
      </div>
    </PanelTA>
  );
};
