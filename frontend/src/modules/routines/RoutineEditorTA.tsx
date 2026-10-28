import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import {
  OperationFieldTA,
  OperationSelectTA,
} from "@/modules/operations/components/OperationFieldsTA";
import { useRoutineEditor } from "@/modules/routines/useRoutineEditor";
import type { BookingRoutine } from "@/modules/routines/types";
import type { ClientAppointment } from "@/composables/appointments/types";

// COMPONENT
export const RoutineEditorTA = ({
  appointments,
  reload,
  routine,
}: {
  appointments: ClientAppointment[];
  reload: () => void;
  routine?: BookingRoutine;
}) => {
  // COMPOSABLES
  const { t } = useTranslation("growth");
  const { form, feedback } = useRoutineEditor(reload, routine);
  // RENDER
  return (
    <form onSubmit={form.submit}>
      <fieldset disabled={feedback.busy} className="grid gap-4 sm:grid-cols-2">
        <OperationFieldTA label={t("name")}>
          <InputTA
            required
            maxLength={120}
            value={form.value.name}
            onChange={(event) => form.setField("name", event.target.value)}
          />
        </OperationFieldTA>
        {!routine && (
          <OperationFieldTA label={t("newRoutine")}>
            <OperationSelectTA
              required
              value={form.value.appointment_id || ""}
              onChange={(event) =>
                form.setField("appointment_id", Number(event.target.value))
              }
            >
              <option value="">{t("newRoutine")}</option>
              {appointments.map((item) => (
                <option key={item.id} value={item.id}>
                  #{item.id} · {item.service?.name} · {item.date}
                </option>
              ))}
            </OperationSelectTA>
          </OperationFieldTA>
        )}
        <OperationFieldTA label={t("start")}>
          <InputTA
            required
            type="date"
            value={form.value.start_date}
            onChange={(event) =>
              form.setField("start_date", event.target.value)
            }
          />
        </OperationFieldTA>
        <OperationFieldTA label={t("time")}>
          <InputTA
            required
            type="time"
            value={form.value.start_time}
            onChange={(event) =>
              form.setField("start_time", event.target.value)
            }
          />
        </OperationFieldTA>
        <OperationFieldTA label={t("weeks")}>
          <InputTA
            required
            type="number"
            min={1}
            max={52}
            value={form.value.interval_weeks}
            onChange={(event) =>
              form.setField("interval_weeks", Number(event.target.value))
            }
          />
        </OperationFieldTA>
        {!routine && (
          <OperationFieldTA label={t("occurrences")}>
            <InputTA
              required
              type="number"
              min={1}
              max={12}
              value={form.value.count}
              onChange={(event) =>
                form.setField("count", Number(event.target.value))
              }
            />
          </OperationFieldTA>
        )}
        <ButtonTA type="submit">
          {t(routine ? "save" : "createRoutine")}
        </ButtonTA>
        {feedback.error && (
          <p role="alert" className="text-sm text-destructive">
            {feedback.error}
          </p>
        )}
        {feedback.saved && (
          <p role="status" className="text-sm text-primary">
            {t("saved")}
          </p>
        )}
      </fieldset>
    </form>
  );
};
