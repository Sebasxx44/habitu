import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Download,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Users,
  UserCheck,
  X,
} from "lucide-react";
import { useAuth } from "@/App";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import {
  ProfessionalAvatarTA,
  ProfessionalContactTA,
  ProfessionalMetricTA,
  ProfessionalStatusTA,
  professionalSelectClass,
} from "@/modules/professionals/ProfessionalPrimitivesTA";
import { useProfessionalsDirectory } from "@/modules/professionals/useProfessionalsDirectory";

// COMPONENT
export const ProfessionalsDirectoryTA = () => {
  // COMPOSABLES
  const { user } = useAuth();
  const { data, filters, request, actions } = useProfessionalsDirectory(
    user?.barber_shop_id,
  );

  // RENDER
  return (
    <div className="space-y-6 pb-8">
      <ActionHeaderTA
        eyebrow="Personas · Equipo"
        title="Profesionales"
        description="Tu equipo, sus especialidades y su disponibilidad, en un solo lugar."
        actions={
          <>
            <ButtonTA
              variant="outline"
              onClick={() => void request.reload()}
              disabled={request.loading}
              aria-label="Actualizar profesionales"
            >
              <RefreshCw className={request.loading ? "animate-spin" : ""} />
            </ButtonTA>
            <ButtonTA
              nativeButton={false}
              render={<Link to="/admin/professionals/new" />}
            >
              <Plus />
              Nuevo profesional
            </ButtonTA>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ProfessionalMetricTA
          label="Equipo total"
          value={request.loading ? "—" : data.items.length}
          caption="Perfiles registrados"
          icon={<Users />}
        />
        <ProfessionalMetricTA
          label="Profesionales activos"
          value={request.loading ? "—" : data.active}
          caption={`${data.items.length - data.active} inactivos`}
          icon={<UserCheck />}
        />
        <ProfessionalMetricTA
          label="Con disponibilidad"
          value={request.loading ? "—" : data.scheduled}
          caption="Con horarios registrados"
          icon={<Clock3 />}
        />
        <ProfessionalMetricTA
          label="Comisión promedio"
          value={
            request.loading
              ? "—"
              : `${data.averageCommission.toLocaleString("es-CO", { maximumFractionDigits: 1 })}%`
          }
          caption="Sobre el equipo registrado"
          icon={<Percent />}
        />
      </div>
      <PanelTA
        title="Directorio del equipo"
        description="Encuentra el perfil que necesitas y pasa a la acción."
        action={
          <ButtonTA
            variant="ghost"
            onClick={actions.exportCsv}
            disabled={!data.filtered.length || request.loading}
          >
            <Download />
            Exportar
          </ButtonTA>
        }
      >
        <div className="grid gap-3 px-5 pb-5 md:grid-cols-2 md:px-6 xl:grid-cols-[minmax(220px,1.7fr)_1fr_1fr_1fr]">
          <div>
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="professional-search"
            >
              Buscar
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-3.5 size-4 text-muted-foreground"
              />
              <InputTA
                id="professional-search"
                value={filters.search}
                onChange={(event) =>
                  filters.update("search", event.target.value)
                }
                placeholder="Nombre, correo o teléfono"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="professional-status"
            >
              Estado
            </label>
            <select
              id="professional-status"
              className={professionalSelectClass}
              value={filters.status}
              onChange={(event) => filters.update("status", event.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
          <div>
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="professional-specialty"
            >
              Especialidad
            </label>
            <select
              id="professional-specialty"
              className={professionalSelectClass}
              value={filters.specialty}
              onChange={(event) =>
                filters.update("specialty", event.target.value)
              }
            >
              <option value="all">Todas las especialidades</option>
              {data.specialties.map((specialty) => (
                <option key={specialty}>{specialty}</option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="professional-sort"
            >
              Ordenar por
            </label>
            <select
              id="professional-sort"
              className={professionalSelectClass}
              value={filters.sort}
              onChange={(event) => filters.update("sort", event.target.value)}
            >
              <option value="name">Nombre · A a Z</option>
              <option value="recent">Más recientes</option>
              <option value="commission">Mayor comisión</option>
            </select>
          </div>
        </div>
        <div className="flex min-h-12 items-center justify-between border-t border-border bg-secondary/30 px-5 py-2 text-xs text-muted-foreground md:px-6">
          <p role="status">
            {request.loading
              ? "Actualizando equipo…"
              : `${data.filtered.length} de ${data.items.length} profesionales`}
          </p>
          {filters.hasFilters && (
            <ButtonTA variant="ghost" size="sm" onClick={filters.clear}>
              <X />
              Limpiar filtros
            </ButtonTA>
          )}
        </div>
      </PanelTA>
      {request.error ? (
        <StateTA
          error
          title="No pudimos cargar el equipo"
          description={request.error}
          onRetry={() => void request.reload()}
        />
      ) : request.loading && !data.items.length ? (
        <StateTA
          title="Cargando profesionales"
          description="Estamos consultando la información de tu equipo."
        />
      ) : !data.filtered.length ? (
        <PanelTA
          title={
            data.items.length ? "Sin coincidencias" : "Tu equipo empieza aquí"
          }
        >
          <StateTA
            title={
              data.items.length
                ? "Prueba con otros filtros"
                : "Agrega tu primer profesional"
            }
            description={
              data.items.length
                ? "Busca otro nombre, estado o especialidad."
                : "Crea un perfil con sus datos, especialidad y comisión."
            }
          />
          <div className="flex justify-center pb-6">
            {data.items.length ? (
              <ButtonTA variant="outline" onClick={filters.clear}>
                Limpiar filtros
              </ButtonTA>
            ) : (
              <ButtonTA
                nativeButton={false}
                render={<Link to="/admin/professionals/new" />}
              >
                <Plus />
                Nuevo profesional
              </ButtonTA>
            )}
          </div>
        </PanelTA>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {data.filtered.map((professional) => (
            <article
              key={professional.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] transition-colors hover:border-primary/35"
            >
              <div className="flex items-start gap-3 p-5">
                <ProfessionalAvatarTA
                  name={professional.name}
                  photo={professional.photo_url}
                />
                <div className="min-w-0 flex-1">
                  <Link
                    className="font-semibold tracking-tight hover:text-primary hover:underline"
                    to={`/admin/professionals/${professional.id}`}
                  >
                    {professional.name}
                  </Link>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {professional.specialty || "Sin especialidad registrada"}
                  </p>
                </div>
                <ProfessionalStatusTA active={professional.is_active} />
              </div>
              <div className="px-5 pb-5">
                <ProfessionalContactTA professional={professional} />
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-secondary/40 p-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      Comisión
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {professional.commission_percentage ?? 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      Disponibilidad
                    </p>
                    <Link
                      to={`/admin/professionals/${professional.id}/availability`}
                      className="mt-1 inline-block text-sm font-medium text-primary hover:underline"
                    >
                      {
                        new Set(
                          professional.availability
                            .filter((slot) => slot.is_available)
                            .map((slot) => slot.day_of_week),
                        ).size
                      }{" "}
                      días / semana
                    </Link>
                  </div>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
                <ButtonTA
                  variant="ghost"
                  className="mr-auto"
                  nativeButton={false}
                  render={
                    <Link to={`/admin/professionals/${professional.id}`} />
                  }
                >
                  Ver perfil
                  <ArrowUpRight />
                </ButtonTA>
                <ButtonTA
                  variant="outline"
                  size="icon"
                  aria-label={`Ver agenda de ${professional.name}`}
                  nativeButton={false}
                  render={
                    <Link
                      to={`/admin/calendar?professional_id=${professional.id}`}
                    />
                  }
                >
                  <CalendarDays />
                </ButtonTA>
                <ButtonTA
                  variant="outline"
                  size="icon"
                  aria-label={`Editar a ${professional.name}`}
                  nativeButton={false}
                  render={
                    <Link to={`/admin/professionals/${professional.id}/edit`} />
                  }
                >
                  <Pencil />
                </ButtonTA>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
