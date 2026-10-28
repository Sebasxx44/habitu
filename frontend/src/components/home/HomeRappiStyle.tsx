import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/App'
import { useBusinessCategories } from '@/hooks/useBusinessCategories'
import { recommendationService, walletService, businessService, promotionService } from '@/services'
import { AdBanner } from '@/components/home/AdBanner'
import { RecommendationCarousel } from '@/components/home/RecommendationCarousel'
import { PromotionBanner } from '@/components/home/PromotionBanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Circle, Scissors, PenTool, Sparkles, Droplets, Dumbbell, Goal, Music, Footprints, Gamepad2, type LucideIcon } from 'lucide-react'
import type { Business } from '@/types/models'
import type { WalletAccount } from '@/composables/wallet/types'
import type { BusinessRecommendation, MarketingPromotion } from '@/modules/marketing/types'
import { MapPin, Wallet, Zap, Star, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export const HomeRappiStyle = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { categories } = useBusinessCategories()
  const [recommendations, setRecommendations] = useState<BusinessRecommendation[]>([])
  const [nearbyBusinesses, setNearbyBusinesses] = useState<Business[]>([])
  const [wallet, setWallet] = useState<WalletAccount | null>(null)
  const [promotions, setPromotions] = useState<MarketingPromotion[]>([])
  const [loadingRecs, setLoadingRecs] = useState(true)
  const [loadingNearby, setLoadingNearby] = useState(true)

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoadingRecs(true)
      try {
        const recs = await recommendationService.getRecommendations()
        setRecommendations(recs || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingRecs(false)
      }

      setLoadingNearby(true)
      try {
        const businesses = await businessService.search('')
        setNearbyBusinesses((businesses || []).slice(0, 4))
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingNearby(false)
      }

      try {
        const w = await walletService.getWallet()
        setWallet(w)
      } catch (e) {
        console.error(e)
      }

      try {
        const promos = await promotionService.getPromotions()
        setPromotions(promos || [])
      } catch (e) {
        console.error(e)
      }
    }

    fetchData()
  }, [])

  const getCategoryIcon = (iconName?: string) => {
    const icons: Record<string, LucideIcon> = { Scissors, PenTool, Sparkles, Droplets, Dumbbell, Goal, Music, Footprints, Gamepad2 }
    const Icon = icons[iconName || ''] || Circle
    return Icon
  }

  const promotionItems = promotions.filter((promotion) => promotion.promo_code || promotion.code).map((p) => ({
    id: p.id,
    code: p.promo_code || p.code || '',
    discount_value: p.discount ?? p.discount_value ?? 0,
    description: p.description || p.title || '',
    end_date: p.end_date,
    type: p.type,
  }))

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{greeting()}</p>
            <h1 className="text-xl font-bold text-foreground">
              {user?.name || 'Usuario'}
            </h1>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="w-3 h-3" />
              <span>Explora negocios</span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2">
            <Wallet className="w-4 h-4 text-[#D4AF37]" />
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Saldo
              </p>
              <p className="text-sm font-bold text-foreground">
                {wallet ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: wallet.currency }).format(Number(wallet.balance)) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div
          className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.icon)
            return (
              <button
                key={cat.id}
                onClick={() => navigate(`/cliente/explore?category=${cat.slug}`)}
                className="flex flex-col items-center gap-1.5 min-w-[4.5rem]"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: cat.color || '#D4AF37' }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium text-foreground">
                  {cat.name}
                </span>
              </button>
            )
          })}
        </div>

        {/* Immediate Service CTA */}
        <Button
          onClick={() => navigate('/cliente/booking')}
          className="w-full h-14 text-base font-semibold bg-[#D4AF37] hover:bg-[#B8962E] text-black rounded-2xl shadow-lg shadow-[#D4AF37]/20 gap-2"
        >
          <Zap className="w-5 h-5" />
          Servicio inmediato
        </Button>
      </div>

      {/* Ad Banner */}
      <div className="px-4 mb-6">
        <AdBanner placement="HOME" />
      </div>

      {/* Recommendations */}
      <div className="mb-6">
        <div className="px-4 flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">
            Recomendados para ti
          </h2>
          <button
            onClick={() => navigate('/cliente/explore')}
            className="text-xs text-[#D4AF37] font-medium flex items-center gap-0.5"
          >
            Ver todo <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {loadingRecs ? (
          <div className="flex gap-4 px-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-64 h-64 bg-muted rounded-2xl animate-pulse shrink-0"
              />
            ))}
          </div>
        ) : (
          <RecommendationCarousel
            businesses={recommendations.map((r) => ({
              ...r.business,
              category: r.business.category?.name,
              score: r.score * 100,
              distance: r.business.distance == null ? undefined : `${r.business.distance.toFixed(1)} km`,
            }))}
          />
        )}
      </div>

      {/* Nearby Businesses */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">
            Negocios para explorar
          </h2>
          <button
            onClick={() => navigate('/cliente/explore')}
            className="text-xs text-[#D4AF37] font-medium flex items-center gap-0.5"
          >
            Ver todo <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {loadingNearby
            ? [1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-40 bg-muted rounded-2xl animate-pulse"
                />
              ))
            : nearbyBusinesses.map((business) => (
                <Card
                  key={business.id}
                  className="overflow-hidden cursor-pointer hover:border-[#D4AF37]/50 transition-colors"
                  onClick={() => navigate(`/cliente/business/${business.id}`)}
                >
                  <div className="h-24 bg-muted relative -mt-4 -mx-4 mb-0">
                    {business.banner_url || business.logo_url ? (
                      <img
                        src={business.banner_url || business.logo_url}
                        alt={business.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xl font-bold">
                        {business.name?.[0] || 'B'}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2.5 space-y-1">
                    <h3 className="text-sm font-semibold truncate">
                      {business.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {business.rating != null && (
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-[#D4AF37] text-[#D4AF37]" />
                          {business.rating}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />
                        {business.address || 'Dirección no disponible'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>
      </div>

      {/* Promotions */}
      {promotionItems.length > 0 && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground">Promociones</h2>
            <button
              onClick={() => navigate('/cliente/explore')}
              className="text-xs text-[#D4AF37] font-medium flex items-center gap-0.5"
            >
              Ver todo <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <PromotionBanner promotions={promotionItems} />
        </div>
      )}
    </div>
  )
}
