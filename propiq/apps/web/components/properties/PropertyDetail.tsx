"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Property } from "@propiq/shared";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { PropertyForm } from "./PropertyForm";
import { PhotoUploader } from "./PhotoUploader";
import { Timeline } from "@/components/activities/Timeline";

interface Props {
  locale: string;
  id: string;
}

export function PropertyDetail({ locale, id }: Props) {
  const t = useTranslations("properties");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.get(`/api/properties/${id}`);
      setProperty(unwrap<Property>(res));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onDelete = async () => {
    if (!confirm(tCommon("confirmDelete"))) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/api/properties/${id}`);
      router.push(`/${locale}/properties`);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <Spinner />
      </div>
    );
  }
  if (error || !property) {
    return (
      <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {error ?? "Not found"}
        <button onClick={load} className="btn-ghost ms-2 text-xs">
          {tCommon("retry")}
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="card p-6">
        <PropertyForm locale={locale} initial={property} />
      </div>
    );
  }

  const title = locale === "ar" && property.titleAr ? property.titleAr : property.title;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                {property.referenceNo
                  ? `${t("referenceNo")} ${property.referenceNo}`
                  : t("title")}
              </p>
              <h2 className="text-xl font-bold text-slate-900">{title}</h2>
              <p className="text-sm text-slate-600">
                {[
                  t(`type_${property.propertyType}`),
                  t(`listing_${property.listingType}`),
                  t(`status_${property.status}`),
                ].join(" · ")}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/${locale}/properties`}
                className="btn-ghost text-sm"
              >
                {tCommon("back")}
              </Link>
              <button
                onClick={() => setEditing(true)}
                className="btn-ghost inline-flex items-center gap-1 text-sm"
              >
                <Pencil className="h-4 w-4" />
                {tCommon("edit")}
              </button>
              <button
                onClick={onDelete}
                disabled={deleting}
                className="btn-ghost inline-flex items-center gap-1 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                {tCommon("delete")}
              </button>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-3 text-sm">
            <Field label={t("price")} value={property.price ? `${property.price.toLocaleString()} ${property.currency}` : "—"} />
            <Field label={t("rentPrice")} value={property.rentPrice ? `${property.rentPrice.toLocaleString()} ${property.currency}${property.rentPeriod ? `/${property.rentPeriod}` : ""}` : "—"} />
            <Field label={t("areaSqm")} value={property.areaSqm ? String(property.areaSqm) : "—"} />
            <Field label={t("bedrooms")} value={property.bedrooms != null ? String(property.bedrooms) : "—"} />
            <Field label={t("bathrooms")} value={property.bathrooms != null ? String(property.bathrooms) : "—"} />
            <Field label={t("parking")} value={property.parkingSpaces != null ? String(property.parkingSpaces) : "—"} />
            <Field label={t("floor")} value={property.floorNumber != null ? String(property.floorNumber) : "—"} />
            <Field label={t("totalFloors")} value={property.totalFloors != null ? String(property.totalFloors) : "—"} />
            <Field label={t("furnished")} value={t(`furnished_${property.furnished}`)} />
          </dl>

          <h3 className="mt-6 text-sm font-semibold text-slate-700">
            {t("location")}
          </h3>
          <dl className="mt-2 grid gap-4 sm:grid-cols-3 text-sm">
            <Field label={t("country")} value={property.country} />
            <Field label={t("city")} value={property.city} />
            <Field label={t("area")} value={property.area ?? "—"} />
            <Field label={t("subArea")} value={property.subArea ?? "—"} />
            <Field label={t("buildingName")} value={property.buildingName ?? "—"} />
            <Field label={t("unitNumber")} value={property.unitNumber ?? "—"} />
          </dl>

          {(property.description || property.descriptionAr) && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-700">
                {t("description")}
              </h3>
              {property.description && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {property.description}
                </p>
              )}
              {property.descriptionAr && (
                <p
                  className="mt-2 whitespace-pre-wrap text-sm text-slate-700"
                  dir="rtl"
                >
                  {property.descriptionAr}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            {t("photos")}
          </h3>
          <PhotoUploader property={property} onChange={setProperty} />
        </div>
      </div>

      <div className="lg:col-span-1">
        <Timeline propertyId={property.id} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-slate-800">{value}</dd>
    </div>
  );
}
