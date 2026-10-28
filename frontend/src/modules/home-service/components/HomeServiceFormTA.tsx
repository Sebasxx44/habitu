import {
  ArrowRight,
  Check,
  Loader2,
  LocateFixed,
  MapPin,
  Scissors,
  ShieldCheck,
} from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { HomeServiceMapTA } from "@/modules/home-service/components/HomeServiceMapTA";
import { HOME_SERVICE_CATEGORIES } from "@/modules/home-service/helpers";
import type {
  HomeServiceFormState,
  HomeServiceLocationState,
} from "@/modules/home-service/types";

// TYPES
interface HomeServiceFormProps {
  form: HomeServiceFormState;
  location: HomeServiceLocationState;
}

// COMPONENT
export const HomeServiceFormTA = ({ form, location }: HomeServiceFormProps) => (
  <form
    onSubmit={(event) => {
      event.preventDefault();
      void form.submit();
    }}
    noValidate
    className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]"
  >
    <div className="space-y-6">
      <PanelTA
        title="1. ¿Qué necesitas hoy?"
        description="Elige un servicio y cuéntanos cómo te gustaría recibirlo."
        action={<Scissors className="size-5 text-primary" />}
      >
        <div className="space-y-5 px-5 pb-6 md:px-6">
          <fieldset
            id="home-service-category"
            tabIndex={-1}
            aria-describedby={
              form.errors.category ? "home-service-category-error" : undefined
            }
          >
            <legend className="sr-only">Tipo de servicio</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {HOME_SERVICE_CATEGORIES.map((category) => (
                <label
                  key={category.value}
                  className={`relative flex cursor-pointer flex-col gap-2 rounded-xl border p-3 transition-colors focus-within:ring-2 focus-within:ring-primary ${form.values.category === category.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/50"}`}
                >
                  <input
                    type="radio"
                    name="home-service-category"
                    value={category.value}
                    checked={form.values.category === category.value}
                    onChange={() => form.setField("category", category.value)}
                    className="sr-only"
                    disabled={form.submitting}
                  />
                  <span
                    className="flex items-center justify-between text-xl"
                    aria-hidden="true"
                  >
                    {category.symbol}
                    {form.values.category === category.value && (
                      <Check className="size-4" />
                    )}
                  </span>
                  <span className="text-xs font-semibold">
                    {category.label}
                  </span>
                </label>
              ))}
            </div>
            {form.errors.category && (
              <p
                id="home-service-category-error"
                className="mt-2 text-xs text-destructive"
                role="alert"
              >
                {form.errors.category}
              </p>
            )}
          </fieldset>
          <div>
            <label
              htmlFor="home-service-description"
              className="mb-2 block text-sm font-medium"
            >
              Detalles del servicio
            </label>
            <textarea
              id="home-service-description"
              value={form.values.description}
              onChange={(event) =>
                form.setField("description", event.target.value)
              }
              maxLength={1400}
              minLength={10}
              rows={4}
              required
              disabled={form.submitting}
              placeholder="Ej. Corte fade medio y barba delineada. Tengo el cabello corto y busco un acabado natural."
              aria-invalid={!!form.errors.description}
              aria-describedby="home-service-description-help"
              className="w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
            <p
              id="home-service-description-help"
              className={`mt-1 text-xs ${form.errors.description ? "text-destructive" : "text-muted-foreground"}`}
            >
              {form.errors.description ??
                `${form.values.description.length}/1.400 caracteres. Incluye preferencias o necesidades de atención.`}
            </p>
          </div>
        </div>
      </PanelTA>
      <PanelTA
        title="2. ¿Dónde te atendemos?"
        description="La dirección y el punto del mapa ayudan al profesional a encontrarte."
        action={<MapPin className="size-5 text-primary" />}
      >
        <div className="space-y-4 px-5 pb-6 md:px-6">
          <div>
            <label
              htmlFor="home-service-address"
              className="mb-2 block text-sm font-medium"
            >
              Dirección completa
            </label>
            <InputTA
              id="home-service-address"
              value={form.values.address}
              onChange={(event) => form.setField("address", event.target.value)}
              autoComplete="street-address"
              placeholder="Ciudad, calle, número y barrio"
              maxLength={500}
              required
              disabled={form.submitting}
              aria-invalid={!!form.errors.address}
              aria-describedby={
                form.errors.address ? "home-service-address-error" : undefined
              }
            />
            {form.errors.address && (
              <p
                id="home-service-address-error"
                className="mt-1 text-xs text-destructive"
                role="alert"
              >
                {form.errors.address}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="home-service-instructions"
              className="mb-2 block text-sm font-medium"
            >
              Indicaciones para llegar{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </label>
            <InputTA
              id="home-service-instructions"
              value={form.values.instructions}
              onChange={(event) =>
                form.setField("instructions", event.target.value)
              }
              maxLength={350}
              placeholder="Apartamento, portería, piso o punto de referencia"
              disabled={form.submitting}
            />
          </div>
          <ButtonTA
            id="home-service-location"
            type="button"
            variant="outline"
            onClick={location.locate}
            disabled={location.locating || form.submitting}
            className="w-full sm:w-auto"
          >
            {location.locating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LocateFixed className="size-4" />
            )}
            {location.locating
              ? "Obteniendo ubicación…"
              : location.point
                ? "Actualizar mi ubicación"
                : "Usar mi ubicación actual"}
          </ButtonTA>
          {(location.error || form.errors.location) && (
            <p role="alert" className="text-sm text-destructive">
              {location.error ?? form.errors.location}
            </p>
          )}
          {location.point && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="size-4 text-emerald-600" />
              Punto seleccionado
              {location.point.accuracy
                ? ` · precisión aproximada de ${Math.round(location.point.accuracy)} m`
                : ""}
            </p>
          )}
          <HomeServiceMapTA
            point={location.point}
            onSelect={form.submitting ? undefined : location.select}
          />
          <details className="rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground">
            <summary className="cursor-pointer py-1 font-medium">
              Ingresar coordenadas manualmente
            </summary>
            <p className="py-2">
              Alternativa al mapa: copia la latitud y longitud de la dirección
              donde recibirás atención.
            </p>
            <div className="grid grid-cols-2 gap-3 pb-2">
              <label>
                Latitud
                <InputTA
                  type="number"
                  aria-label="Latitud"
                  step="any"
                  min={-90}
                  max={90}
                  value={location.manual.latitude}
                  disabled={form.submitting}
                  onChange={(event) =>
                    location.manual.setLatitude(event.target.value)
                  }
                  name="home-service-latitude"
                />
              </label>
              <label>
                Longitud
                <InputTA
                  type="number"
                  aria-label="Longitud"
                  step="any"
                  min={-180}
                  max={180}
                  value={location.manual.longitude}
                  disabled={form.submitting}
                  onChange={(event) =>
                    location.manual.setLongitude(event.target.value)
                  }
                  name="home-service-longitude"
                />
              </label>
            </div>
          </details>
        </div>
      </PanelTA>
    </div>
    <aside className="space-y-4 lg:sticky lg:top-6">
      <PanelTA
        title="Tu servicio, a tu manera"
        description="Revisa los detalles antes de buscar un profesional."
        className="border-primary/20"
      >
        <div className="space-y-5 px-5 pb-6 md:px-6">
          <div className="rounded-xl bg-primary/10 p-4">
            <div className="mb-2 flex justify-between gap-2 text-xs font-medium">
              <span>Tu solicitud</span>
              <span>{form.progress} de 4 datos listos</span>
            </div>
            <progress
              value={form.progress}
              max={4}
              aria-label="Datos completos de la solicitud"
              className="h-1.5 w-full accent-primary"
            />
          </div>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Servicio</dt>
              <dd className="mt-1 font-semibold">
                {HOME_SERVICE_CATEGORIES.find(
                  (category) => category.value === form.values.category,
                )?.label ?? "Elige una categoría"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Punto de atención
              </dt>
              <dd className="mt-1 break-words">
                {form.values.address.trim() || "Completa tu dirección"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Disponibilidad</dt>
              <dd className="mt-1">
                Se confirma cuando un profesional acepta.
              </dd>
            </div>
            <div className="border-t border-border pt-4">
              <dt className="text-xs text-muted-foreground">
                Valor del servicio
              </dt>
              <dd className="mt-1 text-xl font-bold">Por confirmar</dd>
              <dd className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Acuerda el alcance y el precio con el profesional antes de
                iniciar. Esta solicitud no realiza un cobro.
              </dd>
            </div>
          </dl>
          <ButtonTA type="submit" disabled={form.submitting} className="w-full">
            {form.submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4" />
            )}
            {form.submitting ? "Enviando solicitud…" : "Buscar profesional"}
          </ButtonTA>
          <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            Consulta aquí el profesional asignado, su llegada y el estado de tu
            atención.
          </p>
        </div>
      </PanelTA>
      <div className="rounded-2xl border border-border p-5">
        <h2 className="text-sm font-semibold">Prepara tu espacio</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Ten buena iluminación, un lugar cómodo y acceso a una toma de
          corriente. Comparte cualquier necesidad especial en los detalles del
          servicio.
        </p>
      </div>
    </aside>
  </form>
);
