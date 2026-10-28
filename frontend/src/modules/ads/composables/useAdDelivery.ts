import { useEffect, useRef, useState } from "react";
import { adService } from "@/services/marketing/marketingService";
import type { MarketingAd } from "@/modules/marketing/types";
import type { AdDeliveryState } from "@/modules/ads/types";

// COMPOSABLE
export const useAdDelivery = (placement: string): AdDeliveryState => {
  // STATE
  const [ads, setAds] = useState<MarketingAd[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const container = useRef<HTMLDivElement>(null);
  const impressions = useRef(new Map<string, Promise<void>>());
  // ACTIONS
  const impression = (ad: MarketingAd): Promise<void> => {
    const token = ad.delivery_token;
    if (!token) return Promise.reject(new Error("No delivery token"));
    const existing = impressions.current.get(token);
    if (existing) return existing;
    const pending = adService
      .recordImpression(ad.id, token)
      .catch((failure) => {
        impressions.current.delete(token);
        throw failure;
      });
    impressions.current.set(token, pending);
    return pending;
  };
  const open = async (ad: MarketingAd): Promise<void> => {
    try {
      await impression(ad);
      if (ad.delivery_token)
        await adService.recordClick(ad.id, ad.delivery_token);
    } catch {
      /* Navigation remains available when measurement fails. */
    }
    if (ad.link_url?.startsWith("/b/") && !ad.link_url.startsWith("//"))
      window.location.assign(ad.link_url);
  };
  // EFFECTS
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    adService
      .getAds(placement, abort.signal)
      .then((items) => {
        if (!abort.signal.aborted) {
          setAds(items);
          setIndex(0);
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) setAds([]);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [placement]);
  useEffect(() => {
    if (ads.length < 2) return;
    const timer = window.setInterval(
      () => setIndex((value) => (value + 1) % ads.length),
      6000,
    );
    return () => window.clearInterval(timer);
  }, [ads.length]);
  useEffect(() => {
    const ad = ads[index];
    const element = container.current;
    if (!ad || !element || typeof IntersectionObserver === "undefined") return;
    let timer: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(timer);
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.5)
          timer = window.setTimeout(() => {
            void impression(ad).catch(() => undefined);
          }, 1000);
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [ads, index]);
  // PUBLIC API
  return {
    display: { ads, index, loading, container },
    actions: { select: setIndex, open },
  };
};
