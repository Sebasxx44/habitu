import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeRevision } from "@/modules/realtime/useRealtimeRefresh";
import { adminServicesApi } from "@/modules/services/admin/adminServicesApi";
import { serviceConfigurationApi } from "@/modules/services/serviceConfigurationApi";
import type { Resource, Service } from "@/types/models";
import type { ServicesDataState } from "@/modules/services/admin/types";

// COMPOSABLE
export const useServicesData = (businessId?: number): ServicesDataState => {
  // STATE
  const [services, setServices] = useState<Service[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const revision = useRealtimeRevision(["services", "resources"]);

  // ACTIONS
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setRefreshing(true);
    setError("");
    try {
      if (!businessId) throw new Error("No tienes un negocio asignado.");
      const [nextServices, nextResources] = await Promise.all([
        adminServicesApi.list(businessId),
        serviceConfigurationApi.resources(businessId),
      ]);
      if (request !== sequence.current) return;
      setServices(nextServices);
      setResources(nextResources);
    } catch {
      if (request === sequence.current)
        setError(
          "No pudimos cargar los servicios y sus recursos. Intenta nuevamente.",
        );
    } finally {
      if (request === sequence.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [businessId]);

  const saved = (service: Service) => {
    setServices((current) =>
      current.some((item) => item.id === service.id)
        ? current.map((item) => (item.id === service.id ? service : item))
        : [...current, service],
    );
    void refresh();
  };

  // LIFECYCLE
  useEffect(() => {
    void refresh();
    return () => {
      sequence.current += 1;
    };
  }, [refresh, revision]);

  // EXPOSE
  return {
    catalog: { services, resources },
    status: { loading, refreshing, error },
    actions: { refresh, saved },
  };
};
