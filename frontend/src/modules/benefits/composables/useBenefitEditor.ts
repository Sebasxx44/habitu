import { useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { benefitToday } from "@/modules/benefits/adminPresentation";
import { adminBenefitsApi } from "@/modules/benefits/adminBenefitsApi";
import type { BenefitResponse } from "@/modules/benefits/types";
import type {
  AdminBenefitRecord,
  BenefitAdminKind,
  BenefitEditorState,
  BenefitForm,
  BenefitWrite,
} from "@/modules/benefits/adminTypes";

// CONFIGURATION
const emptyForm = (): BenefitForm => ({
  name: "",
  description: "",
  active: true,
  stamps: "5",
  reward: "",
  validUntil: "",
  serviceId: "",
  professionalId: null,
  price: "0",
  cycle: "MONTHLY",
  appointments: "1",
  discountPercentage: "0",
  benefits: "",
  serviceIds: [],
  code: "",
  discountType: "PERCENTAGE",
  discount: "10",
  startsAt: benefitToday(),
  endsAt: "",
  minimum: "",
  maximum: "",
  usageLimit: "",
  perUserLimit: "1",
  serviceDiscounts: [],
});
const recordForm = (kind: BenefitAdminKind, item?: AdminBenefitRecord): BenefitForm => (
      item
        ? {
            ...emptyForm(),
            name: item.name ?? item.title ?? "",
            description: item.description ?? "",
            active: item.active ?? item.is_active ?? true,
            stamps: String(item.stamps_required ?? 5),
            reward: item.reward_description ?? "",
            validUntil: item.valid_until?.slice(0, 10) ?? "",
            serviceId: item.service_id ? String(item.service_id) : "",
            professionalId: item.professional_id ?? null,
            price: String(item.price ?? 0),
            cycle: item.billing_cycle ?? "MONTHLY",
            appointments: String(item.appointments_included ?? 0),
            discountPercentage: String(item.discount_percentage ?? 0),
            benefits: (item.benefits ?? []).join("\n"),
            serviceIds:
              kind === "plans"
                ? (item.included_services ?? [])
                : (item.services?.map((service) => service.id) ?? []),
            code: item.promo_code ?? "",
            discountType:
              item.type === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE",
            discount: String(item.discount ?? 10),
            startsAt: item.start_date?.slice(0, 10) ?? "",
            endsAt: item.end_date?.slice(0, 10) ?? "",
            minimum: String(item.min_purchase ?? ""),
            maximum: String(item.max_discount ?? ""),
            usageLimit: String(item.usage_limit ?? ""),
            perUserLimit: String(item.per_user_limit ?? ""),
            serviceDiscounts: item.services?.map((service) => ({ id: service.id, type: service.pivot.type === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE", discount: String(service.pivot.discount) })) ?? [],
          }
        : emptyForm()
);
const nullableNumber = (value: string): number | null =>
  value.trim() ? Number(value) : null;
// COMPOSABLE
export const useBenefitEditor = (
  businessId: number | null,
  refresh: () => void,
  initialKind: BenefitAdminKind = "programs",
  initialRecord?: AdminBenefitRecord,
): BenefitEditorState => {
  const { t } = useTranslation("benefits");
  // STATE
  const kind = initialKind;
  const record = initialRecord;
  const [form, setForm] = useState<BenefitForm>(() => recordForm(initialKind, initialRecord));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  // ACTIONS
  const save = async () => {
    if (!businessId || busy.current) return;
    if (!form.name.trim() || (kind === "programs" && !form.reward.trim())) {
      setError("Completa el nombre y la recompensa del programa.");
      return;
    }
    if (kind === "promotions" && (!form.startsAt || !form.endsAt || form.endsAt < form.startsAt)) {
      setError("La fecha final debe ser igual o posterior al inicio.");
      return;
    }
    if (kind === "plans" && Number(form.appointments) < 1 && Number(form.discountPercentage) <= 0) {
      setError("Incluye al menos una cita o un descuento real en la membresía.");
      return;
    }
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const data: BenefitWrite = {
        business_id: businessId,
        description: form.description,
      };
      if (kind === "programs")
        Object.assign(data, {
          name: form.name.trim(),
          active: form.active,
          stamps_required: Number(form.stamps),
          reward_description: form.reward,
          valid_until: form.validUntil || null,
          service_id: nullableNumber(form.serviceId),
          professional_id: form.professionalId,
        });
      if (kind === "plans")
        Object.assign(data, {
          name: form.name.trim(),
          is_active: form.active,
          price: Number(form.price),
          currency: "COP",
          billing_cycle: form.cycle,
          appointments_included: Number(form.appointments),
          discount_percentage: Number(form.discountPercentage),
          included_services: form.serviceIds,
          benefits: form.benefits
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
        });
      if (kind === "promotions")
        Object.assign(data, {
          title: form.name.trim(),
          is_active: form.active,
          promo_code: form.code.trim().toUpperCase(),
          type: form.discountType,
          discount: Number(form.discount),
          start_date: form.startsAt,
          end_date: form.endsAt,
          min_purchase: nullableNumber(form.minimum),
          max_discount: nullableNumber(form.maximum),
          usage_limit: nullableNumber(form.usageLimit),
          per_user_limit: nullableNumber(form.perUserLimit),
          services: form.serviceIds.map((id) => {
            const rule = form.serviceDiscounts.find((service) => service.id === id);
            return {
              id,
              type: rule?.type ?? form.discountType,
              discount: Number(rule?.discount ?? form.discount),
            };
          }),
        });
      await adminBenefitsApi.save(kind, record?.id ?? null, data);
      refresh();
    } catch (cause) {
      const response = isAxiosError<BenefitResponse<null> & { errors?: Record<string, string[]> }>(cause)
        ? cause.response?.data
        : undefined;
      setError(Object.values(response?.errors ?? {}).flat().join(" ") || response?.message || response?.error || t("admin.formError"));
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  // RETURN
  return {
    editor: {
      kind,
      form,
      busy: pending,
      error,
    },
    actions: {
      setForm: (update) => setForm((current) => ({ ...current, ...update })),
      save,
    },
  };
};
