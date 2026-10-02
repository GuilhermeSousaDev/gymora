"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ChevronDown, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { setActivePlan, updatePlan } from "@/app/actions/plans";
import { Button, Card, ErrorText, Input, Label, PageTitle, Select, Textarea } from "@/components/ui";
import { AiPlanEdit } from "@/components/ai-plan-edit";
import { ExerciseFigure } from "@/components/exercise-figure";
import { MUSCLES, WEEKDAYS, type Exercise, type PlanDay, type TrainingPlan } from "@/lib/types";

const newExercise = (name: string): Exercise => ({
  name,
  muscleGroup: "chest",
  sets: 3,
  repsMin: 8,
  repsMax: 12,
  rir: 2,
  restSec: 120,
  notes: "",
  pattern: null,
});

export function PlanEditor({ id, initial, isActive }: { id: string; initial: TrainingPlan; isActive: boolean }) {
  const t = useTranslations("editor");
  const tt = useTranslations("training");
  const tc = useTranslations("common");
  const tm = useTranslations("enums.muscles");
  const tw = useTranslations("enums.weekdaysLong");
  const router = useRouter();
  const [plan, setPlan] = useState<TrainingPlan>(initial);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const ta = useTranslations("aiEdit");
  const [pending, start] = useTransition();

  const update = (fn: (p: TrainingPlan) => TrainingPlan) => {
    setSaved(false);
    setDirty(true);
    setPlan((p) => fn(structuredClone(p)));
  };
  const updateDay = (i: number, fn: (d: PlanDay) => void) =>
    update((p) => {
      fn(p.days[i]);
      return p;
    });

  function save() {
    start(async () => {
      const res = await updatePlan(id, plan);
      if (!res.ok) return setError(tc("error"));
      setError("");
      setSaved(true);
      setDirty(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Link href="/training" className="-ml-1 inline-flex min-h-11 items-center gap-1 pr-2 text-sm text-muted hover:text-text">
        <ChevronLeft className="size-4" /> {tt("title")}
      </Link>

      <Card className="space-y-4">
        <PageTitle className="text-3xl sm:text-4xl">{t("title")}</PageTitle>
        <label className="block">
          <Label>{t("name")}</Label>
          <Input value={plan.name} onChange={(e) => update((p) => ({ ...p, name: e.target.value }))} />
        </label>
        <label className="block">
          <Label>{t("summary")}</Label>
          <Textarea
            rows={2}
            className="min-h-16"
            value={plan.summary}
            onChange={(e) => update((p) => ({ ...p, summary: e.target.value }))}
          />
        </label>
      </Card>

      <AiPlanEdit plan={plan} onApply={(p) => update(() => p)} appliedNote={ta("appliedEditor")} />

      {plan.days.map((day, di) => (
        <Card key={di} className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="w-40">
              <Label>{t("weekday")}</Label>
              <Select
                value={day.weekday}
                onChange={(e) => updateDay(di, (d) => void (d.weekday = e.target.value as PlanDay["weekday"]))}
              >
                {WEEKDAYS.map((w) => (
                  <option key={w} value={w}>
                    {tw(w)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="min-w-48 flex-1">
              <Label>{t("dayTitle")}</Label>
              <Input value={day.title} onChange={(e) => updateDay(di, (d) => void (d.title = e.target.value))} />
            </label>
            <Button
              variant="ghost"
              onClick={() => update((p) => ({ ...p, days: p.days.filter((_, i) => i !== di) }))}
            >
              <Trash2 className="size-4" /> {t("removeDay")}
            </Button>
          </div>

          <div className="space-y-3">
            {day.exercises.map((ex, ei) => {
              const setEx = (patch: Partial<Exercise>) =>
                updateDay(di, (d) => void (d.exercises[ei] = { ...d.exercises[ei], ...patch }));
              const move = (dir: -1 | 1) =>
                updateDay(di, (d) => {
                  const j = ei + dir;
                  if (j < 0 || j >= d.exercises.length) return;
                  [d.exercises[ei], d.exercises[j]] = [d.exercises[j], d.exercises[ei]];
                });
              return (
                // One line per exercise; tap to edit. Keeps long plans scannable on a phone.
                <details
                  key={ei}
                  open={ex.name === t("newExercise")}
                  className="group rounded-[var(--r-md)] border border-rule bg-paper open:bg-paper-2"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
                    <span className="w-20 shrink-0 rounded-[var(--r-sm)] border border-rule bg-paper p-0.5">
                      <ExerciseFigure name={ex.name} muscle={ex.muscleGroup} pattern={ex.pattern} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{ex.name}</span>
                      <span className="text-sm text-steel">{tm(ex.muscleGroup)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-display text-lg font-semibold tabular">
                        {ex.sets} × {ex.repsMin}–{ex.repsMax}
                      </span>
                      <ChevronDown className="size-4 text-steel transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="border-t border-rule p-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-12">
                    <label className="col-span-2 sm:col-span-4">
                      <Label>{t("exercise")}</Label>
                      <Input value={ex.name} onChange={(e) => setEx({ name: e.target.value, pattern: null })} />
                    </label>
                    <label className="col-span-2 sm:col-span-2">
                      <Label>{t("muscle")}</Label>
                      <Select value={ex.muscleGroup} onChange={(e) => setEx({ muscleGroup: e.target.value })}>
                        {[...MUSCLES, "other"].map((m) => (
                          <option key={m} value={m}>
                            {tm(m)}
                          </option>
                        ))}
                      </Select>
                    </label>
                    {(
                      [
                        ["sets", t("sets")],
                        ["repsMin", t("repsMin")],
                        ["repsMax", t("repsMax")],
                        ["rir", t("rir")],
                        ["restSec", t("rest")],
                      ] as const
                    ).map(([k, label]) => (
                      <label key={k} className="col-span-1 sm:col-span-1 last:sm:col-span-2">
                        <Label>{label}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={ex[k]}
                          onChange={(e) => setEx({ [k]: Number(e.target.value) })}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      placeholder={t("notes")}
                      value={ex.notes}
                      onChange={(e) => setEx({ notes: e.target.value })}
                    />
                    <Button size="sm" variant="ghost" onClick={() => move(-1)} aria-label="up">
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => move(1)} aria-label="down">
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={tc("delete")}
                      onClick={() => updateDay(di, (d) => void d.exercises.splice(ei, 1))}
                    >
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </div>
                  </div>
                </details>
              );
            })}
          </div>

          {day.cardio ? (
            <div className="grid grid-cols-2 gap-2 rounded-[var(--r-md)] border border-border p-3 sm:grid-cols-4">
              <label>
                <Label>{t("cardioType")}</Label>
                <Input
                  value={day.cardio.type}
                  onChange={(e) => updateDay(di, (d) => void (d.cardio!.type = e.target.value))}
                />
              </label>
              <label>
                <Label>{t("cardioMinutes")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={day.cardio.minutes}
                  onChange={(e) => updateDay(di, (d) => void (d.cardio!.minutes = Number(e.target.value)))}
                />
              </label>
              <label>
                <Label>{t("cardioIntensity")}</Label>
                <Input
                  value={day.cardio.intensity}
                  onChange={(e) => updateDay(di, (d) => void (d.cardio!.intensity = e.target.value))}
                />
              </label>
              <div className="flex items-end">
                <Button variant="ghost" onClick={() => updateDay(di, (d) => void (d.cardio = null))}>
                  {t("removeCardio")}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => updateDay(di, (d) => void d.exercises.push(newExercise(t("newExercise"))))}
            >
              <Plus className="size-4" /> {t("addExercise")}
            </Button>
            {!day.cardio && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateDay(di, (d) => void (d.cardio = { type: "", minutes: 20, intensity: "", notes: "" }))
                }
              >
                <Plus className="size-4" /> {t("addCardio")}
              </Button>
            )}
          </div>
        </Card>
      ))}

      <Button
        variant="secondary"
        onClick={() =>
          update((p) => ({
            ...p,
            days: [...p.days, { weekday: "mon", title: t("newDay"), focus: [], exercises: [], cardio: null }],
          }))
        }
      >
        <Plus className="size-4" /> {t("addDay")}
      </Button>

      <div className="sticky bottom-20 z-10 flex flex-wrap items-center justify-end gap-3 rounded-[var(--r-lg)] border border-border bg-surface/95 p-3 backdrop-blur sm:bottom-4">
        <ErrorText>{error}</ErrorText>
        {saved && <span className="text-sm text-plate-green">{tc("saved")}</span>}
        {dirty && !saved && <span className="text-sm text-steel">{t("unsaved")}</span>}
        {!isActive && (
          <Button variant="secondary" onClick={() => start(() => setActivePlan(id))}>
            {tt("setActive")}
          </Button>
        )}
        <Button onClick={save} loading={pending}>
          {t("savePlan")}
        </Button>
      </div>
    </div>
  );
}
