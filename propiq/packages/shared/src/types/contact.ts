export type ContactType = "BUYER" | "SELLER" | "TENANT" | "LANDLORD" | "INVESTOR";

export type LeadTier = "HOT" | "WARM" | "COLD";

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
  assignedTo?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadScoreResult {
  score: number;
  tier: LeadTier;
  reason: string;
  recommendedAction: string;
  redFlags: string[];
}
