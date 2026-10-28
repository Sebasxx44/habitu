import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useRealtimeRevision } from "@/modules/realtime/useRealtimeRefresh";
import { professionalsService } from "@/modules/professionals/professionalsService";
import type {
  ProfessionalRecord,
  ProfessionalsDirectoryReturn,
} from "@/modules/professionals/types";

// COMPOSABLE
export const useProfessionalsDirectory = (
  businessId?: number | null,
): ProfessionalsDirectoryReturn => {
  // STATE
  const [items, setItems] = useState<ProfessionalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [params, setParams] = useSearchParams();
  const revision = useRealtimeRevision(["professionals"]);
  const search = params.get("search") ?? "";
  const status = params.get("status") ?? "all";
  const specialty = params.get("specialty") ?? "all";
  const sort = params.get("sort") ?? "name";

  // SERVICES
  const reload = useCallback(async () => {
    if (!businessId) {
      setError("No tienes un negocio asignado.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setItems(await professionalsService.list(businessId));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No pudimos cargar el equipo.",
      );
    } finally {
      setLoading(false);
    }
  }, [businessId]);
  useEffect(() => {
    void reload();
  }, [reload, revision]);

  // COMPUTED
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return items
      .filter(
        (item) =>
          [item.name, item.email, item.phone, item.specialty].some((value) =>
            value?.toLocaleLowerCase().includes(query),
          ) &&
          (status === "all" || item.is_active === (status === "active")) &&
          (specialty === "all" || item.specialty === specialty),
      )
      .sort((a, b) =>
        sort === "commission"
          ? (b.commission_percentage ?? 0) - (a.commission_percentage ?? 0)
          : sort === "recent"
            ? b.id - a.id
            : a.name.localeCompare(b.name, "es"),
      );
  }, [items, search, status, specialty, sort]);
  const specialties = [
    ...new Set(
      items
        .map((item) => item.specialty)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();
  const active = items.filter((item) => item.is_active).length;
  const scheduled = items.filter((item) =>
    item.availability.some((slot) => slot.is_available),
  ).length;
  const averageCommission = items.length
    ? items.reduce(
        (total, item) => total + (item.commission_percentage ?? 0),
        0,
      ) / items.length
    : 0;

  // ACTIONS
  const update = (key: string, value: string) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (!value || value === "all" || (key === "sort" && value === "name"))
          next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  const exportCsv = () => {
    const quote = (value: string | number) =>
      `"${String(value)
        .replace(/^[=+@-]/, "'$&")
        .replace(/"/g, '""')}"`;
    const rows = [
      [
        "Nombre",
        "Especialidad",
        "Correo",
        "Teléfono",
        "Comisión (%)",
        "Estado",
      ],
      ...filtered.map((item) => [
        item.name,
        item.specialty ?? "",
        item.email ?? "",
        item.phone ?? "",
        item.commission_percentage ?? 0,
        item.is_active ? "Activo" : "Inactivo",
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((row) => row.map(quote).join(";")).join("\r\n")],
        { type: "text/csv;charset=utf-8;" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "profesionales.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // RETURN
  return {
    data: {
      items,
      filtered,
      specialties,
      active,
      scheduled,
      averageCommission,
    },
    filters: {
      search,
      status,
      specialty,
      sort,
      update,
      clear: () => setParams({}),
      hasFilters: Boolean(search || status !== "all" || specialty !== "all"),
    },
    request: { loading, error, reload },
    actions: { exportCsv },
  };
};
