import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  operationsService,
  operationError,
} from "@/modules/operations/services/operationsService";
import type {
  OperationsContext,
  ResourceDraft,
  ResourceOperationsResult,
} from "@/modules/operations/types";

// COMPOSABLE
export const useResourceOperations = (
  context: OperationsContext,
  reload: () => void,
): ResourceOperationsResult => {
  // SERVICES
  const { t } = useTranslation("operations");
  // STATE
  const [id, select] = useState(0);
  const [value, setValue] = useState<ResourceDraft>({
    name: "",
    branch_id: context.branches[0]?.id ?? 0,
    type: "SPACE",
    capacity: 1,
    is_active: true,
  });
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const pending = useRef(false);
  // LIFECYCLE
  useEffect(() => {
    const resource = context.resources.find((item) => item.id === id);
    setValue(
      resource
        ? {
            name: resource.name,
            branch_id: resource.branch_id,
            type: resource.type,
            capacity: resource.capacity,
            is_active: resource.is_active,
          }
        : {
            name: "",
            branch_id: context.branches[0]?.id ?? 0,
            type: "SPACE",
            capacity: 1,
            is_active: true,
          },
    );
    setSelected(
      context.resource_links
        .filter((link) => link.resource_id === id)
        .map((link) => link.service_id),
    );
    setError("");
  }, [id, context]);
  // ACTIONS
  const save = async (kind: "resource" | "services") => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      if (kind === "resource")
        select(
          await operationsService.resource(context.business.id, id, value),
        );
      else await operationsService.resourceServices(id, selected);
      setSaved(true);
      reload();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? operationError(failure, t("saveError"))
          : t("saveError"),
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  // EXPOSE
  return {
    form: {
      id,
      select,
      value,
      setField: (key, next) => {
        setSaved(false);
        setValue((current) => ({ ...current, [key]: next }));
      },
      save: () => save("resource"),
    },
    services: {
      selected,
      toggle: (serviceId) =>
        setSelected((current) =>
          current.includes(serviceId)
            ? current.filter((item) => item !== serviceId)
            : [...current, serviceId],
        ),
      save: () => save("services"),
    },
    feedback: { busy, error, saved },
  };
};
