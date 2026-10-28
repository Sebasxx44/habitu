import { useTranslation } from "react-i18next";
import { Layers3, PackagePlus } from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { OperationFieldTA } from "@/modules/operations/components/OperationFieldsTA";
import { PackageBookingTA } from "@/modules/commerce/components/PackageBookingTA";
import { usePackageManager } from "@/modules/commerce/composables/usePackageManager";
import type { CommerceContext } from "@/modules/commerce/types";

// COMPONENT
export const PackagesTA = ({
  data,
  refresh,
}: {
  data: CommerceContext;
  refresh: () => void;
}) => {
  // COMPOSABLES
  const { t } = useTranslation("commerce");
  const { editor, actions } = usePackageManager(data.business_id, refresh);
  return (
    <div className="space-y-5">
      {data.can_manage && (
        <PanelTA title={t("createPackage")} description={t("consecutive")} icon={PackagePlus}>
          <form
            className="space-y-4 px-5 pb-5"
            onSubmit={(event) => {
              event.preventDefault();
              void actions.save();
            }}
          >
            <OperationFieldTA label={t("name")}>
              <InputTA
                required
                maxLength={150}
                value={editor.form.name}
                onChange={(event) =>
                  actions.setField("name", event.target.value)
                }
              />
            </OperationFieldTA>
            <OperationFieldTA label={t("descriptionField")}>
              <InputTA
                maxLength={1000}
                value={editor.form.description}
                onChange={(event) =>
                  actions.setField("description", event.target.value)
                }
              />
            </OperationFieldTA>
            <p className="text-xs text-muted-foreground">{t("selectOrder")}</p>
            <div className="flex flex-wrap gap-2">
              {data.services.map((service) => (
                <ButtonTA
                  key={service.id}
                  type="button"
                  variant={
                    editor.form.serviceIds.includes(service.id)
                      ? "default"
                      : "outline"
                  }
                  disabled={editor.busy}
                  onClick={() => actions.toggleService(service.id)}
                >
                  {editor.form.serviceIds.includes(service.id)
                    ? `${editor.form.serviceIds.indexOf(service.id) + 1}. `
                    : ""}
                  {service.name}
                </ButtonTA>
              ))}
            </div>
            <ButtonTA
              type="submit"
              loading={editor.busy}
              disabled={editor.busy || editor.form.serviceIds.length < 2}
            >
              {t("savePackage")}
            </ButtonTA>
          </form>
        </PanelTA>
      )}
      {editor.error && (
        <p role="alert" className="text-sm text-destructive">
          {editor.error}
        </p>
      )}
      {!data.packages.length && (
        <PanelTA title={t("title")} icon={Layers3}>
          <StateTA title={t("empty")} description={t("consecutive")} />
        </PanelTA>
      )}
      {data.packages.map((item) => (
        <PanelTA
          key={item.id}
          icon={Layers3}
          title={item.name}
          description={item.description || t("consecutive")}
        >
          <div className="space-y-4 px-5 pb-5">
            <ol className="list-inside list-decimal space-y-2 rounded-xl bg-primary/5 p-4 text-sm text-muted-foreground marker:font-semibold marker:text-primary">
              {item.service_ids.map((id) => (
                <li key={id}>
                  {data.services.find((service) => service.id === id)?.name ||
                    `#${id}`}
                </li>
              ))}
            </ol>
            {data.can_manage ? (
              <ButtonTA
                variant="outline"
                disabled={editor.busy}
                onClick={() => void actions.remove(item.id)}
              >
                {t("deactivate")}
              </ButtonTA>
            ) : (
              <PackageBookingTA item={item} branches={data.branches} />
            )}
          </div>
        </PanelTA>
      ))}
    </div>
  );
};
