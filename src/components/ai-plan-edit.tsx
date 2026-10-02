"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Wand2 } from "lucide-react";
import { editPlanWithAi } from "@/app/actions/plans";
import { Button, ErrorText, Spinner, Textarea } from "./ui";
import { diffPlans } from "@/lib/plan-diff";
import type { VolumeIssue } from "@/lib/ai/tasks";
import type { TrainingPlan, UserProfile } from "@/lib/types";

type Suggestion = { summary: string; changes: string[]; plan: TrainingPlan; warnings: VolumeIssue[] };

/**
 * "Change with AI": the user describes a change in their own words, sees what would change,
 * then applies or discards it. Nothing is saved here — `onApply` hands the new plan back.
 */
export function AiPlanEdit({
  plan,
  onApply,
  profile,
  appliedNote,
}: {
  plan: TrainingPlan;
  onApply: (plan: TrainingPlan) => void;
  /** Only needed before onboarding is saved */
  profile?: UserProfile;
  /** Shown after applying, e.g. "remember to save" */
  appliedNote?: string;
}) {
  const t = useTranslations("aiEdit");
  const tc = useTranslations("common");
  const tm = useTranslations("enums.muscles");
  const tw = useTranslations("enums.weekdaysLong");
  const [request, setRequest] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [applied, setApplied] = useState(false);

  async function suggest() {
    if (!request.trim()) return;
    setBusy(true);
    setError("");
    setApplied(false);
    const res = await editPlanWithAi({ plan, request, profile });
    setBusy(false);
    if (!res.ok) return setError(res.error === "ai" ? tc("aiFailed") : tc("error"));
    setSuggestion(res.data);
  }

  const diff = suggestion ? diffPlans(plan, suggestion.plan) : [];

  return (
    <section className="rounded-[var(--r-lg)] border border-rule bg-paper p-4 sm:p-5" aria-label={t("title")}>
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
        <Wand2 className="size-4 text-plate-blue" /> {t("title")}
      </h3>

      {!suggestion && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-steel">{t("hint")}</p>
          <Textarea
            rows={2}
            className="min-h-16"
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder={t("placeholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) suggest();
            }}
          />
          <ErrorText>{error}</ErrorText>
          {busy ? (
            <Spinner label={t("thinking")} />
          ) : (
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={suggest} disabled={!request.trim()}>
                {t("suggest")}
              </Button>
              {applied && appliedNote && <span className="text-sm text-plate-green">{appliedNote}</span>}
            </div>
          )}
        </div>
      )}

      {suggestion && (
        <div className="mt-3 space-y-4">
          {suggestion.summary && <p className="text-sm leading-relaxed">{suggestion.summary}</p>}

          {diff.length === 0 ? (
            <p className="text-sm text-steel">{t("noExerciseChanges")}</p>
          ) : (
            <ul className="space-y-3">
              {diff.map((d, i) => (
                <li key={i} className="text-sm">
                  <p className="font-medium">
                    {tw(d.weekday as "mon")}, {d.title}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {d.removed.map((n) => (
                      <li key={`r${n}`} className="text-steel line-through decoration-plate-red/70">
                        {n}
                      </li>
                    ))}
                    {d.added.map((n) => (
                      <li key={`a${n}`} className="font-medium text-plate-green">
                        + {n}
                      </li>
                    ))}
                    {d.changed.map((c) => (
                      <li key={`c${c.name}`}>
                        {c.name}: <span className="text-steel line-through">{c.from}</span> {c.to}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}

          {suggestion.changes.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-steel">
              {suggestion.changes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}

          {suggestion.warnings.length > 0 && (
            <div className="rounded-[var(--r-md)] border border-plate-yellow/60 bg-plate-yellow/10 p-3 text-sm">
              <p className="font-medium">{t("warningsTitle")}</p>
              <ul className="mt-1 space-y-0.5">
                {suggestion.warnings.map((w, i) => (
                  <li key={i}>
                    {t(`warning.${w.kind}`, { muscle: w.muscle ? tm(w.muscle as "chest") : "", sets: w.sets, limit: w.limit, day: w.day ?? "" })}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                onApply(suggestion.plan);
                setSuggestion(null);
                setRequest("");
                setApplied(true);
              }}
            >
              {t("apply")}
            </Button>
            <Button variant="ghost" onClick={() => setSuggestion(null)}>
              {t("discard")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
