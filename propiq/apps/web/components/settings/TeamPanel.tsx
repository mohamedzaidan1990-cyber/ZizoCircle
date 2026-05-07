"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

interface Agent {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  invitedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_OPTIONS = ["AGENT", "MANAGER"] as const;

export function TeamPanel() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Invite form state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [iEmail, setIEmail] = useState("");
  const [iFirst, setIFirst] = useState("");
  const [iLast, setILast] = useState("");
  const [iRole, setIRole] = useState<"AGENT" | "MANAGER">("AGENT");
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const res = await api.get("/api/settings/team");
      setAgents(unwrap<Agent[]>(res));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setTempPassword(null);
    try {
      const res = await api.post("/api/settings/team/invite", {
        email: iEmail,
        firstName: iFirst,
        lastName: iLast,
        role: iRole,
      });
      const r = unwrap<{ user: Agent; tempPassword: string }>(res);
      setTempPassword(r.tempPassword);
      setIEmail("");
      setIFirst("");
      setILast("");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (id: string, role: "AGENT" | "MANAGER") => {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/api/settings/team/${id}/role`, { role });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const setActive = async (id: string, isActive: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/api/settings/team/${id}/active`, { isActive });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!agents) {
    return (
      <div className="card p-8 text-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{t("team")}</h2>
        <button
          onClick={() => setInviteOpen((v) => !v)}
          className="btn-primary inline-flex items-center gap-1"
        >
          <UserPlus className="h-4 w-4" />
          {t("inviteAgent")}
        </button>
      </div>

      {inviteOpen && (
        <form onSubmit={invite} className="card p-4 grid gap-3 lg:grid-cols-5">
          <input
            type="email"
            required
            placeholder={t("email")}
            className="input lg:col-span-2"
            value={iEmail}
            onChange={(e) => setIEmail(e.target.value)}
          />
          <input
            required
            placeholder={tCommon("firstName")}
            className="input"
            value={iFirst}
            onChange={(e) => setIFirst(e.target.value)}
          />
          <input
            required
            placeholder={tCommon("lastName")}
            className="input"
            value={iLast}
            onChange={(e) => setILast(e.target.value)}
          />
          <select
            className="input"
            value={iRole}
            onChange={(e) => setIRole(e.target.value as "AGENT" | "MANAGER")}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {t(`role_${r}`)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="btn-primary lg:col-span-5"
          >
            {busy ? <Spinner /> : t("inviteAgent")}
          </button>
        </form>
      )}

      {tempPassword && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("invited", { password: tempPassword })}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-start font-medium">{t("name")}</th>
                <th className="px-4 py-2 text-start font-medium">{t("email")}</th>
                <th className="px-4 py-2 text-start font-medium">{t("role")}</th>
                <th className="px-4 py-2 text-start font-medium">
                  {t("status")}
                </th>
                <th className="px-4 py-2 text-start font-medium">
                  {t("lastLogin")}
                </th>
                <th className="px-4 py-2 text-end font-medium">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => {
                const isAdmin = a.role === "AGENCY_ADMIN" || a.role === "SUPER_ADMIN";
                return (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-800">
                      {[a.firstName, a.lastName].filter(Boolean).join(" ")}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{a.email}</td>
                    <td className="px-4 py-2">
                      {isAdmin ? (
                        <span className="text-slate-700">
                          {t(`role_${a.role}`)}
                        </span>
                      ) : (
                        <select
                          className="input w-auto py-1 text-xs"
                          value={a.role}
                          onChange={(e) =>
                            changeRole(
                              a.id,
                              e.target.value as "AGENT" | "MANAGER",
                            )
                          }
                          disabled={busy}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {t(`role_${r}`)}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {a.isActive ? t("active") : t("inactive")}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600 text-xs">
                      {a.lastLoginAt
                        ? new Date(a.lastLoginAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-end">
                      {!isAdmin && (
                        <button
                          onClick={() => setActive(a.id, !a.isActive)}
                          disabled={busy}
                          className="btn-ghost text-xs"
                        >
                          {a.isActive ? t("deactivate") : t("reactivate")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
