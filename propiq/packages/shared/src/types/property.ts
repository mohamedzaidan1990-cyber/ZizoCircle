export type PropertyType =
  | "APARTMENT"
  | "VILLA"
  | "TOWNHOUSE"
  | "PENTHOUSE"
  | "OFFICE"
  | "RETAIL"
  | "WAREHOUSE"
  | "LAND"
  | "BUILDING";

export type ListingType = "SALE" | "RENT";

export type PropertyStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "RENTED" | "OFF_MARKET";

export type FurnishedStatus = "FURNISHED" | "SEMI_FURNISHED" | "UNFURNISHED";

export interface Property {
  id: string;
  referenceNo?: string | null;
  title: string;
  titleAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  aiDescription?: string | null;
  aiDescriptionAr?: string | null;
  aiHighlights: string[];
  propertyType: PropertyType;
  listingType: ListingType;
  status: PropertyStatus;
  price?: number | null;
  rentPrice?: number | null;
  rentPeriod?: string | null;
  currency: string;
  areaSqm?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parkingSpaces?: number | null;
  floorNumber?: number | null;
  totalFloors?: number | null;
  furnished: FurnishedStatus;
  country: string;
  city: string;
  area?: string | null;
  subArea?: string | null;
  buildingName?: string | null;
  unitNumber?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photos: string[];
  floorPlanUrl?: string | null;
  videoUrl?: string | null;
  virtualTourUrl?: string | null;
  ownerContactId?: string | null;
  assignedTo?: string | null;
  createdBy?: string | null;
  isExclusive: boolean;
  exclusiveUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListingContent {
  description_en: string;
  description_ar: string;
  highlights_en: string[];
  highlights_ar: string[];
  meta_description_en: string;
  meta_description_ar: string;
}
