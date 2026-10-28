import { useTranslation } from "react-i18next";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { LinkButtonTA } from "@/components/TA/LinkButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { OperationSelectTA } from "@/modules/operations/components/OperationFieldsTA";
import { RoutineEditorTA } from "@/modules/routines/RoutineEditorTA";
import { useRoutines } from "@/modules/routines/useRoutines";

// COMPONENT
export const RoutinesPage = () => {
  // COMPOSABLES
  const { t, i18n } = useTranslation("growth");
  const { data, request, actions } = useRoutines();
  // RENDER
  return (
    <div className="space-y-6 pb-8">
      <ActionHeaderTA
        title={t("routines")}
        description={t("routineDescription")}
      />
      {request.error && (
        <StateTA
          error
          title={request.error}
          description={t("history")}
          onRetry={request.reload}
        />
      )}
      {request.loading ? (
        <StateTA title={t("loading")} description={t("routineDescription")} />
      ) : (
        <>
          <PanelTA title={t("newRoutine")}>
            <div className="px-5 pb-5">
              <RoutineEditorTA
                appointments={data.appointments}
                reload={request.reload}
              />
            </div>
          </PanelTA>
          {data.routines.length === 0 && (
            <StateTA
              title={t("noRoutines")}
              description={t("routineDescription")}
            />
          )}
          {data.routines.map((routine) => {
            const preview = data.previews[routine.id];
            const fresh =
              preview && new Date(preview.expires_at).getTime() > Date.now();
            return (
              <PanelTA
                key={routine.id}
                title={routine.name}
                description={
                  routine.status === "PAUSED" ? t("paused") : t("history")
                }
                action={
                  <div className="flex gap-2">
                    <ButtonTA
                      disabled={request.busy}
                      variant="outline"
                      onClick={() => void actions.pause(routine)}
                    >
                      {t(routine.status === "ACTIVE" ? "pause" : "resume")}
                    </ButtonTA>
                    <ButtonTA
                      disabled={request.busy}
                      onClick={() => void actions.preview(routine.id)}
                    >
                      {t("preview")}
                    </ButtonTA>
                  </div>
                }
              >
                <div className="space-y-5 px-5 pb-5">
                  {preview && (
                    <p className="text-xs text-muted-foreground">
                      {t("proposalExpiry", {
                        time: new Date(preview.checked_at).toLocaleTimeString(
                          i18n.language,
                        ),
                      })}{" "}
                      · {preview.timezone}
                    </p>
                  )}
                  <ul className="divide-y divide-border">
                    {routine.occurrences.map((occurrence) => {
                      const proposal = preview?.occurrences.find(
                        (item) => item.id === occurrence.id,
                      );
                      return (
                        <li
                          key={occurrence.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-4"
                        >
                          <div>
                            <p className="font-medium">
                              {occurrence.date.slice(0, 10)} ·{" "}
                              {occurrence.start_time.slice(0, 5)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t(
                                occurrence.status === "BOOKED"
                                  ? "booked"
                                  : occurrence.status === "SKIPPED"
                                    ? "skipped"
                                    : "planned",
                              )}
                              {proposal && occurrence.status === "PLANNED"
                                ? ` · ${t(proposal.available ? "available" : "conflict")}`
                                : ""}
                              {proposal?.quote
                                ? ` · ${new Intl.NumberFormat(i18n.language, { style: "currency", currency: proposal.quote.currency }).format(proposal.quote.total)}`
                                : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {occurrence.appointment_id ? (
                              <LinkButtonTA
                                to={`/cliente/appointments/${occurrence.appointment_id}`}
                                variant="outline"
                              >
                                {t("reservation")}
                              </LinkButtonTA>
                            ) : (
                              occurrence.status === "PLANNED" && (
                                <>
                                  <ButtonTA
                                    disabled={request.busy}
                                    variant="ghost"
                                    onClick={() =>
                                      void actions.skip(occurrence.id)
                                    }
                                  >
                                    {t("skip")}
                                  </ButtonTA>
                                  {fresh &&
                                    proposal?.available &&
                                    proposal.booking_url &&
                                    routine.status === "ACTIVE" && (
                                      <LinkButtonTA to={proposal.booking_url}>
                                        {t("prepare")}
                                      </LinkButtonTA>
                                    )}
                                  <OperationSelectTA
                                    aria-label={t("attach")}
                                    disabled={request.busy}
                                    value=""
                                    onChange={(event) => {
                                      if (event.target.value)
                                        void actions.attach(
                                          occurrence.id,
                                          Number(event.target.value),
                                        );
                                    }}
                                  >
                                    <option value="">{t("attach")}</option>
                                    {data.appointments
                                      .filter(
                                        (item) =>
                                          item.date.slice(0, 10) ===
                                            occurrence.date.slice(0, 10) &&
                                          item.time ===
                                            occurrence.start_time.slice(0, 5),
                                      )
                                      .map((item) => (
                                        <option key={item.id} value={item.id}>
                                          #{item.id} · {item.service?.name}
                                        </option>
                                      ))}
                                  </OperationSelectTA>
                                </>
                              )
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <details className="rounded-xl border border-border p-4">
                    <summary className="cursor-pointer text-sm font-semibold">
                      {t("future")}
                    </summary>
                    <div className="pt-4">
                      <RoutineEditorTA
                        key={routine.id}
                        appointments={data.appointments}
                        reload={request.reload}
                        routine={routine}
                      />
                    </div>
                  </details>
                </div>
              </PanelTA>
            );
          })}
        </>
      )}
    </div>
  );
};
