import { httpService } from '@/services/auth/authService';
import { useNavigate } from 'react-router-dom';
import { useReservationPayment } from '@/modules/checkout/useReservationPayment';
import { checkoutService } from '@/modules/checkout/checkoutService';
import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { bookingAvailabilityService } from "@/services/booking/availabilityService";
import type {
  BookingApiError,
  BookingAppointment,
  BookingCheckoutState,
  BookingQuote,
  BookingQuoteRequest,
} from "@/composables/booking/types";

// COMPOSABLE
export const useBookingCheckout = (
  request: BookingQuoteRequest | null,
  initialCode = "",
  onConflict: () => void,
): BookingCheckoutState => {
  const realtimeRevision = useRealtimeRevision(["pricing","services","benefits","promotions","loyalty"]);
  // STATE
  const [promoCode, setPromoCode] = useState(initialCode);
  const [appliedCode, setAppliedCode] = useState(initialCode);
  const [notes, setNotes] = useState("");
  const [quoteResult, setQuoteResult] = useState<{
    key: string;
    quote: BookingQuote;
  } | null>(null);
  const [pendingQuote, setPendingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<BookingAppointment | null>(
    null,
  );
  const inFlight = useRef(false);
  const idempotency = useRef<{ key: string; value: string } | null>(null);
  const key = request
    ? JSON.stringify({
        ...request,
        ...(appliedCode ? { promo_code: appliedCode } : {}),
      })
    : "";

  const navigate = useNavigate();
  const payment = useReservationPayment(request?.business_id, quoteResult?.key === key ? quoteResult.quote.total : 0);

  // EFFECTS
  useEffect(() => {
    setQuoteError(null);
    if (!key) {
      setPendingQuote(false);
      return;
    }
    const abort = new AbortController();
    setPendingQuote(true);
    const payload: BookingQuoteRequest = JSON.parse(key);
    bookingAvailabilityService
      .quote(payload, abort.signal)
      .then((quote) => {
        if (!abort.signal.aborted) setQuoteResult({ key, quote });
      })
      .catch((failure) => {
        if (abort.signal.aborted) return;
        const data = isAxiosError<BookingApiError>(failure)
          ? failure.response?.data
          : undefined;
        setQuoteError(
          Object.values(data?.errors ?? {}).flat()[0] ||
            data?.message ||
            data?.error ||
            "No se pudo calcular el total. Revisa la reserva e inténtalo de nuevo.",
        );
        setQuoteResult(null);
      })
      .finally(() => {
        if (!abort.signal.aborted) setPendingQuote(false);
      });
    return () => abort.abort();
  }, [key, revision, realtimeRevision]);

  // ACTIONS
  const attachRoutine = async (created: BookingAppointment) => {
    const occurrenceId = new URLSearchParams(window.location.search).get('routine_occurrence_id');
    if (!occurrenceId || !/^\d+$/.test(occurrenceId)) return;
    try { await httpService.post(`/v2/routines/occurrences/${occurrenceId}/attach`, { appointment_id: created.id }); }
    catch { /* The booking already exists; the routine page can link it without creating a second booking. */ }
  };
  const confirm = async () => {
    if (
      inFlight.current ||
      !request ||
      quoteResult?.key !== key ||
      pendingQuote ||
      appointment || !payment.ready
    )
      return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    const intentKey = `${key}|${notes.trim()}|${payment.mode}|${payment.policy?.version}`;
    if (idempotency.current?.key !== intentKey)
      idempotency.current = { key: intentKey, value: crypto.randomUUID() };
    try {
      const payload: BookingQuoteRequest = JSON.parse(key);
      const reservation = {
        ...payload,
        professional_id:
          quoteResult.quote.professional?.id ?? payload.professional_id,
        resource_id: quoteResult.quote.resource_id ?? payload.resource_id,
        notes: notes.trim() || undefined,
        source: "web" as const,
        idempotency_key: idempotency.current.value,
        expected_total: quoteResult.quote.total,
      };
      if (payment.policy?.configured && payment.mode) {
        const { data } = await checkoutService.create({ ...reservation, payment_mode: payment.mode, accepted_terms: true, expected_policy_version: payment.policy.version });
        await attachRoutine(data.appointment);
        if (data.payment_order) navigate(`/cliente/checkout/${data.payment_order.id}`);
        else setAppointment(data.appointment);
      } else {
        const created = await bookingAvailabilityService.create(reservation);
        setAppointment(created);
        await attachRoutine(created);
      }
    } catch (failure) {
      const data = isAxiosError<BookingApiError>(failure)
        ? failure.response?.data
        : undefined;
      setError(
        Object.values(data?.errors ?? {}).flat()[0] ||
          data?.message ||
          data?.error ||
          "No pudimos confirmar la reserva. Reintenta sin cerrar para conservar la referencia del intento.",
      );
      if (data?.errors?.expected_policy_version) payment.refresh();
      if (data?.errors?.expected_total) { setQuoteResult(null); setRevision(value => value + 1) }
      if (isAxiosError(failure) && failure.response?.status === 409)
        onConflict();
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return {
    payment,
    summary: {
      quote: quoteResult?.key === key ? quoteResult.quote : null,
      loading: pendingQuote,
      error: quoteError,
      promoCode,
      appliedCode,
      notes,
    },
    submission: { submitting, error, appointment },
    actions: {
      setPromoCode,
      applyPromo: () => setAppliedCode(promoCode.trim()),
      selectPromo: (code: string) => {
        setPromoCode(code.trim());
        setAppliedCode(code.trim());
      },
      removePromo: () => {
        setPromoCode("");
        setAppliedCode("");
      },
      setNotes,
      retry: () => setRevision((value) => value + 1),
      confirm,
    },
  };
};
