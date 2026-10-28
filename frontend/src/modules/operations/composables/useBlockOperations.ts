import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  operationsService,
  operationError,
} from "@/modules/operations/services/operationsService";
import type {
  BlockDraft,
  BlockOperationsResult,
  OperationsContext,
} from "@/modules/operations/types";

// COMPOSABLE
export const useBlockOperations = (
  context: OperationsContext,
  reload: () => void,
): BlockOperationsResult => {
  // SERVICES
  const { t } = useTranslation("operations");
  // STATE
  const [value, setValue] = useState<BlockDraft>({
    target: context.professionals[0]
      ? `professional:${context.professionals[0].id}`
      : context.resources[0]
        ? `resource:${context.resources[0].id}`
        : `branch:${context.branches[0]?.id ?? 0}`,
    starts_at: "",
    ends_at: "",
    reason: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const pending = useRef(false);
  // ACTIONS
  const mutate = async (id?: number) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      if (id) await operationsService.removeBlock(id);
      else await operationsService.block(context.business.id, value);
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
      value,
      setField: (key, next) => {
        setSaved(false);
        setValue((current) => ({ ...current, [key]: next }));
      },
      save: () => mutate(),
    },
    feedback: { busy, error, saved },
    remove: (id) => mutate(id),
  };
};
