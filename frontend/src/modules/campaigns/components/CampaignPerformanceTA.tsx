import { LinkButtonTA } from "@/components/TA/LinkButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { formatCurrency, formatDate, formatNumber } from "@/i18n/formatters";
import { CampaignMetricTA } from "@/modules/campaigns/components/CampaignPrimitivesTA";
import type { CampaignAnalytics } from "@/modules/campaigns/types";

// CONFIGURATION
const logLabels: Record<string, string> = {
  SENT: "Aceptado",
  OPENED: "Abierto",
  CLICKED: "Clic registrado",
  FAILED: "Fallido",
  PENDING: "Pendiente",
  QUEUED: "En cola",
  SENDING: "Por verificar",
  PROCESSING: "Procesando",
  SKIPPED: "Omitido",
  UNCERTAIN: "Por verificar",
};

// COMPONENT
export const CampaignPerformanceTA = ({
  stats,
  businessId,
}: {
  stats: CampaignAnalytics;
  businessId: number;
}) => (
  <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <CampaignMetricTA
        label="Correos aceptados"
        value={formatNumber(stats.sent_success)}
        detail={`${stats.delivery_rate ?? 0}% de la audiencia prevista`}
      />
      <CampaignMetricTA
        label="Aperturas registradas"
        value={formatNumber(stats.opened)}
        detail={`${stats.open_rate ?? 0}% de los correos aceptados`}
      />
      <CampaignMetricTA
        label="Clics en reservar"
        value={formatNumber(stats.clicked ?? 0)}
        detail={`${stats.click_rate ?? 0}% de los correos aceptados`}
      />
      <CampaignMetricTA
        label="Envíos fallidos"
        value={formatNumber(stats.failed)}
        detail={`${formatNumber(stats.pending ?? 0)} pendientes · ${formatNumber(stats.uncertain ?? 0)} por verificar`}
      />
    </div>
    <p className="text-xs leading-relaxed text-muted-foreground">
      Aceptado indica que el proveedor recibió el correo, no confirma su llegada
      a la bandeja. Las aperturas dependen de la carga de imágenes; los filtros
      automáticos de correo pueden generar aperturas y clics.
    </p>
    {stats.related_promotion && (
      <PanelTA
        title="Rendimiento del cupón vinculado"
        description="Totales de la promoción en todos sus canales; no implican atribución exclusiva a esta campaña."
        action={
          <LinkButtonTA
            variant="outline"
            to={`/admin/promotions/${stats.related_promotion.id}/edit?business_id=${businessId}`}
          >
            Ver promoción
          </LinkButtonTA>
        }
      >
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-3 md:px-6">
          <div>
            <p className="text-xs text-muted-foreground">Canjes</p>
            <p className="mt-2 text-xl font-semibold">
              {formatNumber(stats.related_promotion.redemptions)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Ingresos de citas completadas
            </p>
            <p className="mt-2 text-xl font-semibold">
              {formatCurrency(stats.related_promotion.revenue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Descuentos otorgados
            </p>
            <p className="mt-2 text-xl font-semibold">
              {formatCurrency(stats.related_promotion.savings)}
            </p>
          </div>
        </div>
      </PanelTA>
    )}
    {stats.daily?.length > 0 && (
      <PanelTA
        title="Actividad por día"
        description="Eventos registrados durante el procesamiento y la interacción con los correos."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-border bg-secondary/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Aceptados</th>
                <th className="px-5 py-3">Aperturas</th>
                <th className="px-5 py-3">Clics</th>
                <th className="px-5 py-3">Fallidos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.daily.map((day) => (
                <tr key={day.date}>
                  <td className="whitespace-nowrap px-5 py-3">
                    {formatDate(day.date)}
                  </td>
                  <td className="px-5 py-3 tabular-nums">{day.sent}</td>
                  <td className="px-5 py-3 tabular-nums">{day.opened}</td>
                  <td className="px-5 py-3 tabular-nums">{day.clicked}</td>
                  <td className="px-5 py-3 tabular-nums">{day.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelTA>
    )}
    <PanelTA
      title="Registro de destinatarios"
      description={`Últimos ${stats.logs.length} de ${formatNumber(stats.logs_total ?? stats.logs.length)} registros. Cada envío conserva su resultado.`}
    >
      {stats.logs.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-border bg-secondary/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Destinatario</th>
                <th className="px-5 py-3">Resultado</th>
                <th className="px-5 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-5 py-4">
                    <p className="font-medium">{log.recipient_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {log.recipient_email}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={
                        log.status === "FAILED" ? "text-destructive" : ""
                      }
                    >
                      {logLabels[log.status] ?? log.status}
                    </span>
                    {log.error_message && (
                      <p className="mt-1 max-w-md text-xs text-muted-foreground">
                        {log.error_message}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted-foreground">
                    {formatDate(log.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 pb-6 text-sm text-muted-foreground">
          Los resultados aparecerán aquí cuando se procese la campaña.
        </p>
      )}
    </PanelTA>
  </div>
);
