export type CampaignStatus =
  "DRAFT" | "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface Campaign {
  id: number;
  subject: string;
  body: string;
  type: string;
  target_role: "CLIENTE" | "PROFESSIONAL";
  target_ids: number[] | null;
  status: CampaignStatus;
  recipients_count: number;
  sent_count: number;
  sent_at: string | null;
}

export interface CampaignStats {
  total_recipients: number;
  sent_success: number;
  failed: number;
  opened: number;
  logs: Array<{
    id: number;
    recipient_email: string;
    recipient_name: string;
    status: string;
    created_at: string;
  }>;
}

export interface CampaignForm {
  subject: string;
  body: string;
  type: string;
  target_role: "CLIENTE" | "PROFESSIONAL";
  target_ids: number[];
}

export interface CampaignRecipient {
  id: number;
  name: string;
  email: string | null;
}

export interface CampaignServiceOption {
  id: number;
  name: string;
}

export interface PromotionForm {
  id: number | null;
  title: string;
  description: string;
  discount: number;
  type: "PORCENTAJE" | "FIJO";
  start_date: string;
  end_date: string;
  active: boolean;
  image_url: string;
  promo_code: string;
  services: Array<{
    id: number;
    discount: number;
    type: "PORCENTAJE" | "FIJO";
  }>;
}
