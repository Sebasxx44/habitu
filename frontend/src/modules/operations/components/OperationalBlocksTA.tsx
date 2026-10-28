import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import {
  OperationFeedbackTA,
  OperationFieldTA,
  OperationSelectTA,
} from "@/modules/operations/components/OperationFieldsTA";
import { useBlockOperations } from "@/modules/operations/composables/useBlockOperations";
import type { OperationsContext } from "@/modules/operations/types";

// COMPONENT
export const OperationalBlocksTA = ({
  context,
  reload,
}: {
  context: OperationsContext;
  reload: () => void;
}) => {
  // COMPOSABLES
  const { t, i18n } = useTranslation("operations");
  const { form, feedback, remove } = useBlockOperations(context, reload);
  // RENDER
  return (
    <PanelTA
      title={t("blocks")}
      description={t("blocksDescription", { timezone: context.timezone })}
    >
      <div className="space-y-5 px-5 pb-6">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.save();
          }}
        >
          <fieldset
            disabled={feedback.busy}
            className="grid gap-4 sm:grid-cols-2"
          >
            <OperationFieldTA label={t("target")}>
              <OperationSelectTA
                value={form.value.target}
                onChange={(event) =>
                  form.setField("target", event.target.value)
                }
              >
                {context.professionals.map((item) => (
                  <option key={`p${item.id}`} value={`professional:${item.id}`}>
                    {t("absence")} · {item.name}
                  </option>
                ))}
                {context.can_manage_resources && (
                  <>
                    {context.resources.map((item) => (
                      <option key={`r${item.id}`} value={`resource:${item.id}`}>
                        {t("maintenance")} · {item.name}
                      </option>
                    ))}
                    {context.branches.map((item) => (
                      <option key={`b${item.id}`} value={`branch:${item.id}`}>
                        {t("closure")} · {item.name}
                      </option>
                    ))}
                  </>
                )}
              </OperationSelectTA>
            </OperationFieldTA>
            <OperationFieldTA label={t("reason")}>
              <InputTA
                required
                maxLength={500}
                value={form.value.reason}
                onChange={(event) =>
                  form.setField("reason", event.target.value)
                }
              />
            </OperationFieldTA>
            <OperationFieldTA label={t("start")}>
              <InputTA
                required
                type="datetime-local"
                value={form.value.starts_at}
                onChange={(event) =>
                  form.setField("starts_at", event.target.value)
                }
              />
            </OperationFieldTA>
            <OperationFieldTA label={t("end")}>
              <InputTA
                required
                type="datetime-local"
                value={form.value.ends_at}
                min={form.value.starts_at}
                onChange={(event) =>
                  form.setField("ends_at", event.target.value)
                }
              />
            </OperationFieldTA>
            <ButtonTA type="submit">{t("saveBlock")}</ButtonTA>
          </fieldset>
        </form>
        <OperationFeedbackTA feedback={feedback} />
        {context.blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noBlocks")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {context.blocks.map((block) => (
              <li
                key={block.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-medium">
                    {context.professionals.find(
                      (item) => item.id === block.professional_id,
                    )?.name ??
                      context.resources.find(
                        (item) => item.id === block.resource_id,
                      )?.name ??
                      context.branches.find(
                        (item) => item.id === block.branch_id,
                      )?.name}{" "}
                    · {block.reason}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat(i18n.language, {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: context.timezone,
                    }).format(new Date(block.starts_at))}{" "}
                    –{" "}
                    {new Intl.DateTimeFormat(i18n.language, {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: context.timezone,
                    }).format(new Date(block.ends_at))}
                  </p>
                </div>
                <ButtonTA
                  variant="outline"
                  disabled={feedback.busy}
                  onClick={() => void remove(block.id)}
                >
                  {t("removeBlock")}
                </ButtonTA>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PanelTA>
  );
};
