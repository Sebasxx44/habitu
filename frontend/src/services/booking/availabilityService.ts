import { httpService } from "@/services/auth/authService";
import type {
  BookingApiResponse,
  BookingAppointment,
  BookingAvailability,
  BookingCreateRequest,
  BookingRequest,
  BookingQuote,
  BookingQuoteRequest,
} from "@/composables/booking/types";

// SERVICES
export const bookingAvailabilityService = {
  get: async (
    request: BookingRequest,
    signal: AbortSignal,
  ): Promise<BookingAvailability> => {
    const response = await httpService.get<
      BookingApiResponse<BookingAvailability>
    >("/v2/appointments/availability", { params: request, signal });
    return response.data;
  },
  quote: async (request: BookingQuoteRequest, signal: AbortSignal): Promise<BookingQuote> => {
    const response = await httpService.post<BookingApiResponse<BookingQuote>>("/v2/appointments/quote", request, { signal });
    return response.data;
  },
  create: async (
    request: BookingCreateRequest,
  ): Promise<BookingAppointment> => {
    const response = await httpService.post<
      BookingApiResponse<BookingAppointment>
    >("/v2/appointments", request);
    return response.data;
  },
};
