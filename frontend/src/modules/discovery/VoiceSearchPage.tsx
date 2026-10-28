import { useNavigate } from "react-router-dom";
import { Mic, Search, Square } from "lucide-react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { useVoiceSearch } from "@/modules/discovery/composables/useVoiceSearch";

// COMPONENT
export const VoiceSearchPage = () => {
  const navigate = useNavigate();
  const { voice, actions } = useVoiceSearch();
  return (
    <div className="page-enter mx-auto max-w-3xl space-y-6">
      <ActionHeaderTA
        eyebrow="Una cita empieza con una idea"
        title="Dilo. Encuentra tu espacio."
        description="Busca un negocio o servicio por voz. Después podrás elegir profesional y horario con disponibilidad real."
      />
      <PanelTA
        title="¿Qué estás buscando?"
        description="Di el nombre de un servicio o negocio, por ejemplo «corte de cabello»."
      >
        <div className="space-y-6 p-6 pt-2">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-secondary/60 p-8">
            <ButtonTA
              className="size-20 rounded-full"
              variant={voice.listening ? "destructive" : "default"}
              disabled={!voice.supported}
              onClick={voice.listening ? actions.stop : actions.start}
              aria-label={
                voice.listening ? "Detener grabación" : "Iniciar dictado"
              }
            >
              {voice.listening ? (
                <Square className="size-7" />
              ) : (
                <Mic className="size-7" />
              )}
            </ButtonTA>
            <p role="status" className="text-sm font-medium">
              {voice.listening
                ? "Escuchando…"
                : voice.supported
                  ? "Pulsa el micrófono para dictar"
                  : "El dictado no está disponible en este navegador"}
            </p>
            <p className="max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
              El dictado usa el reconocimiento de voz de tu navegador. También
              puedes escribir.
            </p>
          </div>
          {voice.error && (
            <p role="alert" className="text-sm text-destructive">
              {voice.error}
            </p>
          )}
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!voice.transcript.trim()) return;
              actions.stop();
              navigate(
                `/cliente/explore?q=${encodeURIComponent(voice.transcript.trim())}`,
              );
            }}
          >
            <label className="block text-sm font-medium" htmlFor="voice-search">
              Tu búsqueda
            </label>
            <InputTA
              id="voice-search"
              value={voice.transcript}
              onChange={(event) => actions.edit(event.target.value)}
              placeholder="Servicio o nombre del negocio"
              maxLength={160}
            />
            <ButtonTA
              type="submit"
              disabled={!voice.transcript.trim() || voice.listening}
              className="w-full"
            >
              <Search className="size-4" /> Buscar disponibilidad
            </ButtonTA>
          </form>
          <p className="text-xs leading-relaxed text-muted-foreground">
            La reserva se confirma al completar el formulario del negocio. Para
            cambiar una cita existente, visita{" "}
            <button
              className="font-semibold text-primary underline"
              onClick={() => navigate("/cliente/appointments")}
            >
              Mis citas
            </button>
            .
          </p>
        </div>
      </PanelTA>
    </div>
  );
};
