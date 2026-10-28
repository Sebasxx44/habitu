import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useAuth } from "@/App";
import { useBusinessSelection } from "@/composables/useBusinessSelection";
import { membershipService } from "@/services/membership/membershipService";
import type {
  ClientMembership,
  MembershipPlan,
  MembershipResponse,
  MembershipState,
} from "@/composables/membership/types";

// COMPOSABLE
export const useClientMemberships = (): MembershipState => {
  const realtimeRevision = useRealtimeRevision(["benefits"]);
  // STATE
  const { user } = useAuth();
  const selection = useBusinessSelection();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [memberships, setMemberships] = useState<ClientMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);

  // EFFECTS
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setPlans([]);
    Promise.all([
      selection.businessId
        ? membershipService.getPlans(Number(selection.businessId))
        : Promise.resolve([]),
      user?.cliente_id
        ? membershipService.getMyMemberships(user.cliente_id)
        : Promise.resolve([]),
    ])
      .then(([catalog, owned]) => {
        if (active) {
          setPlans(catalog);
          setMemberships(owned);
        }
      })
      .catch(() => {
        if (active)
          setError("No pudimos cargar las membresías. Inténtalo nuevamente.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selection.businessId, user?.cliente_id, revision, realtimeRevision]);

  // ACTIONS
  const refresh = () => {
    selection.reload();
    setRevision((value) => value + 1);
  };
  const isActive = (membership: ClientMembership) =>
    membership.status === "ACTIVE" &&
    Date.parse(membership.ends_at) > Date.now();
  const mutate = async (
    operation: () => Promise<ClientMembership>,
    message: string,
  ) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await operation();
      setMemberships((current) => [
        result,
        ...current.filter((item) => item.id !== result.id),
      ]);
      setSuccess(message);
    } catch (cause) {
      const response = isAxiosError<MembershipResponse<null>>(cause)
        ? cause.response?.data
        : undefined;
      setError(
        response?.error || response?.message || "No pudimos guardar el cambio.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const subscribe = async (plan: MembershipPlan) => {
    if (!user?.cliente_id || Number(plan.price) > 0) return;
    await mutate(
      () => membershipService.subscribe(user.cliente_id!, plan.id),
      "Tu membresía está activa.",
    );
  };
  const cancel = async (id: number) => {
    if (!user?.cliente_id) return;
    await mutate(
      () => membershipService.cancelMembership(id, user.cliente_id!),
      "Membresía cancelada.",
    );
  };

  // RETURN
  return {
    selection,
    list: { plans, memberships, loading, error, success, refresh },
    actions: {
      pending,
      canSubscribe: !!user?.cliente_id,
      subscribe,
      cancel,
      isActive,
    },
  };
};
