import { useRef, useState } from "react";
import { isAxiosError } from "axios";
import { adminBenefitsApi } from "@/modules/benefits/adminBenefitsApi";
import { benefitRecordStatus } from "@/modules/benefits/adminPresentation";
import type {
  AdminBenefitRecord,
  AdminBenefitsData,
  AdminBenefitsDirectoryState,
  BenefitAdminKind,
} from "@/modules/benefits/adminTypes";
import type { BenefitResponse } from "@/modules/benefits/types";

// COMPOSABLE
export const useAdminBenefitDirectory = (
  kind: BenefitAdminKind,
  data: AdminBenefitsData | null,
  refresh: () => void,
): AdminBenefitsDirectoryState => {
  // STATE
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [selected, setSelected] = useState<AdminBenefitRecord | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const busy = useRef(false);
  // COMPUTED
  const items = (data?.[kind] ?? []).filter((record) => {
    const text =
      `${record.name ?? record.title ?? ""} ${record.description ?? ""} ${record.promo_code ?? ""} ${record.reward_description ?? ""}`.toLocaleLowerCase();
    const selectedService = Number(serviceId);
    const services =
      kind === "programs"
        ? record.service_id
          ? [record.service_id]
          : []
        : kind === "plans"
          ? (record.included_services ?? [])
          : (record.services?.map((service) => service.id) ?? []);
    return (
      text.includes(search.trim().toLocaleLowerCase()) &&
      (!status || benefitRecordStatus(record) === status) &&
      (!serviceId ||
        services.length === 0 ||
        services.includes(selectedService))
    );
  });
  // ACTIONS
  const confirm = async (): Promise<void> => {
    if (!selected || !data || busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await adminBenefitsApi.archive(kind, selected.id, data.business_id);
      setSuccess(
        "Beneficio pausado. Se conserva el historial de los clientes.",
      );
      setSelected(null);
      refresh();
    } catch (cause) {
      const response = isAxiosError<BenefitResponse<null>>(cause)
        ? cause.response?.data
        : null;
      setError(response?.message || "No pudimos pausar el beneficio.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  // RETURN
  return {
    filters: {
      search,
      setSearch,
      status,
      setStatus,
      serviceId,
      setServiceId,
      reset: () => {
        setSearch("");
        setStatus("");
        setServiceId("");
      },
    },
    records: { items, total: data?.[kind].length ?? 0 },
    removal: {
      selected,
      busy: pending,
      error,
      success,
      select: (record) => {
        if (!busy.current) {
          setSelected(record);
          setError(null);
          setSuccess(null);
        }
      },
      confirm,
    },
  };
};
