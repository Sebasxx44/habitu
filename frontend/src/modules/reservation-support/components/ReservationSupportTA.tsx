import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { InputTA } from "@/components/TA/InputTA";
import { ReservationConversationTA } from "@/modules/reservation-support/components/ReservationConversationTA";
import { ReservationCheckInTA } from "@/modules/reservation-support/components/ReservationCheckInTA";
import { useReservationSupport } from "@/modules/reservation-support/composables/useReservationSupport";
import { reservationSupportCopy } from "@/modules/reservation-support/copy";
import type {
  IncidentCategory,
  ReservationReference,
} from "@/modules/reservation-support/types";

// CONSTANTS
const categories: IncidentCategory[] = [
  "PROFESSIONAL_ABSENT",
  "RESOURCE_UNAVAILABLE",
  "PRICE_DIFFERENCE",
  "DUPLICATE_CHARGE",
  "SERVICE_NOT_PERFORMED",
];

// COMPONENT
export const ReservationSupportTA = (reference: ReservationReference) => {
  // COMPOSABLES
  const { i18n } = useTranslation();
  const { data, actions } = useReservationSupport(reference);
  // STATE
  const [category, setCategory] = useState<IncidentCategory>(
    "PROFESSIONAL_ABSENT",
  );
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [resolutions, setResolutions] = useState<Record<number, string>>({});
  const [deadlines, setDeadlines] = useState<Record<number, string>>({});
  // COMPUTED
  const copy =
    reservationSupportCopy[i18n.language.startsWith("en") ? "en" : "es"];
  const report = async () => {
    setBusy(true);
    if (await actions.report(category, description)) setDescription("");
    setBusy(false);
  };
  // RENDER
  return (
    <div className="space-y-5">
      <ReservationConversationTA {...reference} />
      {data.support && (
        <ReservationCheckInTA
          reference={reference}
          support={data.support}
          onVerified={actions.refresh}
        />
      )}
      <PanelTA
        title={copy.incident}
        action={
          <ButtonTA
            variant="ghost"
            onClick={() => void actions.refresh()}
            disabled={data.loading}
          >
            {copy.refresh}
          </ButtonTA>
        }
      >
        <div className="space-y-5 px-5 pb-5 md:px-6">
          {data.error && (
            <p role="alert" className="text-sm text-destructive">
              {copy.error}
            </p>
          )}
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void report();
            }}
          >
            <label className="block text-sm">
              {copy.category}
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as IncidentCategory)
                }
                className="mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-3"
              >
                {categories.map((value) => (
                  <option key={value} value={value}>
                    {copy.categories[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              {copy.details}
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                minLength={10}
                maxLength={3000}
                rows={3}
                required
                className="mt-1 w-full rounded-xl border border-input bg-background p-3"
              />
            </label>
            <ButtonTA
              type="submit"
              disabled={busy || description.trim().length < 10}
            >
              {copy.report}
            </ButtonTA>
          </form>
          <h3 className="text-sm font-semibold">{copy.cases}</h3>
          {data.loading && !data.support ? (
            <p role="status">{copy.loading}</p>
          ) : !data.support?.incidents.length ? (
            <p className="text-xs text-muted-foreground">{copy.noCases}</p>
          ) : (
            data.support.incidents.map((incident) => (
              <article
                key={incident.id}
                className="space-y-2 rounded-xl border border-border p-4 text-sm"
              >
                <p className="font-semibold">
                  {incident.case_number} · {copy.status[incident.status]}
                </p>
                <p>{copy.categories[incident.category]}</p>
                <p className="whitespace-pre-wrap">{incident.description}</p>
                <p className="text-xs text-muted-foreground">
                  {copy.responsible}:{" "}
                  {incident.assigned_to
                    ? `#${incident.assigned_to}`
                    : copy.pendingOwner}
                </p>
                <p className="text-xs text-muted-foreground">
                  {copy.due}:{" "}
                  {incident.response_due_at
                    ? new Date(incident.response_due_at).toLocaleString(
                        i18n.language,
                      )
                    : copy.pendingDue}
                </p>
                {incident.resolution && (
                  <p>
                    {copy.resolution}: {incident.resolution}
                  </p>
                )}
                {data.support?.can_manage && incident.status !== "RESOLVED" && (
                  <div className="space-y-2">
                    <label className="block text-xs">
                      {copy.due}
                      <InputTA
                        type="datetime-local"
                        value={deadlines[incident.id] ?? ""}
                        onChange={(event) =>
                          setDeadlines((current) => ({
                            ...current,
                            [incident.id]: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="block text-xs">
                      {copy.resolution}
                      <InputTA
                        value={resolutions[incident.id] ?? ""}
                        onChange={(event) =>
                          setResolutions((current) => ({
                            ...current,
                            [incident.id]: event.target.value,
                          }))
                        }
                        maxLength={3000}
                      />
                    </label>
                    <ButtonTA
                      variant="outline"
                      disabled={
                        busy ||
                        (!(resolutions[incident.id]?.trim().length >= 10) &&
                          !deadlines[incident.id])
                      }
                      onClick={async () => {
                        setBusy(true);
                        await actions.resolve(
                          incident,
                          resolutions[incident.id] ?? "",
                          deadlines[incident.id]
                            ? new Date(deadlines[incident.id]).toISOString()
                            : undefined,
                        );
                        setBusy(false);
                      }}
                    >
                      {copy.resolve}
                    </ButtonTA>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </PanelTA>
    </div>
  );
};
