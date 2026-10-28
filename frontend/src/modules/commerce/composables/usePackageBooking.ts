import { useRef, useState } from "react";
import { isAxiosError } from "axios";
import { commerceService } from "@/modules/commerce/commerceService";
import type {
  CommerceError,
  PackageBookingForm,
  PackageBookingState,
  PackageProposal,
} from "@/modules/commerce/types";

// COMPOSABLE
export const usePackageBooking = (
  packageId: number,
  branchId: number | undefined,
): PackageBookingState => {
  // STATE
  const [form, setForm] = useState<PackageBookingForm>({
    branchId: branchId ? String(branchId) : "",
    date: "",
    startTime: "",
  });
  const [proposal, setProposal] = useState<PackageProposal | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const key = useRef(crypto.randomUUID());
  // ACTIONS
  const setField = (field: keyof PackageBookingForm, value: string) => {
    if (running.current) return;
    setForm((current) => ({ ...current, [field]: value }));
    setProposal(null);
    setAccepted(false);
  };
  const run = async (action: () => Promise<void>): Promise<void> => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      const data = isAxiosError<CommerceError>(failure)
        ? failure.response?.data
        : undefined;
      setError(
        Object.values(data?.errors || {}).flat()[0] ||
          data?.message ||
          "No se pudo preparar el paquete.",
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const preview = () =>
    run(async () => {
      const response = await commerceService.preview(packageId, form);
      setProposal(response.data);
      setAccepted(false);
      key.current = crypto.randomUUID();
    });
  const confirm = () =>
    run(async () => {
      if (!proposal || !accepted || proposal.status !== "PREVIEW") return;
      const response = await commerceService.confirm(proposal.id, key.current);
      setProposal(response.data);
    });
  // PUBLIC API
  return {
    booking: { form, proposal, busy, error, accepted },
    actions: { setField, setAccepted, preview, confirm },
  };
};
