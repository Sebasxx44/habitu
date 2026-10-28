// TYPES
export interface LoyaltyCard {
  id: number;
  name: string;
  business: string;
  stamps: number;
  required: number;
  reward: string;
  available: boolean;
  status: string;
  validUntil: string | null;
}

export interface LoyaltyAccount {
  points: number;
  cards: LoyaltyCard[];
  history: {
    id: number;
    points: number;
    type: string;
    description: string;
    createdAt: string;
  }[];
}

export interface LoyaltyAccountState {
  account: {
    data: LoyaltyAccount | null;
    loading: boolean;
    error: string | null;
    refresh: () => void;
  };
}

export interface LoyaltyRedemptionState {
  redemption: {
    selected: LoyaltyCard | null;
    submitting: boolean;
    error: string | null;
    select: (card: LoyaltyCard) => void;
    close: () => void;
    confirm: () => Promise<void>;
  };
}

export interface RedemptionResponse {
  message: string;
  card: LoyaltyCard;
}
