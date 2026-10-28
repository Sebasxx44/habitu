export const payoutsEs = {
  title: "Validación de retiros · Sandbox",
  description: "Revisión técnica de solicitudes y del adaptador Wompi.",
  refresh: "Actualizar",
  loading: "Cargando",
  loadError: "No pudimos cargar los retiros.",
  productionOff:
    "Transferencias reales deshabilitadas. Cada ensayo usa destinatario sintético y dinero de prueba; su resultado no modifica el retiro ni el saldo del profesional.",
  enabled:
    "Sandbox configurado. Preparar valida cuenta origen activa, saldo y banco del destinatario de prueba.",
  disabled:
    "Sandbox deshabilitado: se requieren credenciales y cuentas de prueba configuradas en el servidor.",
  withdrawal: "Solicitud #{{id}}",
  ledgerState: "Estado real del retiro",
  testState: "Resultado sandbox",
  prepare: "Preparar ensayo sandbox",
  submit: "Enviar o conciliar ensayo sandbox",
  reconcile: "Consultar proveedor",
  empty: "Sin solicitudes",
  error:
    "No se pudo completar la acción. Revisa configuración y estado antes de volver a enviar.",
  review: "Requiere revisión técnica. No confirma una transferencia real.",
  resolution: {
    SYNTHETIC_RECIPIENT_VALIDATED: "Destinatario sintético y origen validados.",
    AWAITING_SERVER_RECONCILIATION:
      "Lote recibido; falta confirmar la transacción mediante consulta privada.",
    RESPONSE_NOT_VERIFIED:
      "Respuesta incierta. Se consultará el proveedor antes de cualquier reintento.",
    LOOKUP_UNAVAILABLE: "Consulta no disponible. No se reenvía el pago.",
    IDEMPOTENCY_WINDOW_EXPIRED:
      "Ventana de idempotencia vencida: bloqueado el reenvío, requiere revisión.",
    NOT_FOUND_WITHIN_IDEMPOTENCY_WINDOW:
      "Consulta sin operación encontrada; un reintento conserva la misma referencia.",
    AMBIGUOUS_PROVIDER_RECORDS:
      "El proveedor devolvió registros ambiguos; reenvío bloqueado.",
    PAYOUT_MISMATCH: "El lote no coincide con la solicitud; revisar.",
    RECIPIENT_OR_AMOUNT_MISMATCH:
      "Importe o destinatario no coincide; revisar.",
    AWAITING_TRANSACTION: "Lote encontrado; transacción aún pendiente.",
    SANDBOX_SERVER_VERIFIED:
      "Resultado sandbox verificado mediante consulta privada. No representa dinero real.",
  },
};
export const payoutsEn = {
  title: "Withdrawal validation · Sandbox",
  description: "Technical review of requests and the Wompi adapter.",
  refresh: "Refresh",
  loading: "Loading",
  loadError: "Withdrawals could not be loaded.",
  productionOff:
    "Real transfers are disabled. Rehearsals use a synthetic recipient and test money; results never change a withdrawal or professional balance.",
  enabled:
    "Sandbox configured. Preparation validates the active source account, balance and test recipient bank.",
  disabled:
    "Sandbox disabled: test credentials and accounts must be configured on the server.",
  withdrawal: "Request #{{id}}",
  ledgerState: "Real withdrawal status",
  testState: "Sandbox result",
  prepare: "Prepare sandbox rehearsal",
  submit: "Send or reconcile sandbox rehearsal",
  reconcile: "Check provider",
  empty: "No requests",
  error:
    "The action failed. Check configuration and status before resubmitting.",
  review: "Technical review required. This does not confirm a real transfer.",
  resolution: {
    SYNTHETIC_RECIPIENT_VALIDATED: "Synthetic recipient and source validated.",
    AWAITING_SERVER_RECONCILIATION:
      "Batch received; private transaction verification is pending.",
    RESPONSE_NOT_VERIFIED:
      "Uncertain response. Provider lookup is required before retrying.",
    LOOKUP_UNAVAILABLE: "Lookup unavailable. Payment is not resent.",
    IDEMPOTENCY_WINDOW_EXPIRED:
      "Idempotency window expired. Resending is blocked pending review.",
    NOT_FOUND_WITHIN_IDEMPOTENCY_WINDOW:
      "No operation found. A retry preserves the same reference.",
    AMBIGUOUS_PROVIDER_RECORDS:
      "Ambiguous provider records; resending blocked.",
    PAYOUT_MISMATCH: "Batch does not match the request.",
    RECIPIENT_OR_AMOUNT_MISMATCH: "Amount or recipient does not match.",
    AWAITING_TRANSACTION: "Batch found; transaction is still pending.",
    SANDBOX_SERVER_VERIFIED:
      "Sandbox result verified through a private lookup. No real money moved.",
  },
};
