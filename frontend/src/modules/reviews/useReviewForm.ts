import { useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import type {
  BookingApiError,
  BookingAppointment,
} from "@/composables/booking/types";
import type { ReviewRequest } from "@/composables/appointments/types";

// TYPES
export type ReviewDimension =
  "rating" | "service_rating" | "business_rating" | "professional_rating";
export interface ReviewFormState {
  form: {
    ratings: Record<ReviewDimension, number>;
    comment: string;
    submitting: boolean;
    error: string | null;
  };
  actions: {
    rate: (dimension: ReviewDimension, value: number) => void;
    comment: (value: string) => void;
    submit: () => Promise<void>;
  };
}

// COMPOSABLE
export const useReviewForm = (
  appointment: BookingAppointment,
  onSubmit: (request: ReviewRequest) => Promise<void>,
  onClose: () => void,
): ReviewFormState => {
  const { t } = useTranslation();
  const [ratings, setRatings] = useState<Record<ReviewDimension, number>>({
    rating: 0,
    service_rating: 0,
    business_rating: 0,
    professional_rating: 0,
  });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);

  // ACTIONS
  const rate = (dimension: ReviewDimension, value: number) =>
    setRatings((current) => ({ ...current, [dimension]: value }));
  const submit = async () => {
    if (pending.current || ratings.rating < 1) return;
    pending.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        appointment_id: appointment.id,
        rating: ratings.rating,
        comment: comment.trim(),
        ...(ratings.service_rating
          ? { service_rating: ratings.service_rating }
          : {}),
        ...(ratings.business_rating
          ? { business_rating: ratings.business_rating }
          : {}),
        ...(appointment.professional_id && ratings.professional_rating
          ? { professional_rating: ratings.professional_rating }
          : {}),
      });
      onClose();
    } catch (failure) {
      const response = isAxiosError<BookingApiError>(failure)
        ? failure.response?.data
        : undefined;
      setError(
        (response?.errors
          ? Object.values(response.errors).flat()[0]
          : undefined) ||
          response?.error ||
          response?.message ||
          t("reviews.error"),
      );
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };
  return {
    form: { ratings, comment, submitting, error },
    actions: { rate, comment: setComment, submit },
  };
};
