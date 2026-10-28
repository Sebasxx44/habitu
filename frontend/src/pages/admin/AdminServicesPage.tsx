import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/App";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { StateTA } from "@/components/TA/StateTA";
import { ServicesCatalogTA } from "@/modules/services/admin/ServicesCatalogTA";
import { ServiceDetailTA } from "@/modules/services/admin/ServiceDetailTA";
import { ServiceEditorTA } from "@/modules/services/admin/ServiceEditorTA";
import { ServiceDeleteTA } from "@/modules/services/admin/ServiceDeleteTA";
import { useServicesData } from "@/modules/services/admin/useServicesData";

// VIEW
export const AdminServicesPage = () => {
  const { user } = useAuth();
  const { "*": route = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const data = useServicesData(user?.barber_shop_id ?? undefined);
  const [id, action] = route.split("/").filter(Boolean);
  const service = data.catalog.services.find((item) => item.id === Number(id));
  const duplicateId = new URLSearchParams(location.search).get("copy");
  const duplicate = duplicateId ? data.catalog.services.find((item) => item.id === Number(duplicateId)) : undefined;

  if (data.status.loading) return <div className="space-y-6"><ActionHeaderTA title="Servicios" description="Cargando el catálogo de tu negocio…" /><div role="status" aria-label="Cargando servicios" className="grid animate-pulse gap-4 md:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-56 rounded-2xl bg-muted" />)}</div></div>;
  if (!id) return <ServicesCatalogTA data={data} />;
  if (data.status.error && !data.catalog.services.length) return <div className="space-y-6"><ActionHeaderTA title="Servicios" /><StateTA error title="No pudimos cargar el servicio" description={data.status.error} onRetry={() => void data.actions.refresh()} /></div>;
  if (id === "new" && !action && (!duplicateId || duplicate) && user?.barber_shop_id) return <ServiceEditorTA key={`new-${duplicateId ?? "blank"}`} businessId={user.barber_shop_id} onSaved={data.actions.saved} resources={data.catalog.resources} source={duplicate} duplicate={Boolean(duplicate)} categories={[...new Set(data.catalog.services.map((item) => item.category || "General"))]} />;
  if (!service || (action && !["edit", "delete", "settings"].includes(action)) || route.split("/").filter(Boolean).length > 2) return <div className="space-y-6"><ActionHeaderTA title="Servicio no encontrado" actions={<ButtonTA variant="outline" onClick={() => navigate("/admin/services")}>Volver al catálogo</ButtonTA>} /><StateTA title="Esta ficha no está disponible" description="El servicio pudo haberse eliminado o no pertenece a este negocio." /></div>;
  if ((action === "edit" || action === "settings") && user?.barber_shop_id) return <ServiceEditorTA key={`${service.id}-${action}`} businessId={user.barber_shop_id} onSaved={data.actions.saved} resources={data.catalog.resources} source={service} settingsOnly={action === "settings"} categories={[...new Set(data.catalog.services.map((item) => item.category || "General"))]} />;
  if (action === "delete") return <ServiceDeleteTA key={service.id} service={service} refresh={data.actions.refresh} />;
  return <ServiceDetailTA key={service.id} service={service} refresh={data.actions.refresh} />;
};
