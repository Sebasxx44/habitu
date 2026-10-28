import { Link } from "react-router-dom";
import { ArrowLeft, Trash2, UserRoundMinus } from "lucide-react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { useProfessionalProfile } from "@/modules/professionals/useProfessionalProfile";
import { useProfessionalRemoval } from "@/modules/professionals/useProfessionalRemoval";

// COMPONENT
export const ProfessionalRemovalTA = ({ id }: { id: number }) => {
  // COMPOSABLES
  const { profile } = useProfessionalProfile(id, false);
  const { confirmation, request, actions } = useProfessionalRemoval(
    id,
    profile.value?.name ?? "",
  );

  // RENDER
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <ButtonTA
        variant="ghost"
        className="-ml-3"
        nativeButton={false}
        render={<Link to={`/admin/professionals/${id}`} />}
      >
        <ArrowLeft />
        Volver al perfil
      </ButtonTA>
      <ActionHeaderTA
        eyebrow="Profesionales · Gestión de perfil"
        title="Baja del profesional"
        description="Revisa el perfil antes de retirarlo de tu equipo."
      />
      {profile.loading ? (
        <StateTA
          title="Cargando profesional"
          description="Recuperando información del perfil."
        />
      ) : profile.error || !profile.value ? (
        <StateTA
          error
          title="No pudimos abrir el perfil"
          description={profile.error || "El perfil no está disponible."}
          onRetry={() => void profile.reload()}
        />
      ) : (
        <>
          {request.error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/5 p-4 text-sm text-destructive"
            >
              {request.error}
            </p>
          )}
          {profile.value.is_active && (
            <PanelTA
              title="Desactivar temporalmente"
              description={`Conserva el perfil de ${profile.value.name} y desactívalo para nuevas reservas.`}
            >
              <div className="px-5 pb-6 md:px-6">
                <ButtonTA
                  variant="outline"
                  onClick={() => void actions.deactivate()}
                  disabled={request.saving}
                >
                  <UserRoundMinus />
                  Desactivar profesional
                </ButtonTA>
              </div>
            </PanelTA>
          )}
          <PanelTA
            title="Eliminar del equipo"
            description="El profesional dejará de aparecer en el directorio. Las reservas existentes no se cancelan automáticamente."
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void actions.remove();
              }}
              className="space-y-5 px-5 pb-6 md:px-6"
            >
              <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm leading-relaxed">
                Vas a eliminar a <strong>{profile.value.name}</strong>. Revisa
                su agenda antes de continuar.
              </p>
              <ButtonTA
                variant="outline"
                nativeButton={false}
                render={<Link to={`/admin/calendar?professional_id=${id}`} />}
              >
                Revisar agenda
              </ButtonTA>
              <label className="block space-y-2 text-sm">
                <span>
                  Escribe <strong>{profile.value.name}</strong> para confirmar
                </span>
                <InputTA
                  autoComplete="off"
                  value={confirmation.name}
                  onChange={(event) => confirmation.setName(event.target.value)}
                  required
                  disabled={request.saving}
                />
              </label>
              <div className="flex flex-wrap justify-end gap-3">
                <ButtonTA
                  variant="outline"
                  nativeButton={false}
                  render={<Link to={`/admin/professionals/${id}`} />}
                >
                  {" "}
                  Cancelar
                </ButtonTA>
                <ButtonTA
                  type="submit"
                  variant="destructive"
                  disabled={
                    request.saving ||
                    confirmation.name.trim() !== profile.value.name.trim()
                  }
                >
                  <Trash2 />
                  {request.saving ? "Procesando…" : "Eliminar profesional"}
                </ButtonTA>
              </div>
            </form>
          </PanelTA>
        </>
      )}
    </div>
  );
};
