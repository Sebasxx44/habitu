import { ReservationSupportTA } from "@/modules/reservation-support/components/ReservationSupportTA";
import { ClipboardList, CreditCard, History, Save } from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { useAppointmentNotes } from "@/modules/agenda/composables/useAppointmentNotes";
import type { AppointmentDetail } from "@/composables/appointments/types";

// COMPONENT
export const AppointmentContextTA = ({
  detail,
  canEdit,
  onSaved,
}: {
  detail: AppointmentDetail;
  canEdit: boolean;
  onSaved: () => void;
}) => {
  const notes = useAppointmentNotes(detail.id, detail.notes, canEdit, onSaved);
  return (
    <div className="space-y-3">
      <ReservationSupportTA key={detail.id} kind="appointment" id={detail.id} />
      <details className="rounded-xl border border-border p-4" open>
        <summary className="cursor-pointer text-sm font-semibold">
          <ClipboardList className="mr-2 inline size-4 text-primary" />
          Notas de la reserva
        </summary>
        <p className="mt-2 text-xs text-muted-foreground">
          Indicaciones y preferencias para preparar el servicio. Estas notas
          también pueden ser visibles para el cliente.
        </p>
        {canEdit ? (
          <>
            <label
              className="sr-only"
              htmlFor={`appointment-notes-${detail.id}`}
            >
              Notas de la reserva
            </label>
            <textarea
              id={`appointment-notes-${detail.id}`}
              value={notes.value}
              onChange={(event) => notes.setValue(event.target.value)}
              maxLength={2000}
              rows={3}
              disabled={notes.saving}
              placeholder="Preferencias, indicaciones o información acordada con el cliente…"
              className="mt-3 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {notes.saved ? "Notas guardadas" : `${notes.value.length}/2000`}
              </p>
              <ButtonTA
                variant="outline"
                disabled={!notes.dirty || notes.saving}
                onClick={() => {
                  void notes.save();
                }}
              >
                <Save className="size-4" />
                {notes.saving ? "Guardando…" : "Guardar notas"}
              </ButtonTA>
            </div>
            {notes.error && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {notes.error}
              </p>
            )}
          </>
        ) : (
          <p className="mt-3 whitespace-pre-wrap text-sm">
            {detail.notes || "No hay notas registradas."}
          </p>
        )}
      </details>
      <details className="rounded-xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          <CreditCard className="mr-2 inline size-4 text-primary" />
          Pagos registrados{" "}
          <span className="font-normal text-muted-foreground">
            ({detail.payments.length})
          </span>
        </summary>
        {detail.payments.length ? (
          <ul className="mt-3 divide-y divide-border">
            {detail.payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p>{payment.method}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {payment.status === "COMPLETED"
                      ? "Completado"
                      : payment.status === "PENDING"
                        ? "Pendiente"
                        : payment.status}
                    {payment.paid_at
                      ? ` · ${new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: detail.timezone || "America/Bogota" }).format(new Date(payment.paid_at))}`
                      : ""}
                  </p>
                </div>
                <strong>
                  {new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: payment.currency,
                  }).format(payment.amount)}
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            No se han registrado pagos para esta reserva. Completar el servicio
            no confirma un cobro.
          </p>
        )}
      </details>
      <details className="rounded-xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          <History className="mr-2 inline size-4 text-primary" />
          Historial de la cita{" "}
          <span className="font-normal text-muted-foreground">
            ({detail.timeline.length})
          </span>
        </summary>
        {detail.timeline.length ? (
          <ol className="ml-2 mt-4 border-l border-border pl-4">
            {detail.timeline.map((event) => (
              <li key={event.id} className="relative pb-4 text-sm">
                <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                <p className="font-medium">{event.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("es-CO", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: detail.timezone || "America/Bogota",
                  }).format(new Date(event.created_at))}
                </p>
                {event.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.description}
                  </p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Sin eventos adicionales registrados.
          </p>
        )}
      </details>
    </div>
  );
};
