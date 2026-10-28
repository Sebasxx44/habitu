import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { useBookingPolicy } from "@/modules/services/useBookingPolicy";
import { useMediaEditor } from "@/modules/media/useMediaEditor";
import { adminServicesApi } from "@/modules/services/admin/adminServicesApi";
import type { Service } from "@/types/models";
import type {
  ServiceEditorState,
  ServiceForm,
} from "@/modules/services/admin/types";

// DEFAULTS
const initialForm = (service?: Service, duplicate = false): ServiceForm => ({
  name: service ? `${service.name}${duplicate ? " (copia)" : ""}` : "",
  description: service?.description ?? "",
  price: service ? String(service.price) : "",
  duration: String(service?.duration_minutes ?? service?.duration ?? 30),
  category: service?.category ?? "General",
  image_url: service?.image_url ?? "",
  media_gallery: service?.media_gallery ?? [],
  is_active: duplicate ? false : service?.is_active !== false,
});

// COMPOSABLE
export const useServiceEditor = (
  businessId: number,
  onSaved: (service: Service) => void,
  source?: Service,
  duplicate = false,
  settingsOnly = false,
): ServiceEditorState => {
  // STATE
  const [value, setValue] = useState<ServiceForm>(() =>
    initialForm(source, duplicate),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const locked = useRef(false);
  const policy = useBookingPolicy();
  const media = useMediaEditor();
  const navigate = useNavigate();

  // LIFECYCLE
  useEffect(() => {
    policy.actions.reset(
      source,
      source?.requires_professional === false
        ? source.resources?.length
          ? "resource"
          : "direct"
        : "professional",
    );
  }, [source?.id]);

  // ACTIONS
  const field: ServiceEditorState["actions"]["field"] = (key, next) => {
    setValue((current) => ({ ...current, [key]: next }));
    setDirty(true);
  };
  const save = async () => {
    if (locked.current || media.state.pending) return;
    setError("");
    const duration = Number(value.duration);
    const price = Number(value.price);
    if (
      !value.name.trim() ||
      !value.price.trim() ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 1440
    ) {
      setError(
        "Completa el nombre, un precio válido y una duración entre 1 y 1.440 minutos.",
      );
      return;
    }
    locked.current = true;
    setSaving(true);
    try {
      const configuration = policy.actions.payload(duration);
      if (
        configuration.booking_model === "resource" &&
        !configuration.resource_ids.length
      )
        throw new Error(
          "Selecciona al menos un recurso para este modelo de reserva.",
        );
      if (
        configuration.duration_mode === "selectable" &&
        (!configuration.duration_options.includes(duration) ||
          configuration.duration_options.some(
            (option) =>
              option % duration !== 0 ||
              option + configuration.buffer_minutes >= 1440,
          ))
      )
        throw new Error(
          "Las opciones de duración deben incluir la duración base, ser múltiplos de ella y caber en un día con su margen.",
        );
      const payload = settingsOnly
        ? configuration
        : {
            ...value,
            ...configuration,
            name: value.name.trim(),
            category: value.category.trim() || "General",
            description: value.description.trim(),
            price,
            duration: duration,
            duration_minutes: duration,
            business_id: businessId,
          };
      const saved = await adminServicesApi.save(
        payload,
        duplicate ? undefined : source?.id,
      );
      onSaved({ ...saved, category: saved.category ?? value.category.trim() });
      setDirty(false);
      navigate(`/admin/services/${saved.id}`, { replace: true });
    } catch (failure) {
      const body = isAxiosError<{
        message?: string;
        errors?: Record<string, string[]>;
      }>(failure)
        ? failure.response?.data
        : undefined;
      setError(
        Object.values(body?.errors ?? {})
          .flat()
          .join(" ") ||
          body?.message ||
          (failure instanceof Error && !isAxiosError(failure)
            ? failure.message
            : "No pudimos guardar el servicio. Intenta nuevamente."),
      );
    } finally {
      locked.current = false;
      setSaving(false);
    }
  };
  const cover = async (file: File) =>
    media.actions.image(file, (url) => field("image_url", url));
  const gallery = async (files: File[]) =>
    media.actions.gallery(files, value.media_gallery.length, (items) => {
      setValue((current) => ({
        ...current,
        media_gallery: [...current.media_gallery, ...items],
      }));
      setDirty(true);
    });
  const removeMedia = (index: number) =>
    field(
      "media_gallery",
      value.media_gallery.filter((_, itemIndex) => itemIndex !== index),
    );
  const caption = (index: number, text: string) =>
    field(
      "media_gallery",
      value.media_gallery.map((item, itemIndex) =>
        itemIndex === index ? { ...item, caption: text } : item,
      ),
    );

  // EXPOSE
  return {
    form: { value, saving, error, dirty },
    media,
    booking: {
      ...policy,
      actions: {
        ...policy.actions,
        field: (key, next) => {
          policy.actions.field(key, next);
          setDirty(true);
        },
        durations: (next) => {
          policy.actions.durations(next);
          setDirty(true);
        },
      },
    },
    actions: { field, save, cover, gallery, removeMedia, caption },
  };
};
