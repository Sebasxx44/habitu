import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { useAuth } from "@/App";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import {
  calendarPreferenceKey,
  defaultCalendarPreferences,
  readCalendarPreferences,
} from "@/modules/calendar/calendarModel";
import type { CalendarPreferences } from "@/modules/calendar/types";

// COMPONENT
export const CalendarSettingsTA = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState<CalendarPreferences>(() =>
    readCalendarPreferences(user?.id),
  );
  const [error, setError] = useState("");
  const returnTo = `/admin/calendar${location.search}`;
  const save = () => {
    if (
      !Number.isInteger(values.startHour) ||
      !Number.isInteger(values.endHour) ||
      values.startHour < 0 ||
      values.endHour > 24 ||
      values.startHour >= values.endHour
    ) {
      setError("La hora final debe ser posterior a la inicial, entre 0 y 24.");
      return;
    }
    try {
      localStorage.setItem(
        calendarPreferenceKey(user?.id),
        JSON.stringify(values),
      );
      const params = new URLSearchParams(location.search);
      params.set("view", values.mode);
      navigate(`/admin/calendar?${params}`);
    } catch {
      setError(
        "El navegador no permitió guardar tus preferencias. Inténtalo de nuevo.",
      );
    }
  };
  return (
    <div className="space-y-6 pb-10">
      <ActionHeaderTA
        eyebrow="Calendario / Preferencias"
        title="Tu forma de ver la agenda"
        description="Personaliza la visualización de tu calendario en este navegador."
        actions={
          <ButtonTA variant="outline" onClick={() => navigate(returnTo)}>
            <ArrowLeft className="size-4" />
            Calendario
          </ButtonTA>
        }
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        className="max-w-3xl space-y-5"
      >
        <PanelTA
          title="Vista y horarios"
          description="Las reservas fuera del rango elegido siempre se mostrarán."
        >
          <div className="grid gap-5 px-5 pb-5 sm:grid-cols-2">
            <label className="text-sm font-medium sm:col-span-2">
              Vista inicial
              <select
                value={values.mode}
                onChange={(event) => {
                  const mode = event.target.value;
                  if (
                    mode === "day" ||
                    mode === "week" ||
                    mode === "month" ||
                    mode === "list"
                  )
                    setValues((previous) => ({ ...previous, mode }));
                }}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3"
              >
                <option value="day">Día por profesional</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
                <option value="list">Agenda de la semana</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Mostrar desde (hora)
              <InputTA
                className="mt-2"
                type="number"
                min={0}
                max={23}
                required
                value={values.startHour}
                onChange={(event) =>
                  setValues((previous) => ({
                    ...previous,
                    startHour: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium">
              Mostrar hasta (hora)
              <InputTA
                className="mt-2"
                type="number"
                min={1}
                max={24}
                required
                value={values.endHour}
                onChange={(event) =>
                  setValues((previous) => ({
                    ...previous,
                    endHour: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label className="flex items-start gap-3 text-sm sm:col-span-2">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-primary"
                checked={values.weekends}
                onChange={(event) =>
                  setValues((previous) => ({
                    ...previous,
                    weekends: event.target.checked,
                  }))
                }
              />
              <span>
                Mostrar fines de semana
                <span className="mt-1 block text-xs text-muted-foreground">
                  En la vista semanal. Se conservarán los días que tengan
                  reservas.
                </span>
              </span>
            </label>
          </div>
        </PanelTA>
        <p className="text-xs text-muted-foreground">
          Estas preferencias solo cambian la visualización. Los horarios de
          atención del negocio se gestionan en las sedes.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <ButtonTA type="submit">
            <Save className="size-4" />
            Guardar preferencias
          </ButtonTA>
          <ButtonTA
            type="button"
            variant="outline"
            onClick={() => setValues(defaultCalendarPreferences)}
          >
            Restablecer valores
          </ButtonTA>
        </div>
      </form>
    </div>
  );
};
