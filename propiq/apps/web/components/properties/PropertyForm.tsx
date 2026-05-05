"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type {
  FurnishedStatus,
  ListingType,
  Property,
  PropertyStatus,
  PropertyType,
} from "@propiq/shared";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

const PROPERTY_TYPES: PropertyType[] = [
  "APARTMENT",
  "VILLA",
  "TOWNHOUSE",
  "PENTHOUSE",
  "OFFICE",
  "RETAIL",
  "WAREHOUSE",
  "LAND",
  "BUILDING",
];
const LISTING_TYPES: ListingType[] = ["SALE", "RENT"];
const STATUSES: PropertyStatus[] = [
  "AVAILABLE",
  "RESERVED",
  "SOLD",
  "RENTED",
  "OFF_MARKET",
];
const FURNISHED: FurnishedStatus[] = [
  "FURNISHED",
  "SEMI_FURNISHED",
  "UNFURNISHED",
];

const numFromInput = z
  .union([z.coerce.number().nonnegative(), z.literal("")])
  .optional();
const intFromInput = z
  .union([z.coerce.number().int().nonnegative(), z.literal("")])
  .optional();

const schema = z.object({
  referenceNo: z.string().max(50).optional().or(z.literal("")),
  title: z.string().min(2).max(255),
  titleAr: z.string().max(255).optional().or(z.literal("")),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  propertyType: z.enum([
    "APARTMENT",
    "VILLA",
    "TOWNHOUSE",
    "PENTHOUSE",
    "OFFICE",
    "RETAIL",
    "WAREHOUSE",
    "LAND",
    "BUILDING",
  ]),
  listingType: z.enum(["SALE", "RENT"]),
  status: z.enum(["AVAILABLE", "RESERVED", "SOLD", "RENTED", "OFF_MARKET"]),
  price: intFromInput,
  rentPrice: intFromInput,
  rentPeriod: z.string().max(20).optional().or(z.literal("")),
  currency: z.string().length(3).optional().or(z.literal("")),
  areaSqm: numFromInput,
  bedrooms: intFromInput,
  bathrooms: intFromInput,
  parkingSpaces: intFromInput,
  floorNumber: z
    .union([z.coerce.number().int(), z.literal("")])
    .optional(),
  totalFloors: intFromInput,
  furnished: z.enum(["FURNISHED", "SEMI_FURNISHED", "UNFURNISHED"]),
  country: z.string().max(50).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  area: z.string().max(100).optional().or(z.literal("")),
  subArea: z.string().max(100).optional().or(z.literal("")),
  buildingName: z.string().max(200).optional().or(z.literal("")),
  unitNumber: z.string().max(50).optional().or(z.literal("")),
  isExclusive: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  locale: string;
  initial?: Property;
}

export function PropertyForm({ locale, initial }: Props) {
  const t = useTranslations("properties");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const defaults: FormValues = {
    referenceNo: initial?.referenceNo ?? "",
    title: initial?.title ?? "",
    titleAr: initial?.titleAr ?? "",
    description: initial?.description ?? "",
    descriptionAr: initial?.descriptionAr ?? "",
    propertyType: (initial?.propertyType ?? "APARTMENT") as PropertyType,
    listingType: (initial?.listingType ?? "SALE") as ListingType,
    status: (initial?.status ?? "AVAILABLE") as PropertyStatus,
    price: (initial?.price ?? "") as unknown as number,
    rentPrice: (initial?.rentPrice ?? "") as unknown as number,
    rentPeriod: initial?.rentPeriod ?? "",
    currency: initial?.currency ?? "QAR",
    areaSqm: (initial?.areaSqm ?? "") as unknown as number,
    bedrooms: (initial?.bedrooms ?? "") as unknown as number,
    bathrooms: (initial?.bathrooms ?? "") as unknown as number,
    parkingSpaces: (initial?.parkingSpaces ?? "") as unknown as number,
    floorNumber: (initial?.floorNumber ?? "") as unknown as number,
    totalFloors: (initial?.totalFloors ?? "") as unknown as number,
    furnished: (initial?.furnished ?? "UNFURNISHED") as FurnishedStatus,
    country: initial?.country ?? "Qatar",
    city: initial?.city ?? "Doha",
    area: initial?.area ?? "",
    subArea: initial?.subArea ?? "",
    buildingName: initial?.buildingName ?? "",
    unitNumber: initial?.unitNumber ?? "",
    isExclusive: initial?.isExclusive ?? false,
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const num = (v: unknown) => (v === "" || v === undefined ? null : Number(v));
    const str = (v: unknown) =>
      v === "" || v === undefined ? null : String(v);

    const payload = {
      referenceNo: str(values.referenceNo),
      title: values.title,
      titleAr: str(values.titleAr),
      description: str(values.description),
      descriptionAr: str(values.descriptionAr),
      propertyType: values.propertyType,
      listingType: values.listingType,
      status: values.status,
      price: num(values.price),
      rentPrice: num(values.rentPrice),
      rentPeriod: str(values.rentPeriod),
      currency: values.currency || "QAR",
      areaSqm: num(values.areaSqm),
      bedrooms: num(values.bedrooms),
      bathrooms: num(values.bathrooms),
      parkingSpaces: num(values.parkingSpaces),
      floorNumber: num(values.floorNumber),
      totalFloors: num(values.totalFloors),
      furnished: values.furnished,
      country: values.country || "Qatar",
      city: values.city || "Doha",
      area: str(values.area),
      subArea: str(values.subArea),
      buildingName: str(values.buildingName),
      unitNumber: str(values.unitNumber),
      isExclusive: values.isExclusive ?? false,
    };
    try {
      const res = initial
        ? await api.patch(`/api/properties/${initial.id}`, payload)
        : await api.post(`/api/properties`, payload);
      const saved = unwrap<Property>(res);
      router.push(`/${locale}/properties/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-4 lg:grid-cols-2"
      noValidate
    >
      <div className="lg:col-span-2">
        <label className="label">{t("title_field")}</label>
        <input className="input" {...register("title")} />
        {errors.title && (
          <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
        )}
      </div>
      <div className="lg:col-span-2">
        <label className="label">{t("titleAr")}</label>
        <input className="input" dir="rtl" {...register("titleAr")} />
      </div>

      <div>
        <label className="label">{t("type")}</label>
        <select className="input" {...register("propertyType")}>
          {PROPERTY_TYPES.map((p) => (
            <option key={p} value={p}>
              {t(`type_${p}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">{t("listingType")}</label>
        <select className="input" {...register("listingType")}>
          {LISTING_TYPES.map((p) => (
            <option key={p} value={p}>
              {t(`listing_${p}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">{t("status")}</label>
        <select className="input" {...register("status")}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`status_${s}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">{t("furnished")}</label>
        <select className="input" {...register("furnished")}>
          {FURNISHED.map((f) => (
            <option key={f} value={f}>
              {t(`furnished_${f}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">{t("price")}</label>
        <input type="number" className="input" {...register("price")} />
      </div>
      <div>
        <label className="label">{t("rentPrice")}</label>
        <input type="number" className="input" {...register("rentPrice")} />
      </div>
      <div>
        <label className="label">{t("rentPeriod")}</label>
        <input className="input" {...register("rentPeriod")} />
      </div>
      <div>
        <label className="label">{t("areaSqm")}</label>
        <input type="number" className="input" {...register("areaSqm")} />
      </div>

      <div>
        <label className="label">{t("bedrooms")}</label>
        <input type="number" className="input" {...register("bedrooms")} />
      </div>
      <div>
        <label className="label">{t("bathrooms")}</label>
        <input type="number" className="input" {...register("bathrooms")} />
      </div>
      <div>
        <label className="label">{t("parking")}</label>
        <input type="number" className="input" {...register("parkingSpaces")} />
      </div>
      <div>
        <label className="label">{t("floor")}</label>
        <input type="number" className="input" {...register("floorNumber")} />
      </div>

      <div>
        <label className="label">{t("country")}</label>
        <input className="input" {...register("country")} />
      </div>
      <div>
        <label className="label">{t("city")}</label>
        <input className="input" {...register("city")} />
      </div>
      <div>
        <label className="label">{t("area")}</label>
        <input className="input" {...register("area")} />
      </div>
      <div>
        <label className="label">{t("subArea")}</label>
        <input className="input" {...register("subArea")} />
      </div>
      <div>
        <label className="label">{t("buildingName")}</label>
        <input className="input" {...register("buildingName")} />
      </div>
      <div>
        <label className="label">{t("unitNumber")}</label>
        <input className="input" {...register("unitNumber")} />
      </div>

      <div className="lg:col-span-2">
        <label className="label">{t("description")}</label>
        <textarea
          className="input min-h-[100px]"
          {...register("description")}
        />
      </div>
      <div className="lg:col-span-2">
        <label className="label">{t("descriptionAr")}</label>
        <textarea
          className="input min-h-[100px]"
          dir="rtl"
          {...register("descriptionAr")}
        />
      </div>

      <div className="lg:col-span-2 flex items-center gap-2">
        <input
          id="isExclusive"
          type="checkbox"
          {...register("isExclusive")}
        />
        <label htmlFor="isExclusive" className="text-sm text-slate-700">
          {t("exclusive")}
        </label>
      </div>

      {error && (
        <div className="lg:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="lg:col-span-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-ghost"
          disabled={isSubmitting}
        >
          {tCommon("cancel")}
        </button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : tCommon("save")}
        </button>
      </div>
    </form>
  );
}
