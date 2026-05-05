"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EventClickArg, DateSelectArg } from "@fullcalendar/core";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import type { Activity } from "@/components/activities/Timeline";
import { CalendarEventDialog } from "./CalendarEventDialog";

type CalEventType = "VIEWING" | "TASK" | "MEETING" | "AI_CALL";

const COLORS: Record<CalEventType, { bg: string; border: string; text: string }> = {
  VIEWING: { bg: "#3b82f6", border: "#2563eb", text: "#ffffff" }, // blue
  TASK: { bg: "#facc15", border: "#eab308", text: "#0f172a" },    // yellow
  MEETING: { bg: "#22c55e", border: "#16a34a", text: "#ffffff" }, // green
  AI_CALL: { bg: "#a855f7", border: "#9333ea", text: "#ffffff" }, // purple
};

const TRACKED_TYPES: CalEventType[] = ["VIEWING", "TASK", "MEETING", "AI_CALL"];

interface Props {
  locale: string;
}

export function CalendarView({ locale }: Props) {
  const t = useTranslations("calendar");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<{
    id?: string;
    activityType: CalEventType;
    subject: string;
    body: string;
    scheduledAt: string;
    durationMinutes: number;
    contactId: string | null;
    dealId: string | null;
  } | null>(null);
  const calRef = useRef<FullCalendar | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.get("/api/activities", { params: { limit: 100 } });
      const all = unwrap<Activity[]>(res);
      setActivities(
        all.filter(
          (a) =>
            (TRACKED_TYPES as string[]).includes(a.activityType) &&
            (a.scheduledAt || a.completedAt),
        ),
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const events = useMemo(
    () =>
      activities.map((a) => {
        const type = a.activityType as CalEventType;
        const color = COLORS[type] ?? COLORS.MEETING;
        const start = a.scheduledAt ?? a.completedAt!;
        return {
          id: a.id,
          title: a.subject ?? t(`type_${type}`),
          start,
          backgroundColor: color.bg,
          borderColor: color.border,
          textColor: color.text,
          extendedProps: {
            activityType: type,
            subject: a.subject,
            body: a.body,
            contactId: a.contactId,
            dealId: a.dealId,
          },
        };
      }),
    [activities, t],
  );

  const onSelect = (selection: DateSelectArg) => {
    setEditing({
      activityType: "VIEWING",
      subject: "",
      body: "",
      scheduledAt: selection.startStr,
      durationMinutes: Math.max(
        15,
        Math.round(
          (selection.end.getTime() - selection.start.getTime()) / 60000,
        ),
      ),
      contactId: null,
      dealId: null,
    });
    setDialogOpen(true);
  };

  const onEventClick = (arg: EventClickArg) => {
    const props = arg.event.extendedProps as {
      activityType: CalEventType;
      subject: string | null;
      body: string | null;
      contactId: string | null;
      dealId: string | null;
    };
    setEditing({
      id: arg.event.id,
      activityType: props.activityType,
      subject: props.subject ?? "",
      body: props.body ?? "",
      scheduledAt: arg.event.startStr,
      durationMinutes: 60,
      contactId: props.contactId,
      dealId: props.dealId,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="card p-3 flex flex-wrap items-center gap-3 text-xs">
        {TRACKED_TYPES.map((ty) => (
          <span key={ty} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: COLORS[ty].bg }}
            />
            {t(`type_${ty}`)}
          </span>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card p-3 [&_.fc]:text-sm [&_.fc-toolbar-title]:text-base [&_.fc-button-primary]:bg-brand [&_.fc-button-primary]:border-brand">
        {loading ? (
          <div className="p-10 text-center">
            <Spinner />
          </div>
        ) : (
          <FullCalendar
            ref={(el) => {
              calRef.current = el;
            }}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={locale}
            direction={locale === "ar" ? "rtl" : "ltr"}
            headerToolbar={{
              start: "prev,next today",
              center: "title",
              end: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            buttonText={{
              today: t("today"),
              month: t("month"),
              week: t("week"),
              day: t("day"),
            }}
            firstDay={locale === "ar" ? 6 : 1}
            height="auto"
            selectable
            select={onSelect}
            eventClick={onEventClick}
            events={events}
          />
        )}
      </div>

      <CalendarEventDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        initial={editing}
        onSaved={async () => {
          setDialogOpen(false);
          setEditing(null);
          await load();
        }}
      />
    </div>
  );
}
