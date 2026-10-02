import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Bike, ChevronLeft } from "lucide-react";
import { requireOnboardedUser } from "@/lib/session";
import { e1rm, getSessionDetail } from "@/lib/data";
import { Card, CardTitle, Stat } from "@/components/ui";
import { compact, dateTime, duration } from "@/lib/format";

export default async function SessionDetailPage({ params }: PageProps<"/sessions/[id]">) {
  const { id } = await params;
  const { user } = await requireOnboardedUser();
  const detail = await getSessionDetail(user.id, id);
  if (!detail) notFound();
  const { session, sets, cardio } = detail;

  const locale = await getLocale();
  const t = await getTranslations("sessionDetail");
  const td = await getTranslations("dashboard");
  const tm = await getTranslations("enums.muscles");

  // group sets by exercise, in the order they were done
  const groups = new Map<string, typeof sets>();
  for (const s of sets) groups.set(s.exerciseName, [...(groups.get(s.exerciseName) ?? []), s]);
  const volume = sets.reduce((a, s) => a + s.reps * s.weightKg, 0);
  const other = Math.max(0, session.totalSeconds - session.workSeconds - session.restSeconds - session.cardioSeconds);

  return (
    <div className="space-y-6">
      <Link href="/training" className="-ml-1 inline-flex min-h-11 items-center gap-1 pr-2 text-sm text-muted hover:text-text">
        <ChevronLeft className="size-4" /> {t("title")}
      </Link>
      <div>
        <h1 className="font-display text-5xl font-bold leading-none">{session.dayTitle}</h1>
        <p className="text-sm text-muted">
          {dateTime(session.startedAt, locale)}
          {session.sessionRpe && `. ${t("rpe", { rpe: session.sessionRpe })}`}
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Stat label={td("trainingTime")} value={duration(session.totalSeconds)} />
          <Stat label={td("work")} value={duration(session.workSeconds)} />
          <Stat label={td("restLabel")} value={duration(session.restSeconds)} />
          <Stat label={td("cardio")} value={duration(session.cardioSeconds)} />
          <Stat label={td("otherTime")} value={duration(other)} />
          <Stat label={td("hardSets")} value={sets.length} />
          <Stat label={td("volume")} value={`${compact(volume, locale)} kg`} />
          <Stat
            label={td("avgRest")}
            value={duration(
              sets.filter((s) => s.restSeconds > 0).reduce((a, s, _, xs) => a + s.restSeconds / xs.length, 0),
            )}
          />
        </div>
        {session.notes && <p className="mt-4 border-t border-border pt-4 text-sm">{session.notes}</p>}
      </Card>

      <Card>
        <CardTitle>{t("perExercise")}</CardTitle>
        {groups.size === 0 && <p className="text-sm text-muted">{t("noSets")}</p>}
        <div className="space-y-5">
          {[...groups.entries()].map(([name, xs]) => {
            const best = xs.reduce((b, s) => (e1rm(s.weightKg, s.reps) > e1rm(b.weightKg, b.reps) ? s : b), xs[0]);
            return (
              <div key={name}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-display text-xl font-semibold">{name}</p>
                  <p className="text-xs text-muted">
                    {tm(xs[0].muscleGroup)}, {duration(xs.reduce((a, s) => a + s.workSeconds, 0))}. {t("best")}: {best.reps} × {best.weightKg} kg
                  </p>
                </div>
                <table className="mt-2 w-full text-sm tabular">
                  <tbody>
                    {xs.map((s) => (
                      <tr key={s.id} className="border-t border-border">
                        <td className="py-1.5 text-muted">#{s.setNumber}</td>
                        <td>
                          {s.reps} × {s.weightKg} kg
                        </td>
                        <td className="text-muted">{s.rir != null ? `RIR ${s.rir}` : ""}</td>
                        <td className="text-right text-muted">
                          {duration(s.workSeconds)} / {duration(s.restSeconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          {cardio.map((c) => (
            <p key={c.id} className="flex items-center gap-2 text-sm">
              <Bike className="size-4 text-plate-gold" /> {c.type}, {duration(c.seconds)}
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}
