// API TYPES
export interface HomePromotion {
  id: number;
  title: string;
  type: string;
  discount: number | string;
}

export interface HomePromotionBusiness {
  id: number;
  name: string;
  active_promotion: HomePromotion | null;
}

export interface HomePromotionResponse {
  success: boolean;
  data: { data: HomePromotionBusiness[] };
}

// COMPOSABLE STATE
export interface HomePromotionsState {
  results: {
    items: HomePromotionBusiness[];
    loading: boolean;
    error: string;
  };
  actions: { retry: () => void };
}
