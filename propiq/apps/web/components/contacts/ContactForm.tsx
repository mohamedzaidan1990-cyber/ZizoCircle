"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Contact, ContactType } from "@propiq/shared";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

const contactTypes: ContactType[] = [
  "BUYER",
  "SELLER",
  "TENANT",
  "LANDLORD",
  "INVESTOR",
];

const schema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional().or(z.literal("")),
  firstNameAr: z.string().max(100).optional().or(z.literal("")),
  lastNameAr: z.string().max(100).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(3).max(50),
  phoneAlt: z.string().max(50).optional().or(z.literal("")),
  nationality: z.string().max(50).optional().or(z.literal("")),
  contactType: z.enum(["BUYER", "SELLER", "TENANT", "LANDLORD", "INVESTOR"]),
  source: z.string().max(50).optional().or(z.literal("")),
  budgetMin: z
    .union([z.coerce.number().int().nonnegative(), z.literal("")])
    .optional(),
  budgetMax: z
    .union([z.coerce.number().int().nonnegative(), z.literal("")])
    .optional(),
  currency: z.string().length(3).optional().or(z.literal("")),
  preferredAreas: z.string().optional(),
  bedroomsMin: z
    .union([z.coerce.number().int().nonnegative(), z.literal("")])
    .optional(),
  bedroomsMax: z
    .union([z.coerce.number().int().nonnegative(), z.literal("")])
    .optional(),
  propertyTypes: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  locale: string;
  initial?: Contact;
}

function splitList(input?: string): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ContactForm({ locale, initial }: Props) {
  const t = useTranslations("contacts");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const defaults: FormValues = {
    firstName: initial?.firstName ?? "",
    lastName: initial?.lastName ?? "",
    firstNameAr: initial?.firstNameAr ?? "",
    lastNameAr: initial?.lastNameAr ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    phoneAlt: initial?.phoneAlt ?? "",
    nationality: initial?.nationality ?? "",
    contactType: initial?.contactType ?? "BUYER",
    source: initial?.source ?? "",
    budgetMin: initial?.budgetMin ?? ("" as unknown as number),
    budgetMax: initial?.budgetMax ?? ("" as unknown as number),
    currency: initial?.currency ?? "QAR",
    preferredAreas: initial?.preferredAreas?.join(", ") ?? "",
    bedroomsMin: initial?.bedroomsMin ?? ("" as unknown as number),
    bedroomsMax: initial?.bedroomsMax ?? ("" as unknown as number),
    propertyTypes: initial?.propertyTypes?.join(", ") ?? "",
    notes: initial?.notes ?? "",
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
    const payload = {
      firstName: values.firstName,
      lastName: values.lastName || null,
      firstNameAr: values.firstNameAr || null,
      lastNameAr: values.lastNameAr || null,
      email: values.email || null,
      phone: values.phone,
      phoneAlt: values.phoneAlt || null,
      nationality: values.nationality || null,
      contactType: values.contactType,
      source: values.source || null,
      budgetMin: values.budgetMin === "" ? null : Number(values.budgetMin),
      budgetMax: values.budgetMax === "" ? null : Number(values.budgetMax),
      currency: values.currency || "QAR",
      preferredAreas: splitList(values.preferredAreas),
      bedroomsMin: values.bedroomsMin === "" ? null : Number(values.bedroomsMin),
      bedroomsMax: values.bedroomsMax === "" ? null : Number(values.bedroomsMax),
      propertyTypes: splitList(values.propertyTypes),
      notes: values.notes || null,
    };
    try {
      const res = initial
        ? await api.patch(`/api/contacts/${initial.id}`, payload)
        : await api.post(`/api/contacts`, payload);
      const saved = unwrap<Contact>(res);
      router.push(`/${locale}/contacts/${saved.id}`);
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
      <div>
        <label className="label">{tCommon("firstName")}</label>
        <input className="input" {...register("firstName")} />
        {errors.firstName && (
          <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
        )}
      </div>
      <div>
        <label className="label">{tCommon("lastName")}</label>
        <input className="input" {...register("lastName")} />
      </div>

      <div>
        <label className="label">{tCommon("phone")}</label>
        <input className="input" {...register("phone")} />
        {errors.phone && (
          <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
        )}
      </div>
      <div>
        <label className="label">{tCommon("email")}</label>
        <input type="email" className="input" {...register("email")} />
        {errors.email && (
          <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="label">{t("type")}</label>
        <select className="input" {...register("contactType")}>
          {contactTypes.map((tp) => (
            <option key={tp} value={tp}>
              {t(`type_${tp}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">{t("source")}</label>
        <input className="input" {...register("source")} />
      </div>

      <div>
        <label className="label">{t("minBudget")}</label>
        <input type="number" className="input" {...register("budgetMin")} />
      </div>
      <div>
        <label className="label">{t("maxBudget")}</label>
        <input type="number" className="input" {...register("budgetMax")} />
      </div>

      <div>
        <label className="label">{t("minBedrooms")}</label>
        <input type="number" className="input" {...register("bedroomsMin")} />
      </div>
      <div>
        <label className="label">{t("maxBedrooms")}</label>
        <input type="number" className="input" {...register("bedroomsMax")} />
      </div>

      <div className="lg:col-span-2">
        <label className="label">{t("preferredAreas")}</label>
        <input
          className="input"
          placeholder={t("areasHint")}
          {...register("preferredAreas")}
        />
      </div>

      <div className="lg:col-span-2">
        <label className="label">{t("propertyTypes")}</label>
        <input
          className="input"
          placeholder={t("typesHint")}
          {...register("propertyTypes")}
        />
      </div>

      <div className="lg:col-span-2">
        <label className="label">{tCommon("notes")}</label>
        <textarea className="input min-h-[100px]" {...register("notes")} />
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
