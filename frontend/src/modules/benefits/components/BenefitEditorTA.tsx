import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { TextareaTA } from "@/modules/benefits/components/TextareaTA";
import type { BenefitReference } from "@/modules/benefits/types";
import type {
  BenefitEditorState,
  BenefitForm,
} from "@/modules/benefits/adminTypes";

// COMPONENT
export const BenefitEditorTA = ({
  state,
  services,
  professionals = [],
}: {
  state: BenefitEditorState;
  services: BenefitReference[];
  professionals?: BenefitReference[];
}) => {
  const { t } = useTranslation("benefits");
  const { editor, actions } = state;
  const form = editor.form;
  const field = (
    key: { [K in keyof BenefitForm]: BenefitForm[K] extends string ? K : never }[keyof BenefitForm],
    label: string,
    type = "text",
    required = false,
    min?: number,
    max?: number,
  ) => (
    <label className="space-y-2 text-sm font-medium">
      <span>{t(`admin.${label}`)}</span>
      <InputTA
        type={type}
        required={required}
        min={min}
        max={max}
        step={type === "number" ? (["stamps", "appointments", "usageLimit", "perUserLimit"].includes(key) ? "1" : "0.01") : undefined}
        maxLength={key === "name" ? 150 : key === "reward" ? 255 : key === "code" ? 50 : undefined}
        minLength={key === "code" ? 3 : undefined}
        value={typeof form[key] === "string" ? form[key] : ""}
        onChange={(event) => actions.setForm({ [key]: event.target.value })}
      />
    </label>
  );
  return (
      <form
        id="benefit-editor"
        className="space-y-6 rounded-2xl border border-border bg-card p-5 md:p-7"
        onSubmit={(event) => {
          event.preventDefault();
          void actions.save();
        }}
      >
        <fieldset disabled={editor.busy} className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {field("name", "name", "text", true)}
            <label className="flex items-center gap-3 self-end py-3 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={form.active}
                onChange={(event) =>
                  actions.setForm({ active: event.target.checked })
                }
              />
              {t("admin.active")}
            </label>
          </div>
          <label className="block space-y-2 text-sm font-medium">
            <span>{t("admin.descriptionField")}</span>
            <TextareaTA
              value={form.description}
              onChange={(event) =>
                actions.setForm({ description: event.target.value })
              }
              maxLength={2000}
            />
          </label>
          {editor.kind === "programs" && (
            <>
              <p className="rounded-xl bg-secondary p-3 text-xs leading-relaxed text-secondary-foreground">
                {t("admin.programNotice")}
              </p>
              <div className="grid gap-5 sm:grid-cols-2">
                {field("stamps", "required", "number", true, 1, 50)}
                {field("validUntil", "expires", "date")}
                {field("reward", "reward", "text", true)}
                <label className="space-y-2 text-sm font-medium"><span>Profesional participante</span><select value={form.professionalId ?? ""} onChange={(event) => actions.setForm({ professionalId: event.target.value ? Number(event.target.value) : null })} className="h-11 w-full rounded-xl border border-input bg-background px-3"><option value="">Todos los profesionales</option>{professionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.name}</option>)}</select></label>
                <label className="space-y-2 text-sm font-medium">
                  <span>{t("admin.services")}</span>
                  <select
                    value={form.serviceId}
                    onChange={(event) =>
                      actions.setForm({ serviceId: event.target.value })
                    }
                    className="h-11 w-full rounded-xl border border-input bg-background px-3"
                  >
                    <option value="">{t("allServices")}</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}
          {editor.kind === "plans" && (
            <>
              <p className="rounded-xl bg-secondary p-3 text-xs leading-relaxed text-secondary-foreground">
                {t("admin.planNotice")}
              </p>
              <div className="grid gap-5 sm:grid-cols-2">
                {field("price", "price", "number", true, 0, 5000000)}
                <label className="space-y-2 text-sm font-medium">
                  <span>{t("admin.cycle")}</span>
                  <select
                    value={form.cycle}
                    onChange={(event) =>
                      actions.setForm({
                        cycle: event.target.value as BenefitForm["cycle"],
                      })
                    }
                    className="h-11 w-full rounded-xl border border-input bg-background px-3"
                  >
                    {(["MONTHLY", "QUARTERLY", "YEARLY"] as const).map(
                      (cycle) => (
                        <option key={cycle} value={cycle}>
                          {t(`cycles.${cycle}`)}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                {field("appointments", "appointments", "number", true, 0, 100)}
                {field(
                  "discountPercentage",
                  "discount",
                  "number",
                  true,
                  0,
                  100,
                )}
              </div>
              <label className="block space-y-2 text-sm font-medium">
                <span>{t("admin.benefits")}</span>
                <TextareaTA
                  value={form.benefits}
                  onChange={(event) =>
                    actions.setForm({ benefits: event.target.value })
                  }
                  rows={3}
                />
              </label>
            </>
          )}
          {editor.kind === "promotions" && (
            <>
              <p className="rounded-xl bg-secondary p-3 text-xs leading-relaxed text-secondary-foreground">
                {t("admin.promotionNotice")}
              </p>
              <div className="grid gap-5 sm:grid-cols-2">
                {field("code", "code", "text", true)}
                <label className="space-y-2 text-sm font-medium">
                  <span>{t("admin.promoType")}</span>
                  <select
                    value={form.discountType}
                    onChange={(event) =>
                      actions.setForm({
                        discountType: event.target
                          .value as BenefitForm["discountType"],
                      })
                    }
                    className="h-11 w-full rounded-xl border border-input bg-background px-3"
                  >
                    <option value="PERCENTAGE">{t("admin.percentage")}</option>
                    <option value="FIXED_AMOUNT">{t("admin.fixed")}</option>
                  </select>
                </label>
                {field(
                  "discount",
                  "amount",
                  "number",
                  true,
                  0,
                  form.discountType === "PERCENTAGE" ? 100 : 5000000,
                )}
                {field("startsAt", "starts", "date", true)}
                {field("endsAt", "expires", "date", true)}
                {field("minimum", "min", "number", false, 0)}
                {field("maximum", "max", "number", false, 0)}
                {field("usageLimit", "totalUses", "number", false, 1)}
                {field("perUserLimit", "userUses", "number", false, 1)}
              </div>
            </>
          )}
          {editor.kind !== "programs" && (
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">
                {t("admin.services")}
              </legend>
              <p className="text-xs text-muted-foreground">
                {t("admin.allServices")}
              </p>
              <div className="grid max-h-44 gap-3 overflow-y-auto rounded-xl border border-border p-4 sm:grid-cols-2">
                {services.map((service) => (
                  <label
                    key={service.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={form.serviceIds.includes(service.id)}
                      onChange={(event) =>
                        actions.setForm({
                          serviceIds: event.target.checked
                            ? [...form.serviceIds, service.id]
                            : form.serviceIds.filter((id) => id !== service.id),
                        })
                      }
                    />
                    {service.name}
                  </label>
                ))}
              </div>
              {editor.kind === "promotions" && form.serviceIds.length > 0 && (
                <div className="space-y-3 rounded-xl bg-secondary/50 p-4">
                  <p className="text-sm font-semibold">Descuento por servicio</p>
                  <p className="text-xs text-muted-foreground">Cada servicio puede tener un beneficio diferente. El descuento general se usa cuando no hay una regla específica.</p>
                  {form.serviceIds.map((id) => {
                    const rule = form.serviceDiscounts.find((item) => item.id === id);
                    const update = (values: { type?: "PERCENTAGE" | "FIXED_AMOUNT"; discount?: string }) => actions.setForm({ serviceDiscounts: [...form.serviceDiscounts.filter((item) => item.id !== id), { id, type: rule?.type ?? form.discountType, discount: rule?.discount ?? form.discount, ...values }] });
                    return <div key={id} className="grid gap-2 sm:grid-cols-[1fr_140px_120px] sm:items-center">
                      <span className="text-sm">{services.find((service) => service.id === id)?.name ?? `Servicio ${id}`}</span>
                      <select aria-label={`Tipo de descuento para ${services.find((service) => service.id === id)?.name ?? id}`} className="h-11 rounded-xl border border-input bg-background px-3 text-sm" value={rule?.type ?? form.discountType} onChange={(event) => update({ type: event.target.value === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE" })}><option value="PERCENTAGE">Porcentaje</option><option value="FIXED_AMOUNT">Monto COP</option></select>
                      <InputTA aria-label={`Descuento para ${services.find((service) => service.id === id)?.name ?? id}`} type="number" required min={0} max={(rule?.type ?? form.discountType) === "PERCENTAGE" ? 100 : 5000000} step="0.01" value={rule?.discount ?? form.discount} onChange={(event) => update({ discount: event.target.value })} />
                    </div>;
                  })}
                </div>
              )}
            </fieldset>
          )}
        </fieldset>
        {editor.error && (
          <p role="alert" className="text-sm text-destructive">
            {editor.error}
          </p>
        )}
        <ButtonTA type="submit" className="w-full" disabled={editor.busy}>
          {t("admin.save")}
        </ButtonTA>
      </form>
  );
};
