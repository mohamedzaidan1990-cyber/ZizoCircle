export type ContactType = "BUYER" | "SELLER" | "TENANT" | "LANDLORD" | "INVESTOR";

export type LeadTier = "HOT" | "WARM" | "COLD";

export type PipelineType = "SALES" | "LEASE";

export type LeadStatus = "ACTIVE" | "DEAD" | "WON" | "LOST";

export interface Contact {
  id: string;
  firstName: string;
  lastName?: string | null;
  firstNameAr?: string | null;
  lastNameAr?: string | null;
  email?: string | null;
  phone: string;
  phoneAlt?: string | null;
  nationality?: string | null;
  contactType: ContactType;
  pipelineType: PipelineType;
  source?: string | null;
  sourceDetail?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency: string;
  preferredAreas: string[];
  bedroomsMin?: number | null;
  bedroomsMax?: number | null;
  propertyTypes: string[];
  notes?: string | null;
  aiScore: number;
  aiScoreReason?: string | null;
  aiScoredAt?: string | null;
  aiTier?: LeadTier | null;
  aiQualifiers?: Record<string, unknown> | null;
  conversationSummary?: string | null;
  propifyStatus?: "NEW" | "ARCHIVED" | null;
  propertyRef?: string | null;
  propertyName?: string | null;
  assignedTo?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  /** Computed at query time, not stored. */
  status?: LeadStatus;
  /** Computed at query time from aiScore. */
  tier?: LeadTier;
  /** Computed at query time. ISO timestamp of the most recent activity. */
  lastActivityAt?: string | null;
}

export interface LeadScoreResult {
  score: number;
  tier: LeadTier;
  reason: string;
  recommendedAction: string;
  redFlags: string[];
}

export function tierFromScore(score: number): LeadTier {
  if (score >= 80) return "HOT";
  if (score >= 50) return "WARM";
  return "COLD";
}
