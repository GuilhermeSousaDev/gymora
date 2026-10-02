import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Play } from "lucide-react";
import { requireOnboardedUser } from "@/lib/session";
import { getActivePlan, getDashboard, todayWeekday } from "@/lib/data";
import { startSession } from "@/app/actions/sessions";
import { CardTitle, Stat, cn } from "@/components/ui";
import { Sparkline, WeeklyStackedChart } from "@/components/charts";
import { WeekStrip } from "@/components/week-strip";
import { compact, dateTime, duration } from "@/lib/format";
import { WEEKDAYS, type Weekday } from "@/lib/types";
import { BodyweightForm } from "./bodyweight-form";

export default async function DashboardPage() {
  const { user } = await requireOnboardedUser();
  const locale = await getLocale();
  const t = await getTranslations("dashboard");
  const tm = await getTranslations("enums.muscles");
  const tw = await getTranslations("enums.weekdaysLong");
  const active = await getActivePlan(user.id);
  const d = await getDashboard(user.id, active?.plan ?? null);

  // Today's workout, or the next one in the week
  const today = todayWeekday();
  const days = active?.plan.days ?? [];
  const todayIdx = days.findIndex((x) => x.weekday === today);
  const order = WEEKDAYS.indexOf(today);
  const nextIdx =
    todayIdx >= 0
      ? todayIdx
      : (days
          .map((x, i) => ({ i, dist: (WEEKDAYS.indexOf(x.weekday) - order + 7) % 7 }))
          .sort((a, b) => a.dist - b.dist)[0]?.i ?? -1);
  const nextDay = nextIdx >= 0 ? days[nextIdx] : null;

  const doneDays = new Set<Weekday>(d.doneWeekdays);
  const plannedDays = new Set<Weekday>(days.map((x) => x.weekday));

  return (
    <div className="space-y-10">
      {/* hero: the week, then what to do now */}
      <section className="space-y-6">
        <p className="text-lg text-steel">{t("hello", { name: user.name.split(" ")[0] })}</p>
        <WeekStrip planned={plannedDays} done={doneDays} today={today} />

        {active && nextDay && (
          <div className="flex flex-col gap-5 border-t border-rule pt-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-steel">
                {todayIdx >= 0 ? t("todayIs") : t("nextIs", { day: tw(nextDay.weekday) })}
              </p>
              <h1 className="mt-1 font-display text-5xl font-bold leading-[0.95] sm:text-6xl">{nextDay.title}</h1>
              <p className="mt-3 max-w-prose text-steel">{nextDay.exercises.map((e) => e.name).slice(0, 5).join(", ")}</p>
            </div>
            <form action={startSession.bind(null, active.id, nextIdx)} className="shrink-0">
              <button className="flex h-14 w-full items-center justify-center gap-2 rounded-[var(--r-md)] bg-iron px-7 font-display text-xl font-semibold text-paper hover:bg-iron/85 sm:w-auto">
                <Play className="size-5 fill-current" /> {t("startWorkout")}
              </button>
            </form>
          </div>
        )}
      </section>

      {/* scoreboard row */}
      <section aria-label={t("thisWeek")}>
        <CardTitle>{t("thisWeek")}</CardTitle>
        <div className="grid grid-cols-2 border-y border-rule sm:grid-cols-5 sm:divide-x sm:divide-rule">
          {[
            <Stat key="s" label={t("sessions")} value={`${d.week.sessions}/${d.week.planned}`} />,
            <Stat key="t" label={t("trainingTime")} value={duration(d.week.minutes * 60)} />,
            <Stat key="c" label={t("cardioTime")} value={`${d.week.cardioMinutes} min`} />,
            <Stat key="v" label={t("volume")} value={`${compact(d.week.volume, locale)} kg`} hint={t("volumeHint")} />,
            <Stat key="k" label={t("streak")} value={t("streakWeeks", { count: d.streak })} hint={t("streakHint")} />,
          ].map((node, i) => (
            <div key={i} className={cn("py-4 sm:px-5 sm:first:pl-0", i < 4 && "border-b border-rule sm:border-b-0", i === 4 && "col-span-2 sm:col-span-1")}>
              {node}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <CardTitle>{t("weeklyChart")}</CardTitle>
          <WeeklyStackedChart
            data={d.chart}
            locale={locale}
            labels={{ work: t("work"), rest: t("restLabel"), cardio: t("cardio"), other: t("otherTime") }}
          />
        </section>

        <section>
          <CardTitle>{t("setsPerMuscle")}</CardTitle>
          {d.muscles.length === 0 ? (
            <p className="text-steel">{t("noData")}</p>
          ) : (
            <ul className="space-y-3">
              {d.muscles.map((m) => {
                const pct = m.target ? Math.min(100, (m.done / m.target) * 100) : 100;
                const reached = m.target > 0 && m.done >= m.target;
                return (
                  <li key={m.muscle}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium">{tm(m.muscle)}</span>
                      <span className="text-steel tabular">{t("setsTarget", { done: m.done, target: m.target })}</span>
                    </div>
                    <div className="h-2 rounded-full bg-iron/10">
                      <div
                        className={cn("h-2 rounded-full", reached ? "bg-plate-green" : "bg-iron")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-10 border-t border-rule pt-8 lg:grid-cols-3">
        <section>
          <CardTitle>{t("averages")}</CardTitle>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Stat label={t("avgSession")} value={duration(d.averages.sessionMinutes * 60)} />
            <Stat label={t("avgWork")} value={duration(d.averages.workMinutes * 60)} />
            <Stat label={t("avgRest")} value={duration(d.averages.restBetweenSets)} />
            <Stat
              label={t("workRest")}
              value={d.averages.workRestRatio ? `1:${(1 / d.averages.workRestRatio).toFixed(1)}` : "–"}
            />
            <Stat label={t("avgRpe")} value={d.averages.rpe ?? "–"} />
          </dl>
        </section>

        <section>
          <CardTitle>{t("prs")}</CardTitle>
          {d.prs.length === 0 ? (
            <p className="text-steel">{t("noData")}</p>
          ) : (
            <ol className="divide-y divide-rule">
              {d.prs.map((p) => (
                <li key={p.name} className="flex items-baseline justify-between gap-2 py-2">
                  <span className="truncate">{p.name}</span>
                  <span className="font-display text-xl font-semibold tabular">{p.e1rm} kg</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <CardTitle>{t("bodyweight")}</CardTitle>
          {d.bodyweight ? (
            <>
              <Stat
                label=""
                value={`${d.bodyweight.latest} kg`}
                hint={t("change30", {
                  sign: d.bodyweight.change30 > 0 ? "+" : "",
                  value: d.bodyweight.change30.toFixed(1),
                })}
              />
              <Sparkline points={d.bodyweight.series} locale={locale} />
            </>
          ) : (
            <p className="text-steel">{t("noData")}</p>
          )}
          <BodyweightForm label={t("logWeight")} />
        </section>
      </div>

      <section className="border-t border-rule pt-8">
        <CardTitle>{t("recent")}</CardTitle>
        {d.recent.length === 0 ? (
          <p className="text-steel">{t("noData")}</p>
        ) : (
          <ul className="divide-y divide-rule">
            {d.recent.map((s) => (
              <li key={s.id}>
                <Link href={`/sessions/${s.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-plate-blue">
                  <div>
                    <p className="font-medium">{s.dayTitle}</p>
                    <p className="text-sm text-steel">{dateTime(s.startedAt, locale)}</p>
                  </div>
                  <span className="font-display text-lg tabular">{duration(s.totalSeconds)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
