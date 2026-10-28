import { useEffect, useState, type ReactNode } from 'react'
import type { Business, Professional } from '@/types/models'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/App'
import { MapPin, Scissors, Star, ChevronRight, CheckCircle2, Sparkles, User } from 'lucide-react'
import { businessService, professionalService } from '@/services'
import { LoadingState } from '@/components/premium'
import { ButtonTA as Button } from '@/components/TA/ButtonTA'

const SlideTransition = ({ children, show, direction = 1 }: { children: ReactNode; show: boolean; direction?: number }) => {
  const [render, setRender] = useState(show)
  useEffect(() => {
    if (show) setRender(true)
    const t = setTimeout(() => { if (!show) setRender(false) }, 300)
    return () => clearTimeout(t)
  }, [show])
  if (!render) return null
  return (
    <div className={`transition-all duration-300 ${show ? 'opacity-100 translate-x-0' : `opacity-0 ${direction > 0 ? '-translate-x-8' : 'translate-x-8'}`}`}>
      {children}
    </div>
  )
}

export const OnboardingPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [shops, setShops] = useState<Business[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [selectedShop, setSelectedShop] = useState<Business | null>(null)
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [loading, setLoading] = useState(true)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    fetchShops()
  }, [user])

  const fetchShops = async () => {
    setLoading(true)
    try {
      const res = await businessService.getAll({})
      setShops(res.businesses.slice(0, 6) || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchProfessionals = async (shopId: number) => {
    try {
      const res = await professionalService.getAll(shopId)
      setProfessionals(res)
    } catch (e) { console.error(e) }
  }

  const goStep = (newStep: number) => {
    setDirection(newStep > step ? 1 : -1)
    setStep(newStep)
  }

  const handleSelectShop = (shop: Business) => {
    setSelectedShop(shop)
    fetchProfessionals(shop.id)
    goStep(2)
  }

  const handleSelectProfessional = (prof: Professional) => {
    if (!selectedShop) return
    setSelectedProfessional(prof)
    localStorage.setItem('eb_preferred_shop', String(selectedShop.id))
    localStorage.setItem('eb_preferred_professional', String(prof.id))
    localStorage.setItem('eb_last_professional_name', prof.name)
    goStep(3)
  }

  const handleFinish = () => {
    navigate('/cliente/booking')
  }

  if (loading) return <LoadingState text="Buscando negocios cercanos..." />

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className={`h-2 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-primary' : 'bg-secondary'}`} />
              {s < 3 && (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
                  s < step ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`}>
                  {s < step ? '✓' : s + 1}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Shop */}
        <SlideTransition show={step === 1} direction={direction}>
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-secondary flex items-center justify-center mx-auto mb-4 animate-bounce">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Encuentra tu negocio</h1>
              <p className="text-sm text-muted-foreground">Selecciona el negocio donde quieres agendar</p>
            </div>

            <div className="space-y-3">
              {shops.map((shop, i) => (
                <button
                  key={shop.id}
                  onClick={() => handleSelectShop(shop)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all text-left group"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-secondary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <MapPin className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{shop.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{shop.address}</p>
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span className="text-xs text-muted-foreground">{(shop.reviews_count ?? 0) > 0 && shop.rating != null ? Number(shop.rating).toFixed(1) : 'Sin reseñas verificadas'}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">· {shop.phone || 'Contactar'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
        </SlideTransition>

        {/* Step 2: Professional */}
        <SlideTransition show={step === 2} direction={direction}>
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-secondary flex items-center justify-center mx-auto mb-4">
                <Scissors className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Elige tu profesional</h1>
              <p className="text-sm text-muted-foreground">en <span className="text-primary">{selectedShop?.name}</span></p>
            </div>

            <div className="space-y-3">
              {professionals.map((prof, i) => (
                <button
                  key={prof.id}
                  onClick={() => handleSelectProfessional(prof)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all text-left group"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/10 to-secondary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <User className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{prof.name}</p>
                    <p className="text-xs text-muted-foreground">{prof.specialty || 'Profesional'}</p>
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span className="text-xs text-muted-foreground">Sin reseñas verificadas</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              ))}
              {professionals.length === 0 && (
                <div className="text-center py-12">
                  <Scissors className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Este negocio aún no tiene profesionales registrados</p>
                </div>
              )}
            </div>

            <Button variant="ghost" className="w-full rounded-xl text-muted-foreground hover:text-foreground" onClick={() => goStep(1)}>
              ← Cambiar negocio
            </Button>
          </div>
        </SlideTransition>

        {/* Step 3: Success */}
        <SlideTransition show={step === 3} direction={direction}>
          <div className="space-y-8 text-center pt-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-secondary flex items-center justify-center mx-auto animate-pulse">
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </div>
              <div className="absolute top-0 right-1/3">
                <Sparkles className="w-6 h-6 text-primary animate-bounce" style={{ animationDelay: '200ms' }} />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold">¡Todo listo!</h1>
              <p className="text-sm text-muted-foreground">
                Has seleccionado <strong className="text-foreground">{selectedShop?.name}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Tu profesional será <strong className="text-primary">{selectedProfessional?.name}</strong>
              </p>
            </div>

            <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">Negocio</p>
                  <p className="text-sm font-semibold text-foreground">{selectedShop?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">Profesional</p>
                  <p className="text-sm font-semibold text-foreground">{selectedProfessional?.name}</p>
                </div>
              </div>
            </div>

            <Button onClick={handleFinish} className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base gap-2">
              Reservar mi primer plan <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </SlideTransition>
      </div>
    </div>
  )
}
