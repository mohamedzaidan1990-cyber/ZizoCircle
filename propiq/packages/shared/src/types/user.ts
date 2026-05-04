export type UserRole =
  | "SUPER_ADMIN"
  | "AGENCY_ADMIN"
  | "MANAGER"
  | "AGENT"
  | "VIEWER";

export type Language = "EN" | "AR";

export type Plan = "STARTER" | "GROWTH" | "AGENCY" | "ENTERPRISE";

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string | null;
  lastNameAr?: string | null;
  phone?: string | null;
  avatar?: string | null;
  role: UserRole;
  language: Language;
  agencyId: string;
}

export interface PublicAgency {
  id: string;
  name: string;
  nameAr?: string | null;
  slug: string;
  country: string;
  city: string;
  plan: Plan;
  logo?: string | null;
  primaryColor?: string | null;
}

export interface JwtPayload {
  userId: string;
  agencyId: string;
  agencySlug: string;
  role: UserRole;
  language: Language;
  iat?: number;
  exp?: number;
}
