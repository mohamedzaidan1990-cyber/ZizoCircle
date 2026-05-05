"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

interface AgencyProfile {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  licenseNumber: string | null;
  country: string;
  city: string;
  logo: string | null;
  primaryColor: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function ProfilePanel() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [profile, setProfile] = useState<AgencyProfile | null>(null);
  const [draft, setDraft] = useState<Partial<AgencyProfile>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    api
      .get("/api/settings/agency")
      .then((res) => {
        const p = unwrap<AgencyProfile>(res);
        setProfile(p);
        setDraft(p);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setDone(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const key of [
        "name",
        "nameAr",
        "licenseNumber",
        "country",
        "city",
        "primaryColor",
      ] as const) {
        if (draft[key] !== undefined && draft[key] !== profile?.[key]) {
          payload[key] = draft[key];
        }
      }
      if (Object.keys(payload).length === 0) {
        setDone(t("saved"));
        return;
      }
      const res = await api.patch("/api/settings/agency", payload);
      const p = unwrap<AgencyProfile>(res);
      setProfile(p);
      setDraft(p);
      setDone(t("saved"));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setDone(null);
    try {
      const form = new FormData();
      form.append("logo", file);
      const res = await api.post("/api/settings/agency/logo", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const p = unwrap<AgencyProfile>(res);
      setProfile(p);
      setDraft(p);
      setDone(t("saved"));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!profile) {
    return (
      <div className="card p-8 text-center">
        <Spinner />
      </div>
    );
  }

  return (
    <form onSubmit={onSave} className="card p-5 space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-md bg-slate-100 overflow-hidden flex items-center justify-center text-slate-400">
          {profile.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${API_URL}${profile.logo}`}
              alt="Logo"
              className="h-full w-full object-cover"
            />
          ) : (
            <Building2Placeholder />
          )}
        </div>
        <label className="btn-ghost cursor-pointer inline-flex items-center gap-1 text-sm">
          {uploading ? <Spinner /> : <Upload className="h-4 w-4" />}
          {t("uploadLogo")}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={onLogo}
            disabled={uploading}
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="label">{t("agencyName")}</label>
          <input
            className="input"
            value={draft.name ?? ""}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            required
            minLength={2}
          />
        </div>
        <div>
          <label className="label">{t("agencyNameAr")}</label>
          <input
            className="input"
            dir="rtl"
            value={draft.nameAr ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, nameAr: e.target.value || null })
            }
          />
        </div>
        <div>
          <label className="label">{t("licenseNumber")}</label>
          <input
            className="input"
            value={draft.licenseNumber ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, licenseNumber: e.target.value || null })
            }
          />
        </div>
        <div>
          <label className="label">{t("city")}</label>
          <input
            className="input"
            value={draft.city ?? ""}
            onChange={(e) => setDraft({ ...draft, city: e.target.value })}
          />
        </div>
        <div>
          <label className="label">{t("country")}</label>
          <input
            className="input"
            value={draft.country ?? ""}
            onChange={(e) => setDraft({ ...draft, country: e.target.value })}
          />
        </div>
        <div>
          <label className="label">{t("primaryColor")}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-10 w-14 rounded border border-slate-300"
              value={draft.primaryColor ?? "#0F766E"}
              onChange={(e) =>
                setDraft({ ...draft, primaryColor: e.target.value })
              }
            />
            <input
              className="input flex-1"
              placeholder="#0F766E"
              value={draft.primaryColor ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, primaryColor: e.target.value || null })
              }
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {done && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {done}
        </div>
      )}

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <Spinner /> : tCommon("save")}
        </button>
      </div>
    </form>
  );
}

function Building2Placeholder() {
  return (
    <svg
      className="h-8 w-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
    </svg>
  );
}
