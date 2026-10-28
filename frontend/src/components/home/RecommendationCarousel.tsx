import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BusinessWithScore {
  id: number
  name: string
  category?: string
  category_name?: string
  rating?: number
  distance?: string
  image?: string
  banner_url?: string
  logo_url?: string
  score?: number
  [key: string]: any
}

interface RecommendationCarouselProps {
  businesses: BusinessWithScore[]
}

export function RecommendationCarousel({ businesses }: RecommendationCarouselProps) {
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = 280
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    })
  }

  if (!businesses || businesses.length === 0) return null

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mx-4 px-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {businesses.map((business) => (
          <div
            key={business.id}
            className="snap-start shrink-0 w-64 bg-card rounded-2xl border border-border overflow-hidden hover-lift"
          >
            <div className="relative h-36 bg-muted">
              {business.image || business.banner_url || business.logo_url ? (
                <img
                  src={business.image || business.banner_url || business.logo_url}
                  alt={business.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl font-bold">
                  {business.name?.[0] || 'B'}
                </div>
              )}
              {business.score !== undefined && (
                <Badge className="absolute top-2 right-2 bg-[#D4AF37] text-black border-0">
                  {Math.round(business.score)}% match
                </Badge>
              )}
            </div>
            <div className="p-3 space-y-2">
              <div>
                <h3 className="font-semibold text-sm truncate">{business.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {business.category || business.category_name || 'Negocio'}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {business.rating != null && (
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-[#D4AF37] text-[#D4AF37]" />
                    {business.rating}
                  </span>
                )}
                {business.distance && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {business.distance}
                  </span>
                )}
              </div>
              <Button
                onClick={() => navigate(`/cliente/business/${business.id}`)}
                className="w-full bg-[#D4AF37] hover:bg-[#B8962E] text-black text-xs h-8"
              >
                Reservar
              </Button>
            </div>
          </div>
        ))}
      </div>

      {businesses.length > 2 && (
        <>
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-8 h-8 rounded-full bg-background border border-border shadow-md items-center justify-center text-foreground hover:bg-muted transition-colors hidden md:flex"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-8 h-8 rounded-full bg-background border border-border shadow-md items-center justify-center text-foreground hover:bg-muted transition-colors hidden md:flex"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  )
}
