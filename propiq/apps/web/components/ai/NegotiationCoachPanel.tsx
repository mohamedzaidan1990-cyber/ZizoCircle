"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Send, RotateCcw, Trophy, Sparkles } from "lucide-react";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { postStream } from "@/lib/stream";
import { Spinner } from "@/components/ui/Spinner";

type Scenario =
  | "PRICE_OBJECTION"
  | "MULTIPLE_OFFERS"
  | "REPAIR_REQUESTS"
  | "FINANCING_FALLTHROUGH"
  | "RELOCATION_DEADLINE"
  | "FREE_FORM";

const SCENARIOS: Scenario[] = [
  "PRICE_OBJECTION",
  "MULTIPLE_OFFERS",
  "REPAIR_REQUESTS",
  "FINANCING_FALLTHROUGH",
  "RELOCATION_DEADLINE",
  "FREE_FORM",
];

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface Debrief {
  overallScore: number;
  rubric: {
    discovery: number;
    framing: number;
    concessions: number;
    closing: number;
  };
  whatWentWell: string[];
  whatToImprove: string[];
  oneThingNextTime: string;
}

export function NegotiationCoachPanel() {
  const t = useTranslations("ai");
  const [scenario, setScenario] = useState<Scenario>("PRICE_OBJECTION");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [debriefing, setDebriefing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Kick off the scenario opener when scenario changes.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [history, streamingText]);

  const reset = () => {
    abortRef.current?.abort();
    setHistory([]);
    setDraft("");
    setStreamingText("");
    setStreaming(false);
    setDebrief(null);
    setError(null);
    // Auto-trigger the AI's opening move.
    void streamTurn([]);
  };

  const streamTurn = async (turns: ChatTurn[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    setStreamingText("");
    setError(null);
    let assembled = "";
    try {
      await postStream(
        "/api/ai/negotiation/stream",
        { scenario, history: turns },
        {
          onDelta: (text) => {
            assembled += text;
            setStreamingText(assembled);
          },
          onDone: () => {
            // Move the streaming text into history once done.
            setHistory((prev) => [
              ...prev,
              { role: "assistant", content: assembled },
            ]);
            setStreamingText("");
          },
          onError: (msg) => setError(msg),
        },
        controller.signal,
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(getErrorMessage(err));
    } finally {
      setStreaming(false);
    }
  };

  const send = async () => {
    if (!draft.trim() || streaming) return;
    const userTurn: ChatTurn = { role: "user", content: draft.trim() };
    const next = [...history, userTurn];
    setHistory(next);
    setDraft("");
    await streamTurn(next);
  };

  const onDebrief = async () => {
    if (history.length < 2) return;
    setDebriefing(true);
    setError(null);
    try {
      const res = await api.post("/api/ai/negotiation/debrief", {
        scenario,
        history,
      });
      setDebrief(unwrap<Debrief>(res));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDebriefing(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{t("coachHint")}</p>

      <div className="card flex flex-wrap items-center gap-3 p-3">
        <label className="text-sm font-medium text-slate-700">
          {t("scenario")}
        </label>
        <select
          className="input flex-1 w-full min-w-0 sm:w-auto sm:min-w-[200px]"
          value={scenario}
          onChange={(e) => setScenario(e.target.value as Scenario)}
        >
          {SCENARIOS.map((s) => (
            <option key={s} value={s}>
              {t(`scenario_${s}`)}
            </option>
          ))}
        </select>
        <button
          onClick={reset}
          className="btn-ghost inline-flex items-center gap-1 text-sm w-full sm:w-auto justify-center"
        >
          <RotateCcw className="h-4 w-4" />
          {t("newSession")}
        </button>
      </div>

      <div
        ref={transcriptRef}
        className="card max-h-[460px] min-h-[260px] overflow-y-auto p-4 space-y-3"
      >
        {history.length === 0 && !streamingText && (
          <p className="text-sm text-slate-500 italic">
            <Sparkles className="inline h-3.5 w-3.5 me-1" />
            {t("generating")}
          </p>
        )}
        {history.map((turn, i) => (
          <Message key={i} turn={turn} />
        ))}
        {streamingText && (
          <Message turn={{ role: "assistant", content: streamingText }} streaming />
        )}
      </div>

      <div className="card p-3 flex flex-wrap gap-2">
        <input
          type="text"
          className="input flex-1 min-w-[160px] w-full sm:w-auto"
          placeholder={t("yourMove")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={streaming}
        />
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={send}
            disabled={!draft.trim() || streaming}
            className="btn-primary inline-flex items-center gap-1 flex-1 sm:flex-initial justify-center"
          >
            <Send className="h-4 w-4" />
            {t("send")}
          </button>
          <button
            onClick={onDebrief}
            disabled={history.length < 2 || debriefing || streaming}
            className="btn-ghost inline-flex items-center gap-1 text-sm flex-1 sm:flex-initial justify-center"
          >
            {debriefing ? <Spinner /> : <Trophy className="h-4 w-4" />}
            {debriefing ? t("debriefing") : t("debrief")}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {debrief && <DebriefCard debrief={debrief} />}
    </div>
  );
}

function Message({ turn, streaming }: { turn: ChatTurn; streaming?: boolean }) {
  const isAgent = turn.role === "user";
  return (
    <div
      className={`max-w-[85%] rounded-lg p-3 text-sm ${
        isAgent
          ? "ms-auto bg-brand text-white"
          : "bg-slate-100 text-slate-900"
      }`}
    >
      <p className="whitespace-pre-wrap">
        {turn.content}
        {streaming && <span className="ms-1 inline-block animate-pulse">▋</span>}
      </p>
    </div>
  );
}

function DebriefCard({ debrief }: { debrief: Debrief }) {
  const t = useTranslations("ai");
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-baseline gap-3">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h3 className="text-base font-semibold">{t("debriefTitle")}</h3>
      </div>

      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-slate-900">
          {debrief.overallScore}
        </span>
        <span className="text-sm text-slate-500">/ 100 · {t("overallScore")}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        {(["discovery", "framing", "concessions", "closing"] as const).map((k) => (
          <div key={k} className="rounded-md border border-slate-200 p-2">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              {t(`rubric_${k}`)}
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {debrief.rubric[k]} <span className="text-xs text-slate-500">/ 25</span>
            </p>
          </div>
        ))}
      </div>

      <div>
        <p className="label">{t("wentWell")}</p>
        <ul className="list-disc ms-5 text-sm text-emerald-700 space-y-1">
          {debrief.whatWentWell.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>

      <div>
        <p className="label">{t("toImprove")}</p>
        <ul className="list-disc ms-5 text-sm text-rose-700 space-y-1">
          {debrief.whatToImprove.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>

      <div>
        <p className="label">{t("oneThing")}</p>
        <p className="text-sm text-slate-800">{debrief.oneThingNextTime}</p>
      </div>
    </div>
  );
}
