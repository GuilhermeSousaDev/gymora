import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Play } from "lucide-react";
import { requireOnboardedUser } from "@/lib/session";
import { getActivePlan, listPlans, recentSessions, todayWeekday } from "@/lib/data";
import { startSession } from "@/app/actions/sessions";
import { Card, CardTitle, PageTitle, cn } from "@/components/ui";
import { PlanView } from "@/components/plan-view";
import { dateTime, duration } from "@/lib/format";
import { ImportPlanCard } from "./import-card";
import { GeneratePlanCard, NewBlankPlanButton, PhotoFeedbackCard, PlanRowActions } from "./client";

export default async function TrainingPage() {
  const { user } = await requireOnboardedUser();
  const locale = await getLocale();
  const t = await getTranslations("training");
  const ts = await getTranslations("enums.source");
  const tw = await getTranslations("enums.weekdaysLong");
  const [active, plans, sessions] = await Promise.all([
    getActivePlan(user.id),
    listPlans(user.id),
    recentSessions(user.id, 8),
  ]);
  const today = todayWeekday();

  return (
    <div className="space-y-6">
      <PageTitle>{t("title")}</PageTitle>

      <Card>
        <CardTitle>{t("activePlan")}</CardTitle>
        {!active ? (
          <p className="text-sm text-muted">{t("noPlan")}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-3xl font-bold leading-none">{active.name}</h2>
              <Link href={`/training/plans/${active.id}`} className="text-sm font-medium underline underline-offset-4 hover:text-plate-blue">
                {t("editPlan")}
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {active.plan.days.map((day, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-[var(--r-md)] border bg-paper p-4",
                    day.weekday === today ? "border-2 border-iron" : "border-rule",
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm text-steel">
                      {day.weekday === today ? t("todayWithDay", { day: tw(day.weekday) }) : tw(day.weekday)}
                    </p>
                    <p className="truncate font-display text-xl font-semibold leading-tight">{day.title}</p>
                    <p className="text-xs text-muted">
                      {t("dayCounts", { exercises: day.exercises.length, sets: day.exercises.reduce((a, e) => a + e.sets, 0) })}
                    </p>
                  </div>
                  <form action={startSession.bind(null, active.id, i)}>
                    <button className="flex items-center gap-1.5 rounded-[var(--r-md)] bg-iron px-4 py-2.5 text-sm font-semibold text-paper hover:bg-iron/85">
                      <Play className="size-4 fill-current" /> {t("start")}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
            <details className="rounded-[var(--r-md)] border border-rule bg-paper p-4">
              <summary className="cursor-pointer text-sm text-muted">{active.plan.split || active.name}</summary>
              <div className="mt-4">
                <PlanView plan={active.plan} compact />
              </div>
            </details>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <GeneratePlanCard />
        <ImportPlanCard />
      </div>

      <PhotoFeedbackCard hasActivePlan={!!active} />

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitle className="mb-0">{t("myPlans")}</CardTitle>
          <NewBlankPlanButton />
        </div>
        <ul className="divide-y divide-border">
          {plans.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">
                  {p.name}
                  {p.isActive && (
                    <span className="ml-2 rounded-[4px] bg-iron px-1.5 py-0.5 text-xs font-semibold text-paper">{t("active")}</span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {t("planMeta", { source: ts(p.source as "ai"), days: p.plan.days.length, date: dateTime(p.updatedAt, locale) })}
                </p>
              </div>
              <PlanRowActions id={p.id} isActive={p.isActive} />
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>{t("recentSessions")}</CardTitle>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted">{t("noSessions")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link href={`/sessions/${s.id}`} className="flex justify-between gap-3 py-3 hover:text-plate-blue">
                  <span>
                    <span className="font-medium">{s.dayTitle}</span>
                    <span className="block text-xs text-muted">{dateTime(s.startedAt, locale)}</span>
                  </span>
                  <span className="text-sm text-muted tabular">{duration(s.totalSeconds)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
