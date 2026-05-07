"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check } from "lucide-react";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

interface PortalSync {
  bayutFeedUrl: string;
  propertyFinderFeedUrl: string;
  propertyCount: number;
  lastUpdated: string | null;
}

export function PortalsPanel() {
  const t = useTranslations("settings");
  const [info, setInfo] = useState<PortalSync | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/api/settings/portals")
      .then((res) => setInfo(unwrap<PortalSync>(res)))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const copy = async (label: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(label);
    setTimeout(() => setCopied(null), 2500);
  };

  if (!info) {
    return (
      <div className="card p-8 text-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <p className="text-sm text-slate-600">{t("portalsHint")}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            {t("publishedProperties")}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {info.propertyCount}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            {t("lastUpdated")}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {info.lastUpdated
              ? new Date(info.lastUpdated).toLocaleString()
              : "—"}
          </p>
        </div>
      </div>

      <FeedRow
        label={t("bayutFeed")}
        url={info.bayutFeedUrl}
        copyLabel={t("copyUrl")}
        copiedLabel={t("copied")}
        copied={copied === "bayut"}
        onCopy={() => copy("bayut", info.bayutFeedUrl)}
      />
      <FeedRow
        label={t("propertyFinderFeed")}
        url={info.propertyFinderFeedUrl}
        copyLabel={t("copyUrl")}
        copiedLabel={t("copied")}
        copied={copied === "pf"}
        onCopy={() => copy("pf", info.propertyFinderFeedUrl)}
      />
    </div>
  );
}

function FeedRow({
  label,
  url,
  copyLabel,
  copiedLabel,
  copied,
  onCopy,
}: {
  label: string;
  url: string;
  copyLabel: string;
  copiedLabel: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="card p-4 space-y-2">
      <p className="label">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="flex-1 min-w-0 text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 truncate">
          {url}
        </code>
        <button onClick={onCopy} className="btn-ghost inline-flex items-center gap-1 text-xs">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? copiedLabel : copyLabel}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost text-xs"
        >
          ↗
        </a>
      </div>
    </div>
  );
}
