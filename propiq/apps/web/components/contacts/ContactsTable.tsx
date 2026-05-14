"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { Contact, ContactType, LeadTier, PipelineType } from "@propiq/shared";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { ReactivateDialog } from "./ReactivateDialog";

const TYPES: ContactType[] = [
  "BUYER",
  "SELLER",
  "TENANT",
  "LANDLORD",
  "INVESTOR",
];

type Tab = "ALL" | "SALES" | "LEASE" | "DEAD";

const TIER_BADGE: Record<LeadTier, string> = {
  HOT: "bg-emerald-100 text-emerald-700",
  WARM: "bg-amber-100 text-amber-700",
  COLD: "bg-slate-100 text-slate-600",
};

interface Props {
  locale: string;
}

export function ContactsTable({ locale }: Props) {
  const t = useTranslations("contacts");
  const tCommon = useTranslations("common");
  const [items, setItems] = useState<Contact[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<ContactType | "">("");
  const [tab, setTab] = useState<Tab>("ALL");
  const [page, setPage] = useState(1);
  const [reactivateContact, setReactivateContact] = useState<Contact | null>(
    null,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  const limit = 25;

  const clearSelection = () => setSelected(new Set());

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllOnPage = () => {
    if (!items) return;
    setSelected((prev) => {
      const allSelected = items.every((c) => prev.has(c.id));
      if (allSelected) {
        const next = new Set(prev);
        for (const c of items) next.delete(c.id);
        return next;
      }
      const next = new Set(prev);
      for (const c of items) next.add(c.id);
      return next;
    });
  };

  const runBulk = async (
    action: "archive" | "unarchive",
  ) => {
    if (selected.size === 0) return;
    if (!confirm(`${action === "archive" ? t("bulkConfirmArchive") : t("bulkConfirmUnarchive")} (${selected.size})`)) {
      return;
    }
    setBulkBusy(true);
    setBulkMsg(null);
    try {
      const res = await api.post("/api/contacts/bulk", {
        action,
        contactIds: [...selected],
      });
      const data = unwrap<{ updated: number }>(res);
      setBulkMsg(`${data.updated} ${t("bulkUpdated")}`);
      clearSelection();
      await load();
    } catch (err) {
      setBulkMsg(getErrorMessage(err));
    } finally {
      setBulkBusy(false);
    }
  };

  const runBulkScore = async () => {
    if (selected.size === 0) return;
    if (selected.size > 25) {
      if (!confirm(t("bulkScoreLargeConfirm"))) return;
    }
    setBulkBusy(true);
    setBulkMsg(null);
    const ids = [...selected];
    let scored = 0;
    let failed = 0;
    // Fan out three at a time so we don't hammer the API while still feeling
    // snappy on small selections.
    const POOL = 3;
    let cursor = 0;
    const worker = async () => {
      while (cursor < ids.length) {
        const myIndex = cursor++;
        try {
          await api.post("/api/ai/lead-scorer/score", { contactId: ids[myIndex] });
          scored += 1;
        } catch {
          failed += 1;
        }
      }
    };
    await Promise.all(Array.from({ length: POOL }, () => worker()));
    setBulkBusy(false);
    setBulkMsg(`${scored} ${t("bulkScored")}${failed ? ` · ${failed} ${t("bulkScoreFailed")}` : ""}`);
    clearSelection();
    await load();
  };

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total],
  );

  const tabFilter = (): { pipelineType?: PipelineType; status?: "DEAD" } => {
    switch (tab) {
      case "SALES":
        return { pipelineType: "SALES" };
      case "LEASE":
        return { pipelineType: "LEASE" };
      case "DEAD":
        return { status: "DEAD" };
      default:
        return {};
    }
  };

  const load = async () => {
    setError(null);
    try {
      const res = await api.get("/api/contacts", {
        params: {
          search,
          contactType: type || undefined,
          ...tabFilter(),
          page,
          limit,
        },
      });
      setItems(unwrap<Contact[]>(res));
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
  }, [page, type, tab]);

  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      load();
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fmtName = (c: Contact) =>
    locale === "ar" && c.firstNameAr
      ? `${c.firstNameAr} ${c.lastNameAr ?? ""}`.trim()
      : `${c.firstName} ${c.lastName ?? ""}`.trim();

  const TABS: { id: Tab; label: string }[] = [
    { id: "ALL", label: t("tabAll") },
    { id: "SALES", label: t("tabSales") },
    { id: "LEASE", label: t("tabLease") },
    { id: "DEAD", label: t("tabDead") },
  ];

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-1 p-1">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            onClick={() => {
              setPage(1);
              setTab(tb.id);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === tb.id
                ? "bg-brand text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "DEAD" && (
        <p className="text-xs text-slate-500">{t("deadHint")}</p>
      )}

      <div className="card flex flex-wrap items-center gap-3 p-3">
        <input
          className="input flex-1 min-w-[220px]"
          placeholder={t("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input w-auto"
          value={type}
          onChange={(e) => {
            setPage(1);
            setType(e.target.value as ContactType | "");
          }}
        >
          <option value="">{tCommon("all")}</option>
          {TYPES.map((ty) => (
            <option key={ty} value={ty}>
              {t(`type_${ty}`)}
            </option>
          ))}
        </select>
      </div>

      {selected.size > 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-brand-200 bg-brand-50/40 p-3">
          <span className="text-sm font-medium text-brand-800">
            {t("bulkSelected", { count: selected.size })}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => runBulk("archive")}
              disabled={bulkBusy}
              className="btn-ghost text-xs disabled:opacity-50"
            >
              {t("bulkArchive")}
            </button>
            <button
              onClick={() => runBulk("unarchive")}
              disabled={bulkBusy}
              className="btn-ghost text-xs disabled:opacity-50"
            >
              {t("bulkUnarchive")}
            </button>
            <button
              onClick={runBulkScore}
              disabled={bulkBusy}
              className="btn-ghost text-xs disabled:opacity-50"
            >
              {bulkBusy ? <Spinner /> : t("bulkScore")}
            </button>
            <button
              onClick={clearSelection}
              disabled={bulkBusy}
              className="btn-ghost text-xs disabled:opacity-50"
            >
              {t("bulkClear")}
            </button>
          </div>
        </div>
      )}

      {bulkMsg && (
        <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
          {bulkMsg}
        </div>
      )}

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
        <EmptyState title={t("noContacts")} />
      ) : (
        <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="w-10 px-3 py-2 text-start font-medium">
                  <input
                    type="checkbox"
                    checked={
                      items.length > 0 && items.every((c) => selected.has(c.id))
                    }
                    onChange={toggleAllOnPage}
                    aria-label="select all on page"
                  />
                </th>
                <th className="px-4 py-2 text-start font-medium">
                  {tCommon("firstName")}
                </th>
                <th className="px-4 py-2 text-start font-medium">{t("type")}</th>
                <th className="px-4 py-2 text-start font-medium">
                  {t("pipeline")}
                </th>
                <th className="px-4 py-2 text-start font-medium">
                  {t("tier")}
                </th>
                <th className="px-4 py-2 text-start font-medium">
                  {tCommon("phone")}
                </th>
                <th className="px-4 py-2 text-start font-medium">
                  {t("budget")}
                </th>
                {tab === "DEAD" && (
                  <th className="px-4 py-2 text-end font-medium">
                    {tCommon("actions")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const tier = c.tier ?? "COLD";
                return (
                  <tr
                    key={c.id}
                    className={`border-t border-slate-100 hover:bg-slate-50 ${selected.has(c.id) ? "bg-brand-50/40" : ""}`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleOne(c.id)}
                        aria-label={`select ${fmtName(c)}`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/${locale}/contacts/${c.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {fmtName(c)}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {t(`type_${c.contactType}`)}
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {t(`pipeline_${c.pipelineType}`)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TIER_BADGE[tier]}`}
                      >
                        {t(`tier_${tier}`)}
                        {c.aiScore > 0 ? ` · ${c.aiScore}` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-700">{c.phone}</td>
                    <td className="px-4 py-2 text-slate-700">
                      {c.budgetMin || c.budgetMax
                        ? `${c.budgetMin?.toLocaleString() ?? "—"} – ${c.budgetMax?.toLocaleString() ?? "—"} ${c.currency}`
                        : "—"}
                    </td>
                    {tab === "DEAD" && (
                      <td className="px-4 py-2 text-end">
                        <button
                          onClick={() => setReactivateContact(c)}
                          className="btn-ghost text-xs"
                        >
                          {t("reactivate")}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <ReactivateDialog
        contact={reactivateContact}
        onClose={() => setReactivateContact(null)}
        onLogged={() => {
          setReactivateContact(null);
          load();
        }}
      />
    </div>
  );
}
