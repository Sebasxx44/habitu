import type { AnalyticsOverview } from "@/modules/analytics/types";
import type { GrowthAction } from "@/modules/agenda/types";

// COMPUTEDS
export const buildGrowthActions = (data: AnalyticsOverview): GrowthAction[] => {
  const metric = (id: string) => data.metrics.find((item) => item.id === id);
  const reservations = metric("reservations")?.value ?? 0;
  const cancellations = metric("cancelled")?.value ?? 0;
  const noShow = metric("noShow")?.value ?? 0;
  const returning = metric("returningClients")?.value ?? 0;
  const clients = metric("uniqueClients")?.value ?? 0;
  const value = metric("realizedValue");
  const actions: GrowthAction[] = [];
  if (cancellations + noShow > 0)
    actions.push({
      id: "recover",
      priority: "attention",
      title: "Recupera citas que no se realizaron",
      evidence: `${cancellations} cancelaciones y ${noShow} ausencias entre ${reservations} reservas del período.`,
      action:
        "Revisa los motivos, contacta al cliente y ofrece otro horario. Prioriza confirmar las próximas reservas.",
      to: "/admin/calendar",
      label: "Revisar calendario",
    });
  if (value?.change !== null && value?.change !== undefined && value.change < 0)
    actions.push({
      id: "value",
      priority: "attention",
      title: "Revisa la caída del valor realizado",
      evidence: `El valor de servicios completados bajó ${Math.abs(value.change)}% frente al período anterior de igual duración.`,
      action:
        "Compara servicios, cancelaciones y ticket promedio antes de aplicar descuentos; revisa costos para evaluar rentabilidad.",
      to: "/admin/analytics",
      label: "Analizar resultados",
    });
  if (clients > 0)
    actions.push({
      id: "retention",
      priority: "opportunity",
      title: "Convierte una visita en una próxima reserva",
      evidence: `${returning} de ${clients} clientes del período ya habían reservado antes. Se excluyen las citas canceladas.`,
      action:
        "Propón la próxima visita al finalizar el servicio y revisa los beneficios de fidelidad disponibles.",
      to: "/admin/loyalty",
      label: "Gestionar fidelidad",
    });
  const topService = [...data.services]
    .filter((service) => service.completed > 0)
    .sort((left, right) => right.revenue - left.revenue)[0];
  if (topService)
    actions.push({
      id: "service",
      priority: "opportunity",
      title: `Da visibilidad a ${topService.name}`,
      evidence: `${topService.completed} servicios completados; es el mayor valor realizado del catálogo analizado en ${data.currency}.`,
      action:
        "Revisa descripción, duración y disponibilidad; ofrece complementos pertinentes sin asumir que más ventas implican más utilidad.",
      to: "/admin/services",
      label: "Revisar catálogo",
    });
  if (reservations === 0)
    actions.push({
      id: "start",
      priority: "opportunity",
      title: "Prepara las primeras reservas",
      evidence: "No hay reservas registradas en este período.",
      action:
        "Comprueba servicios activos, horarios de las sedes y disponibilidad del equipo. Comparte el enlace del negocio con tus clientes.",
      to: "/admin/branches",
      label: "Revisar sucursales",
    });
  return actions.slice(0, 3);
};
