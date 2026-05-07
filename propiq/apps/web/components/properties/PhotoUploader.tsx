"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import type { Property } from "@propiq/shared";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Props {
  property: Property;
  onChange: (next: Property) => void;
}

export function PhotoUploader({ property, onChange }: Props) {
  const t = useTranslations("properties");
  const tCommon = useTranslations("common");
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append("photos", f));
      const res = await api.post(`/api/properties/${property.id}/photos`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(unwrap<Property>(res));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePhoto = async (url: string) => {
    if (!confirm(tCommon("confirmDelete"))) return;
    setRemoving(url);
    setError(null);
    try {
      const res = await api.delete(`/api/properties/${property.id}/photos`, {
        data: { url },
      });
      onChange(unwrap<Property>(res));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-3">
      <label
        className="card flex cursor-pointer items-center justify-center gap-2 px-4 py-6 text-sm text-slate-600 hover:bg-slate-50"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFiles(e.dataTransfer.files);
        }}
      >
        {busy ? <Spinner /> : <Upload className="h-4 w-4" />}
        <span>{t("dragHint")}</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
          disabled={busy}
        />
      </label>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {property.photos.length === 0 ? (
        <p className="text-sm text-slate-500">{t("noPhotos")}</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {property.photos.map((url) => (
            <li key={url} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${API_URL}${url}`}
                alt=""
                className="aspect-square w-full rounded-md object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(url)}
                disabled={removing === url}
                className="absolute end-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow opacity-0 group-hover:opacity-100 transition disabled:opacity-100"
                aria-label={t("deletePhoto")}
              >
                {removing === url ? (
                  <Spinner className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
