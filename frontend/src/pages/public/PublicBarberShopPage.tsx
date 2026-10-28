import { HabituLogo } from '@/components/ui/HabituLogo'
import { brand } from '@/config/brand'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { MapPin, Phone, Scissors, Star } from 'lucide-react'
import { ActionHeaderTA } from '@/components/TA/ActionHeaderTA'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { SkeletonTA } from '@/components/TA/SkeletonTA'
import { usePublicBusiness } from '@/composables/usePublicBusiness'
import { formatMoney } from '@/modules/dashboard/formatters'

export const PublicBarberShopPage = () => {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const bookingParams = new URLSearchParams()
  for (const key of ['service_id', 'resource_id', 'branch_id', 'professional_id', 'promo_code', 'book']) {
    const value = params.get(key)
    if (value && value.length <= 100) bookingParams.set(key, value)
  }
  const { business, loading, error, refresh } = usePublicBusiness(slug)
  const branch = business?.branches?.find(item => item.is_main_branch) ?? business?.branches?.[0]

  if (loading) return <main className="mx-auto min-h-screen max-w-5xl p-5 sm:p-8"><SkeletonTA variant="dashboard" label="Cargando el negocio…" /></main>
  if (!business || error) return <main className="mx-auto max-w-3xl p-8"><h1 className="mb-4 text-2xl font-semibold">Negocio no disponible</h1><p>{error}</p><ButtonTA className="mt-5" onClick={refresh}>Reintentar</ButtonTA></main>

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-5 py-8 md:px-10">
      <Link to="/" className="inline-flex" aria-label={brand.name}><HabituLogo variant="horizontal" decorative /></Link>
      {business.banner_url && <img src={business.banner_url} alt={`Portada de ${business.name}`} className="h-52 w-full rounded-3xl object-cover md:h-80" />}
      <ActionHeaderTA icon={Scissors} eyebrow={business.category?.name ?? 'Tu próxima experiencia'} title={business.name} description={business.description}
        actions={<Link className="inline-flex min-h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground" to={`/cliente/business/${business.id}?${bookingParams.toString()}`}>Reservar</Link>} />
      <div className="flex flex-wrap gap-5 border-y border-border py-5 text-sm text-muted-foreground">
        {branch?.address && <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{branch.address}</span>}
        {(business.phone || branch?.phone) && <a className="inline-flex items-center gap-2 hover:text-primary" href={`tel:${business.phone || branch?.phone}`}><Phone className="h-4 w-4" />{business.phone || branch?.phone}</a>}
        {(business.reviews_count ?? 0) > 0 && <span className="inline-flex items-center gap-2"><Star className="h-4 w-4" />{business.rating} · {business.reviews_count} opiniones</span>}
      </div>
      <section aria-labelledby="public-services"><h2 id="public-services" className="mb-4 text-xl font-semibold">Servicios</h2>
        {business.services?.length ? <ul className="grid gap-4 md:grid-cols-2">{business.services.map(service => <li key={service.id} className="surface-card flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/10 p-5"><div><h3 className="font-medium">{service.name}</h3><p className="mt-1 text-sm text-muted-foreground">{service.duration_minutes ?? service.duration} minutos</p>{service.description && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{service.description}</p>}</div><span className="whitespace-nowrap font-semibold">{formatMoney(Number(service.price))} COP</span></li>)}</ul> : <p className="py-8 text-sm text-muted-foreground">Este negocio aún no ha publicado sus servicios.</p>}
      </section>
      {business.professionals && business.professionals.length > 0 && <section><h2 className="mb-4 text-xl font-semibold">Conoce al equipo</h2><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{business.professionals.map(professional => <article key={professional.id} className="surface-card flex items-center gap-4 rounded-2xl border border-border bg-card p-5">{professional.photo_url ? <img src={professional.photo_url} alt="" className="h-12 w-12 rounded-xl object-cover" loading="lazy" /> : <Scissors className="h-8 w-8 text-primary" />}<div><h3 className="font-medium">{professional.name}</h3><p className="text-sm text-muted-foreground">{professional.specialty}</p></div></article>)}</div></section>}
      <footer className="border-t border-border py-5 text-xs text-muted-foreground">{brand.tagline}</footer>
    </main>
  )
}
