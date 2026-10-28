import { useState } from "react";
import { providerReviewService } from "@/modules/provider-reviews/service";
import type {
  ProviderCheck,
  ProviderCheckState,
  ProviderDecision,
  ReviewSubject,
} from "@/modules/provider-reviews/types";

// COMPOSABLE
export const useProviderCheck = (
  subject: ReviewSubject,
  code: string,
  check: ProviderCheck | undefined,
  reload: () => Promise<void>,
): ProviderCheckState => {
  // STATE
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [reason, setReason] = useState("");
  const [expiry, setExpiry] = useState("");
  const [reviewed, setReviewed] = useState(false);
  // ACTIONS
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(false);
    try {
      await work();
      await reload();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const submit = async () =>
    run(async () => {
      await providerReviewService.submit(subject, code);
    });
  const upload = async (file: File) =>
    run(async () => {
      if (check) await providerReviewService.upload(subject, check.id, file);
    });
  const download = async (document: { id: number; name: string }) =>
    run(async () => {
      if (check)
        await providerReviewService.download(subject, check.id, document);
    });
  const decide = async (state: ProviderDecision) =>
    run(async () => {
      if (check)
        await providerReviewService.decide(
          subject,
          check.id,
          state,
          reason,
          expiry,
          reviewed,
        );
    });
  // RETURN
  return {
    data: { busy, error },
    form: { reason, setReason, expiry, setExpiry, reviewed, setReviewed },
    actions: { submit, upload, download, decide },
  };
};
