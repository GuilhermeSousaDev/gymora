import { useTranslations } from "next-intl";
import { Bike, Info } from "lucide-react";
import { cn } from "./ui";
import { ExerciseFigure } from "./exercise-figure";
import { duration } from "@/lib/format";
import { weeklySetsByMuscle, type EvidenceLabel, type PlanReview, type TrainingPlan } from "@/lib/types";

const labelStyles: Record<EvidenceLabel, string> = {
  "EVIDENCE-SUPPORTED": "bg-plate-green/10 text-plate-green border-plate-green/40",
  "PRACTITIONER-BASED": "bg-plate-blue/10 text-plate-blue border-plate-blue/40",
  "PLAUSIBLE BUT UNCERTAIN": "bg-plate-yellow/15 text-[#7a5c00] border-plate-gold/50",
  "INSUFFICIENT EVIDENCE": "bg-iron/5 text-steel border-rule",
};

export function EvidenceBadge({ label }: { label: EvidenceLabel }) {
  const t = useTranslations("enums.labels");
  return (
    <span className={cn("inline-block shrink-0 rounded-[4px] border px-1.5 py-0.5 text-xs font-medium", labelStyles[label])}>
      {t(label)}
    </span>
  );
}

export function PlanView({ plan, compact }: { plan: TrainingPlan; compact?: boolean }) {
  const t = useTranslations("plan");
  const tm = useTranslations("enums.muscles");
  const tw = useTranslations("enums.weekdaysLong");
  const sets = Object.entries(weeklySetsByMuscle(plan)).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-3xl font-bold leading-none">{plan.name}</h3>
        <p className="text-sm text-muted mt-1">
          {plan.split ? `${plan.split}, ${t("mesocycle", { weeks: plan.mesocycleWeeks }).toLowerCase()}` : t("mesocycle", { weeks: plan.mesocycleWeeks })}
        </p>
        {plan.summary && <p className="mt-3 text-sm leading-relaxed">{plan.summary}</p>}
        {plan.fallback && (
          <p className="mt-3 border-l-2 border-plate-gold bg-plate-yellow/10 px-3 py-2 text-sm">{t("fallbackNote")}</p>
        )}
      </div>

      <div className="space-y-3">
        {plan.days.map((day, i) => (
          <details key={i} open={!compact} className="group rounded-[var(--r-md)] border border-rule bg-paper">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="text-sm text-steel">{tw(day.weekday)}</p>
                <p className="font-display text-xl font-semibold leading-tight">{day.title}</p>
              </div>
              <span className="text-sm text-steel">{t("exercises", { count: day.exercises.length })}</span>
            </summary>
            <ul className="divide-y divide-border border-t border-border">
              {day.exercises.map((e, j) => (
                <li key={j} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="w-24 shrink-0 rounded-[var(--r-sm)] border border-rule bg-paper p-0.5 sm:w-28">
                    <ExerciseFigure name={e.name} muscle={e.muscleGroup} pattern={e.pattern} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{e.name}</p>
                    <p className="text-xs text-muted">
                      {tm(e.muscleGroup)}
                      {e.notes && `. ${e.notes}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right tabular">
                    <p className="font-display text-lg font-semibold">{t("setsXReps", { sets: e.sets, min: e.repsMin, max: e.repsMax })}</p>
                    <p className="text-xs text-muted">
                      {t("rirShort", { rir: e.rir })}, {t("rest", { time: duration(e.restSec) })}
                    </p>
                  </div>
                </li>
              ))}
              {day.cardio && day.cardio.minutes > 0 && (
                <li className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted">
                  <Bike className="size-4 text-plate-gold" />
                  {t("cardio")}: {day.cardio.minutes} min {day.cardio.type}
                  {day.cardio.intensity && ` (${day.cardio.intensity})`}
                </li>
              )}
            </ul>
          </details>
        ))}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Info className="size-3.5" /> {t("rirHelp")}
      </p>

      {sets.length > 0 && (
        <Section title={t("weeklySets")}>
          <div className="flex flex-wrap gap-2">
            {sets.map(([m, n]) => (
              <span key={m} className="rounded-[var(--r-sm)] border border-rule bg-paper px-2.5 py-1 text-sm">
                {tm(m)} <span className="font-semibold tabular">{n}</span>
              </span>
            ))}
          </div>
        </Section>
      )}

      {!compact && (
        <>
          {plan.principles.length > 0 && (
            <Section title={t("principles")}>
              <ul className="space-y-2">
                {plan.principles.map((p, i) => (
                  <li key={i} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:gap-3">
                    <EvidenceBadge label={p.label} />
                    <span>{p.text}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {plan.progression && (
            <Section title={t("progression")}>
              <p className="text-sm leading-relaxed">{plan.progression}</p>
            </Section>
          )}
          {plan.deload && (
            <Section title={t("deload")}>
              <p className="text-sm leading-relaxed">{plan.deload}</p>
            </Section>
          )}
          {plan.recoveryTips.length > 0 && (
            <Section title={t("recovery")}>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {plan.recoveryTips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

export function ReviewView({ review }: { review: PlanReview }) {
  const t = useTranslations("plan");
  return (
    <div className="space-y-4">
      {review.overall && <p className="text-sm leading-relaxed">{review.overall}</p>}
      {review.strengths.length > 0 && (
        <Section title={t("strengths")}>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {review.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Section>
      )}
      {review.improvements.length > 0 && (
        <Section title={t("improvements")}>
          <ul className="space-y-2">
            {review.improvements.map((s, i) => (
              <li key={i} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:gap-3">
                <EvidenceBadge label={s.label} />
                <span>{s.text}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {review.changes.length > 0 && (
        <Section title={t("changes")}>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {review.changes.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 font-display text-lg font-semibold">{title}</h4>
      {children}
    </div>
  );
}
