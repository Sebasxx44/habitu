import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { groupService } from "@/modules/groups/groupService";
import type {
  BookingGroup,
  GroupCoordinationState,
} from "@/modules/groups/types";

// COMPOSABLE
export const useGroupCoordination = (): GroupCoordinationState => {
  // STATE
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<BookingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [token, setToken] = useState(params.get("invite") ?? "");
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [appointment, setAppointment] = useState(
    params.get("appointment_id") ?? params.get("appointment") ?? "",
  );
  const [options, setOptions] = useState("");
  const [limit, setLimit] = useState("20");

  // ACTIONS
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const update = (group: BookingGroup) =>
    setItems((current) => [
      group,
      ...current.filter((item) => item.id !== group.id),
    ]);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      await action();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const showLink = (value: string) =>
    setLink(
      `${window.location.origin}/cliente/groups?invite=${encodeURIComponent(value)}`,
    );
  const create = () =>
    run(async () => {
      const { data } = await groupService.create({
        title: title.trim(),
        appointment_id: appointment ? Number(appointment) : undefined,
        member_limit: Number(limit),
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        options: options
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
      });
      update(data);
      setTitle("");
      setOptions("");
      if (data.invite_token) showLink(data.invite_token);
    });
  const join = () =>
    run(async () => {
      const value = token.includes("?")
        ? (new URL(token).searchParams.get("invite") ?? token)
        : token;
      const { data } = await groupService.join(value.trim());
      update(data);
      setToken("");
      setParams({}, { replace: true });
    });
  const invite = (id: number) =>
    run(async () => {
      const { data } = await groupService.invite(id);
      showLink(data.invite_token);
    });
  const respond = (
    id: number,
    response: "CONFIRMED" | "DECLINED",
    option?: number,
  ) =>
    run(async () => {
      update((await groupService.respond(id, response, option)).data);
    });
  const close = (id: number) =>
    run(async () => {
      update((await groupService.update(id, { status: "CLOSED" })).data);
    });
  const attach = (id: number, appointmentId: number) =>
    run(async () => {
      update(
        (await groupService.update(id, { appointment_id: appointmentId })).data,
      );
    });

  // EFFECTS
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    groupService
      .list(abort.signal)
      .then((response) => {
        if (!abort.signal.aborted) setItems(response.data);
      })
      .catch(() => {
        if (!abort.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [revision]);

  // RETURN
  return {
    directory: { items, loading, busy, error, refresh },
    invitation: { token, setToken, link, join, create: invite },
    editor: {
      title,
      setTitle,
      appointment,
      setAppointment,
      options,
      setOptions,
      limit,
      setLimit,
      create,
    },
    actions: { respond, close, attach },
  };
};
