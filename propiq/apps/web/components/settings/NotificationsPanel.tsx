"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

interface Prefs {
  newLeadAssignedEmail: boolean;
  newLeadAssignedWhatsapp: boolean;
  dealStageChangeEmail: boolean;
  dealStageChangeWhatsapp: boolean;
  activityDueEmail: boolean;
  activityDueWhatsapp: boolean;
}

const ROWS: { id: "newLeadAssigned" | "dealStageChange" | "activityDue" }[] = [
  { id: "newLeadAssigned" },
  { id: "dealStageChange" },
  { id: "activityDue" },
];

export function NotificationsPanel() {
  const t = useTranslations("settings");
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/api/settings/notifications")
      .then((res) => setPrefs(unwrap<Prefs>(res)))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const toggle = async (key: keyof Prefs, value: boolean) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    setError(null);
    setDone(null);
    try {
      await api.patch("/api/settings/notifications", { [key]: value });
      setDone(t("saved"));
    } catch (err) {
      setError(getErrorMessage(err));
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  };

  if (!prefs) {
    return (
      <div className="card p-8 text-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{t("notifications_intro")}</p>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {done && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {done} {saving && <Spinner className="ms-1" />}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 text-start font-medium" />
              <th className="px-4 py-2 text-center font-medium">
                {t("channelEmail")}
              </th>
              <th className="px-4 py-2 text-center font-medium">
                {t("channelWhatsapp")}
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ id }) => (
              <tr key={id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-800">{t(id)}</td>
                <td className="px-4 py-3 text-center">
                  <Toggle
                    checked={prefs[`${id}Email` as keyof Prefs]}
                    onChange={(v) =>
                      toggle(`${id}Email` as keyof Prefs, v)
                    }
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <Toggle
                    checked={prefs[`${id}Whatsapp` as keyof Prefs]}
                    onChange={(v) =>
                      toggle(`${id}Whatsapp` as keyof Prefs, v)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? "bg-brand" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}
