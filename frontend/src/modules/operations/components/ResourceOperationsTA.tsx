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
import { useResourceOperations } from "@/modules/operations/composables/useResourceOperations";
import type { OperationsContext } from "@/modules/operations/types";

// COMPONENT
export const ResourceOperationsTA = ({
  context,
  reload,
}: {
  context: OperationsContext;
  reload: () => void;
}) => {
  // COMPOSABLES
  const { t } = useTranslation("operations");
  const { form, services, feedback } = useResourceOperations(context, reload);
  // RENDER
  return (
    <PanelTA title={t("resources")} description={t("resourcesDescription")}>
      <fieldset disabled={feedback.busy} className="space-y-5 px-5 pb-6">
        <OperationFieldTA label={t("resource")}>
          <OperationSelectTA
            value={form.id}
            onChange={(event) => form.select(Number(event.target.value))}
          >
            <option value={0}>{t("newResource")}</option>
            {context.resources.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </OperationSelectTA>
        </OperationFieldTA>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.save();
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <OperationFieldTA label={t("name")}>
            <InputTA
              required
              maxLength={255}
              value={form.value.name}
              onChange={(event) => form.setField("name", event.target.value)}
            />
          </OperationFieldTA>
          <OperationFieldTA label={t("branch")}>
            <OperationSelectTA
              disabled={Boolean(form.id)}
              value={form.value.branch_id}
              onChange={(event) =>
                form.setField("branch_id", Number(event.target.value))
              }
            >
              {context.branches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </OperationSelectTA>
          </OperationFieldTA>
          <OperationFieldTA label={t("type")}>
            <OperationSelectTA
              value={form.value.type}
              onChange={(event) => form.setField("type", event.target.value)}
            >
              {[
                "FIELD",
                "ROOM",
                "CHAIR",
                "CABIN",
                "MACHINE",
                "SPACE",
                "COURT",
                "STATION",
                "TABLE",
                "EQUIPMENT",
                "OTHER",
              ].map((type) => (
                <option key={type} value={type}>
                  {t(`resourceTypes.${type}`)}
                </option>
              ))}
            </OperationSelectTA>
          </OperationFieldTA>
          <OperationFieldTA label={t("capacity")}>
            <InputTA
              type="number"
              required
              min={1}
              max={10000}
              value={form.value.capacity}
              onChange={(event) =>
                form.setField("capacity", Number(event.target.value))
              }
            />
          </OperationFieldTA>
          <label className="flex items-center gap-2 text-sm">
            <InputTA
              type="checkbox"
              className="min-h-4 w-4 accent-primary"
              checked={form.value.is_active}
              onChange={(event) =>
                form.setField("is_active", event.target.checked)
              }
            />
            {t("active")}
          </label>
          <ButtonTA type="submit" disabled={!form.value.branch_id}>
            {t("saveResource")}
          </ButtonTA>
        </form>
        {form.id > 0 && (
          <div className="space-y-3 border-t border-border pt-5">
            <h3 className="font-semibold">{t("services")}</h3>
            <OperationServicesTA
              services={context.services}
              selected={services.selected}
              toggle={services.toggle}
            />
            <ButtonTA variant="outline" onClick={() => void services.save()}>
              {t("saveServices")}
            </ButtonTA>
          </div>
        )}
        <OperationFeedbackTA feedback={feedback} />
      </fieldset>
    </PanelTA>
  );
};
