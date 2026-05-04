export type DealType = "SALE" | "RENT";

export type DealStage =
  | "NEW_LEAD"
  | "CONTACTED"
  | "VIEWING_SCHEDULED"
  | "VIEWED"
  | "OFFER_MADE"
  | "NEGOTIATING"
  | "CONTRACT_SENT"
  | "CLOSED_WON"
  | "CLOSED_LOST";

export interface Deal {
  id: string;
  title: string;
  dealType: DealType;
  stage: DealStage;
  value?: number | null;
  commissionRate: number;
  commissionValue?: number | null;
  currency: string;
  probability: number;
  expectedClose?: string | null;
  closedAt?: string | null;
  lostReason?: string | null;
  contactId?: string | null;
  propertyId?: string | null;
  assignedTo?: string | null;
  aiNextAction?: string | null;
  aiRiskFlags: string[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStageGroup {
  deals: Deal[];
  count: number;
  totalValue: number;
}

export type Pipeline = Record<DealStage, PipelineStageGroup>;
