import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import {
  OperationFeedbackTA,
  OperationFieldTA,
  OperationSelectTA,
  OperationServicesTA,
} from "@/modules/operations/components/OperationFieldsTA";
import { useProfessionalOperations } from "@/modules/operations/composables/useProfessionalOperations";
import type { OperationsContext } from "@/modules/operations/types";

// COMPONENT
export const ProfessionalScheduleTA = ({
  context,
  reload,
  initialId,
}: {
  context: OperationsContext;
  reload: () => void;
  initialId?: number;
}) => {
  // COMPOSABLES
  const { t } = useTranslation("operations");
  const { selection, schedule, services, feedback } = useProfessionalOperations(
    context,
    reload,
    initialId,
  );
  // RENDER
  return (
    <PanelTA title={t("schedule")} description={t("scheduleDescription")}>
      <fieldset disabled={feedback.busy} className="space-y-5 px-5 pb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <OperationFieldTA label={t("professional")}>
            <OperationSelectTA
              value={selection.professionalId}
              onChange={(event) =>
                selection.setProfessionalId(Number(event.target.value))
              }
            >
              {context.professionals.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </OperationSelectTA>
          </OperationFieldTA>
          <OperationFieldTA label={t("branch")}>
            <OperationSelectTA
              value={selection.branchId}
              onChange={(event) =>
                selection.setBranchId(Number(event.target.value))
              }
            >
              {context.branches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </OperationSelectTA>
          </OperationFieldTA>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void schedule.save();
          }}
          className="space-y-4"
        >
          {schedule.slots.map((slot) => (
            <div
              key={slot.day_of_week}
              className="grid items-end gap-3 rounded-xl border border-border p-4 sm:grid-cols-5"
            >
              <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                <InputTA
                  type="checkbox"
                  className="min-h-4 w-4 accent-primary"
                  checked={slot.is_available}
                  onChange={(event) =>
                    schedule.update(
                      slot.day_of_week,
                      "is_available",
                      event.target.checked,
                    )
                  }
                />
                {t(`days.${slot.day_of_week}`)}
              </label>
              <OperationFieldTA label={t("start")}>
                <InputTA
                  type="time"
                  required
                  disabled={!slot.is_available}
                  value={slot.start_time}
                  onChange={(event) =>
                    schedule.update(
                      slot.day_of_week,
                      "start_time",
                      event.target.value,
                    )
                  }
                />
              </OperationFieldTA>
              <OperationFieldTA label={t("end")}>
                <InputTA
                  type="time"
                  required
                  disabled={!slot.is_available}
                  value={slot.end_time}
                  onChange={(event) =>
                    schedule.update(
                      slot.day_of_week,
                      "end_time",
                      event.target.value,
                    )
                  }
                />
              </OperationFieldTA>
              <OperationFieldTA label={t("breakStart")}>
                <InputTA
                  type="time"
                  disabled={!slot.is_available}
                  value={slot.break_start_time ?? ""}
                  onChange={(event) =>
                    schedule.update(
                      slot.day_of_week,
                      "break_start_time",
                      event.target.value || null,
                    )
                  }
                />
              </OperationFieldTA>
              <OperationFieldTA label={t("breakEnd")}>
                <InputTA
                  type="time"
                  disabled={!slot.is_available}
                  value={slot.break_end_time ?? ""}
                  onChange={(event) =>
                    schedule.update(
                      slot.day_of_week,
                      "break_end_time",
                      event.target.value || null,
                    )
                  }
                />
              </OperationFieldTA>
            </div>
          ))}
          <ButtonTA
            type="submit"
            disabled={!selection.professionalId || !selection.branchId}
          >
            {t("saveSchedule")}
          </ButtonTA>
        </form>
        <div className="space-y-3 border-t border-border pt-5">
          <h3 className="font-semibold">{t("services")}</h3>
          <OperationServicesTA
            services={context.services}
            selected={services.selected}
            toggle={services.toggle}
          />
          <ButtonTA
            variant="outline"
            disabled={!selection.professionalId || !selection.branchId}
            onClick={() => void services.save()}
          >
            {t("saveServices")}
          </ButtonTA>
        </div>
        <OperationFeedbackTA feedback={feedback} />
      </fieldset>
    </PanelTA>
  );
};
