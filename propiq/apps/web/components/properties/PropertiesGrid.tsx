"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import type {
  ListingType,
  Property,
  PropertyStatus,
  PropertyType,
} from "@propiq/shared";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";

const TYPES: PropertyType[] = [
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
const LISTINGS: ListingType[] = ["SALE", "RENT"];
const STATUSES: PropertyStatus[] = [
  "AVAILABLE",
  "RESERVED",
  "SOLD",
  "RENTED",
  "OFF_MARKET",
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Props {
  locale: string;
}

export function PropertiesGrid({ locale }: Props) {
  const t = useTranslations("properties");
  const tCommon = useTranslations("common");
  const [items, setItems] = useState<Property[] | null>(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType | "">("");
  const [listingType, setListingType] = useState<ListingType | "">("");
  const [status, setStatus] = useState<PropertyStatus | "">("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const limit = 24;

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total],
  );

  const load = async () => {
    setError(null);
    try {
      const res = await api.get("/api/properties", {
        params: {
          search,
          propertyType: propertyType || undefined,
          listingType: listingType || undefined,
          status: status || undefined,
          page,
          limit,
        },
      });
      setItems(unwrap<Property[]>(res));
      const meta = (res.data as { meta?: { total: number } }).meta;
      if (meta) setTotal(meta.total);
    } catch (err) {
      setError(getErrorMessage(err));
      setItems([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, propertyType, listingType, status]);

  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      load();
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 p-3">
        <input
          className="input"
          placeholder={t("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input"
          value={propertyType}
          onChange={(e) => {
            setPage(1);
            setPropertyType(e.target.value as PropertyType | "");
          }}
        >
          <option value="">{tCommon("all")}</option>
          {TYPES.map((p) => (
            <option key={p} value={p}>
              {t(`type_${p}`)}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={listingType}
          onChange={(e) => {
            setPage(1);
            setListingType(e.target.value as ListingType | "");
          }}
        >
          <option value="">{tCommon("all")}</option>
          {LISTINGS.map((l) => (
            <option key={l} value={l}>
              {t(`listing_${l}`)}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as PropertyStatus | "");
          }}
        >
          <option value="">{tCommon("all")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`status_${s}`)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {items === null ? (
        <div className="card p-8 text-center">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title={t("noProperties")} />
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => {
            const cover = p.photos[0];
            const title =
              locale === "ar" && p.titleAr ? p.titleAr : p.title;
            return (
              <li key={p.id}>
                <Link
                  href={`/${locale}/properties/${p.id}`}
                  className="card block overflow-hidden hover:shadow-md transition"
                >
                  <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center text-slate-400">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${API_URL}${cover}`}
                        alt={title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-10 w-10" />
                    )}
                  </div>
                  <div className="p-4 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">
                        {title}
                      </h3>
                      <span className="text-xs uppercase tracking-wide text-brand-700">
                        {t(`listing_${p.listingType}`)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {[p.area, p.subArea, p.city].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {p.listingType === "RENT"
                        ? p.rentPrice
                          ? `${p.rentPrice.toLocaleString()} ${p.currency}${p.rentPeriod ? `/${p.rentPeriod}` : ""}`
                          : "—"
                        : p.price
                          ? `${p.price.toLocaleString()} ${p.currency}`
                          : "—"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[
                        p.bedrooms ? `${p.bedrooms} bd` : null,
                        p.bathrooms ? `${p.bathrooms} ba` : null,
                        p.areaSqm ? `${p.areaSqm} sqm` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
