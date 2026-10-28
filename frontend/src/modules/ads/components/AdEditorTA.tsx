import { useTranslation } from "react-i18next";
import { PanelTA } from "@/components/TA/PanelTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import {
  OperationFieldTA,
  OperationSelectTA,
} from "@/modules/operations/components/OperationFieldsTA";
import type { AdEditorState, AdForm, AdsDirectory } from "@/modules/ads/types";

// COMPONENT
export const AdEditorTA = ({
  state,
  businesses,
}: {
  state: AdEditorState;
  businesses: AdsDirectory["businesses"];
}) => {
  // COMPOSABLES
  const { t } = useTranslation("ads");
  const { editor, actions } = state;
  // CONFIGURATION
  const fields: {
    field: keyof AdForm;
    label: string;
    type: string;
    required?: boolean;
  }[] = [
    { field: "title", label: "name", type: "text", required: true },
    { field: "description", label: "content", type: "text" },
    { field: "image_url", label: "image", type: "url" },
    { field: "start_date", label: "start", type: "date", required: true },
    { field: "end_date", label: "end", type: "date", required: true },
    { field: "budget", label: "budget", type: "number" },
    { field: "impression_limit", label: "viewsLimit", type: "number" },
    { field: "click_limit", label: "clicksLimit", type: "number" },
  ];
  return (
    <PanelTA
      title={t(editor.id ? "edit" : "create")}
      description={t("reviewHelp")}
    >
      <form
        className="grid gap-4 px-5 pb-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void actions.save();
        }}
      >
        <OperationFieldTA label={t("business")}>
          <OperationSelectTA
            value={editor.form.business_id}
            disabled={editor.busy || editor.id !== null}
            onChange={(event) =>
              actions.setField("business_id", event.target.value)
            }
          >
            {businesses.map((business) => (
              <option value={business.id} key={business.id}>
                {business.name}
              </option>
            ))}
          </OperationSelectTA>
        </OperationFieldTA>
        {fields.map((field) => (
          <OperationFieldTA label={t(field.label)} key={field.field}>
            <InputTA
              type={field.type}
              required={field.required}
              min={
                field.type === "number"
                  ? field.field === "budget"
                    ? 0
                    : 1
                  : undefined
              }
              step={field.field === "budget" ? "0.01" : undefined}
              maxLength={field.field === "description" ? 1000 : 255}
              value={editor.form[field.field]}
              disabled={editor.busy}
              onChange={(event) =>
                actions.setField(field.field, event.target.value)
              }
            />
          </OperationFieldTA>
        ))}
        {editor.error && (
          <p role="alert" className="text-sm text-destructive sm:col-span-2">
            {editor.error}
          </p>
        )}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <ButtonTA type="submit" disabled={editor.busy || !businesses.length}>
            {t("save")}
          </ButtonTA>
          {editor.id && (
            <ButtonTA
              type="button"
              variant="outline"
              disabled={editor.busy}
              onClick={actions.reset}
            >
              {t("cancel")}
            </ButtonTA>
          )}
        </div>
      </form>
    </PanelTA>
  );
};
