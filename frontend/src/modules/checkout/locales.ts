// TRANSLATIONS
export const checkoutEs = {
  payment: "Pago de la reserva",
  loadingPolicy: "Consultando condiciones de pago…",
  error: "No pudimos consultar el estado. Reintenta con la misma referencia.",
  retry: "Actualizar estado",
  legacy:
    "Este negocio aún no configuró cobro en línea. Crear la reserva no acredita un pago.",
  modes: {
    FULL: "Pagar todo ahora",
    DEPOSIT: "Pagar anticipo",
    ON_SITE: "Pagar en el establecimiento",
  },
  providerDisabled: "El cobro en línea no está habilitado para este negocio.",
  payNow: "Por pagar ahora",
  payLater: "Saldo posterior",
  accept: "Acepto el importe y las condiciones de cancelación mostradas.",
  hold: "El horario se mantiene durante {{count}} minutos mientras se verifica el pago.",
  title: "Tu reserva y su pago",
  description:
    "Este estado procede de la verificación del servidor. La confirmación del proveedor puede tardar.",
  reference: "Referencia",
  expires: "Vencimiento del bloqueo",
  booking: "Ver reserva",
  continue: "Continuar con el mismo pago",
  pending:
    "El pago todavía no está confirmado. Evita crear otra orden mientras se verifica.",
  late: "El pago llegó después de liberar el horario. La reserva no se adjudicó de nuevo y se registró una devolución al medio original.",
  status: {
    PENDING: "Pendiente de pago",
    APPROVED: "Pago aprobado",
    DECLINED: "Pago rechazado",
    VOIDED: "Pago anulado",
    ERROR: "Error del proveedor",
    EXPIRED: "Bloqueo vencido",
    REVIEW: "Pago en revisión",
  },
  refunds: "Devoluciones al medio original",
  refundStatus: {
    REQUESTED: "Solicitada",
    PROCESSING: "En proceso",
    COMPLETED: "Completada",
    FAILED: "Fallida",
  },
  refundNote:
    "Una solicitud no significa que el dinero ya fue devuelto. Se requiere comprobación del proveedor.",
  refundRequest: "Solicitar devolución",
  amount: "Importe",
  reason: "Motivo",
  refundRules:
    "Primero cancela la reserva según las condiciones aceptadas. El importe no puede superar lo cobrado pendiente de devolver.",
  policyTitle: "Condiciones de cobro",
  policyDescription:
    "Activa únicamente las modalidades acordadas por el negocio. Configurarlas no habilita una cuenta del proveedor.",
  deposit: "Anticipo (%)",
  holdMinutes: "Bloqueo (minutos)",
  terms: "Condiciones de cancelación",
  save: "Guardar condiciones",
  saved: "Condiciones guardadas",
  review:
    "No se pudo resolver el pago automáticamente; conserva esta referencia para soporte.",
};
export const checkoutEn: typeof checkoutEs = {
  payment: "Booking payment",
  loadingPolicy: "Loading payment terms…",
  error: "We could not check the status. Retry with the same reference.",
  retry: "Refresh status",
  legacy:
    "This business has not configured online collection. Creating a booking does not confirm payment.",
  modes: {
    FULL: "Pay in full now",
    DEPOSIT: "Pay a deposit",
    ON_SITE: "Pay at the venue",
  },
  providerDisabled: "Online collection is not enabled for this business.",
  payNow: "Due now",
  payLater: "Remaining balance",
  accept: "I accept the amount and the cancellation terms shown.",
  hold: "This time slot is held for {{count}} minutes while payment is verified.",
  title: "Your booking and payment",
  description:
    "This status comes from server verification. Provider confirmation may take some time.",
  reference: "Reference",
  expires: "Hold expiration",
  booking: "View booking",
  continue: "Continue with the same payment",
  pending:
    "Payment is not confirmed yet. Avoid creating another order while it is being verified.",
  late: "Payment arrived after the slot was released. The booking was not reassigned and a refund to the original method was requested.",
  status: {
    PENDING: "Awaiting payment",
    APPROVED: "Payment approved",
    DECLINED: "Payment declined",
    VOIDED: "Payment voided",
    ERROR: "Provider error",
    EXPIRED: "Hold expired",
    REVIEW: "Payment under review",
  },
  refunds: "Refunds to original method",
  refundStatus: {
    REQUESTED: "Requested",
    PROCESSING: "Processing",
    COMPLETED: "Completed",
    FAILED: "Failed",
  },
  refundNote:
    "A request does not mean money has been returned. Provider verification is required.",
  refundRequest: "Request refund",
  amount: "Amount",
  reason: "Reason",
  refundRules:
    "First cancel the booking under the accepted conditions. The amount cannot exceed the remaining eligible payment.",
  policyTitle: "Payment terms",
  policyDescription:
    "Only enable modes agreed by the business. Saving terms does not enable a provider account.",
  deposit: "Deposit (%)",
  holdMinutes: "Hold (minutes)",
  terms: "Cancellation terms",
  save: "Save terms",
  saved: "Terms saved",
  review:
    "Payment could not be resolved automatically; keep this reference for support.",
};
