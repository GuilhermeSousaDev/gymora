"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bike, Check, ChevronLeft, ChevronRight, Flag, Play, Square, Undo2, X } from "lucide-react";
import { abandonSession, deleteSet, finishSession, logCardio, logSet } from "@/app/actions/sessions";
import { Button, Chip, Input, Label, Textarea, cn } from "@/components/ui";
import { ExerciseFigure } from "@/components/exercise-figure";
import { clock, duration } from "@/lib/format";
import type { Exercise, PlanDay } from "@/lib/types";

type LoggedSet = {
  id: string;
  exerciseIndex: number;
  setNumber: number;
  reps: number;
  weightKg: number;
  rir: number | null;
  workSeconds: number;
  restSeconds: number;
};

type Phase = "idle" | "working" | "logging" | "cardio";

/** Timer state that must survive a page refresh (timestamps, not counters). */
type Persisted = {
  exIdx: number;
  phase: Phase;
  workStartedAt: number | null;
  workSeconds: number; // of the set being logged
  restBefore: number; // rest taken before the set being logged
  lastSetEndedAt: number | null; // rest clock runs from here
  cardioStartedAt: number | null;
  cardioType: string;
};

const storageKey = (id: string) => `gymora:workout:${id}`;
const now = () => Date.now();
const secs = (from: number | null, to = now()) => (from ? Math.max(0, Math.round((to - from) / 1000)) : 0);

function load(id: string): Persisted | null {
  try {
    const raw = localStorage.getItem(storageKey(id));
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

export function WorkoutMode(props: {
  sessionId: string;
  startedAt: string;
  title: string;
  exercises: Exercise[];
  plannedCardio: PlanDay["cardio"];
  initialSets: LoggedSet[];
  initialCardioSeconds: number;
  last: Record<string, { reps: number; weightKg: number }>;
}) {
  const t = useTranslations("session");
  const tp = useTranslations("plan");
  const tm = useTranslations("enums.muscles");
  const { sessionId, exercises } = props;

  const [st, setSt] = useState<Persisted>({
    exIdx: 0,
    phase: "idle",
    workStartedAt: null,
    workSeconds: 0,
    restBefore: 0,
    lastSetEndedAt: null,
    cardioStartedAt: null,
    cardioType: props.plannedCardio?.type ?? "",
  });
  const [sets, setSets] = useState<LoggedSet[]>(props.initialSets);
  const [cardioSeconds, setCardioSeconds] = useState(props.initialCardioSeconds);
  // Starts at a value both server and client agree on (avoids a hydration mismatch), goes live on mount
  const [tick, setTick] = useState(() => new Date(props.startedAt).getTime());
  const [form, setForm] = useState({ reps: "", weight: "", rir: "" });
  const [finishing, setFinishing] = useState(false);
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();

  // restore + persist timer state. Persisting waits until the restore ran, otherwise the
  // default state would overwrite what was saved (e.g. on refresh, or Strict Mode's double effects).
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    const saved = load(sessionId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from localStorage
    if (saved) setSt(saved);
    setRestored(true);
  }, [sessionId]);
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(storageKey(sessionId), JSON.stringify(st));
    } catch {}
  }, [sessionId, st, restored]);

  // 1s clock
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- switch to the live clock after hydration
    setTick(now());
    const i = setInterval(() => setTick(now()), 1000);
    return () => clearInterval(i);
  }, []);

  // keep the screen on while training
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, []);

  const ex = exercises[st.exIdx];
  const exSets = sets.filter((s) => s.exerciseIndex === st.exIdx);
  const nextSetNumber = exSets.length + 1;
  const restNow = st.phase === "idle" || st.phase === "logging" ? secs(st.lastSetEndedAt, tick) : 0;
  const restTarget = exercises[sets.at(-1)?.exerciseIndex ?? st.exIdx]?.restSec ?? 120;

  // vibrate once when the rest target is reached
  const restDone = st.lastSetEndedAt != null && st.phase === "idle" && restNow >= restTarget;
  useEffect(() => {
    // Browsers only allow vibration after the user has tapped the page
    if (restDone && navigator.userActivation?.hasBeenActive) navigator.vibrate?.([200, 100, 200]);
  }, [restDone]);

  const totals = useMemo(() => {
    const work = sets.reduce((a, s) => a + s.workSeconds, 0) + (st.phase === "working" ? secs(st.workStartedAt, tick) : 0);
    const rest = sets.reduce((a, s) => a + s.restSeconds, 0) + restNow;
    const cardio = cardioSeconds + (st.phase === "cardio" ? secs(st.cardioStartedAt, tick) : 0);
    return { total: secs(new Date(props.startedAt).getTime(), tick), work, rest, cardio };
  }, [sets, st, tick, restNow, cardioSeconds, props.startedAt]);

  /* ---------------- actions ---------------- */

  function prefill() {
    const prev = exSets.at(-1) ?? (ex ? props.last[ex.name] : undefined);
    setForm({
      reps: String(prev?.reps ?? ex?.repsMax ?? ""),
      weight: String(prev?.weightKg ?? ""),
      rir: String(ex?.rir ?? ""),
    });
  }

  function startSet() {
    setSt((s) => ({
      ...s,
      phase: "working",
      workStartedAt: now(),
      restBefore: Math.min(secs(s.lastSetEndedAt), 30 * 60),
    }));
  }

  function finishSet() {
    prefill();
    setSt((s) => ({ ...s, phase: "logging", workSeconds: secs(s.workStartedAt), lastSetEndedAt: now(), workStartedAt: null }));
  }

  function saveSet() {
    if (!ex) return;
    const payload = {
      exerciseIndex: st.exIdx,
      exerciseName: ex.name,
      muscleGroup: ex.muscleGroup,
      setNumber: nextSetNumber,
      reps: Math.max(0, Math.round(Number(form.reps) || 0)),
      weightKg: Math.max(0, Number(form.weight) || 0),
      rir: form.rir === "" ? null : Number(form.rir),
      workSeconds: st.workSeconds,
      restSeconds: st.restBefore,
    };
    start(async () => {
      const id = await logSet(sessionId, payload);
      if (!id) return;
      setSets((xs) => [...xs, { id, ...payload }]);
      setSt((s) => ({ ...s, phase: "idle" }));
    });
  }

  function undoLastSet() {
    const lastSet = exSets.at(-1);
    if (!lastSet) return;
    start(async () => {
      await deleteSet(sessionId, lastSet.id);
      setSets((xs) => xs.filter((x) => x.id !== lastSet.id));
    });
  }

  function goTo(i: number) {
    if (i < 0 || i >= exercises.length || st.phase === "working" || st.phase === "logging") return;
    setSt((s) => ({ ...s, exIdx: i }));
  }

  function toggleCardio() {
    if (st.phase === "cardio") {
      const seconds = secs(st.cardioStartedAt);
      const type = st.cardioType;
      setCardioSeconds((c) => c + seconds);
      // cardio isn't rest: restart the rest clock from zero
      setSt((s) => ({ ...s, phase: "idle", cardioStartedAt: null, lastSetEndedAt: null }));
      start(() => logCardio(sessionId, type, seconds));
    } else if (st.phase === "idle") {
      setSt((s) => ({ ...s, phase: "cardio", cardioStartedAt: now() }));
    }
  }

  function finish() {
    start(async () => {
      try {
        localStorage.removeItem(storageKey(sessionId));
      } catch {}
      await finishSession(sessionId, { sessionRpe: rpe, notes });
    });
  }

  function abandon() {
    if (!confirm(t("confirmAbandon"))) return;
    try {
      localStorage.removeItem(storageKey(sessionId));
    } catch {}
    start(() => abandonSession(sessionId));
  }

  /* ---------------- render ---------------- */

  // The whole screen takes the color of the phase, so it can be read from across the gym:
  // red = lifting, blue = resting, green = rest done (go), yellow = cardio, chalk = ready.
  const resting = st.lastSetEndedAt != null && (st.phase === "idle" || st.phase === "logging");
  const tone =
    st.phase === "working"
      ? "red"
      : st.phase === "cardio"
        ? "yellow"
        : resting && st.phase === "idle" && restNow >= restTarget
          ? "green"
          : resting
            ? "blue"
            : "chalk";
  const toneClass = {
    red: "bg-plate-red text-paper",
    blue: "bg-plate-blue text-paper",
    green: "bg-plate-green text-paper",
    yellow: "bg-plate-yellow text-iron",
    chalk: "bg-chalk text-iron",
  }[tone];
  const soft = tone === "chalk" || tone === "yellow" ? "text-iron/65" : "text-paper/75";
  const line = tone === "chalk" || tone === "yellow" ? "border-iron/15" : "border-paper/25";
  // On a colored field, controls are paper with iron text
  // On a colored field the main button flips to paper with iron text
  const mainVariant = tone === "chalk" ? "primary" : "secondary";

  return (
    <div className={cn("flex min-h-dvh flex-1 flex-col transition-colors duration-500", toneClass)}>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))]">
        {/* running totals */}
        <div className={cn("flex items-center justify-between border-b pb-3", line)}>
          <Link href="/training" className={cn("-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm", soft)}>
            <ChevronLeft className="size-4" /> {props.title}
          </Link>
          <p className="font-display text-2xl font-semibold tabular" aria-label={t("total")}>
            {clock(totals.total)}
          </p>
        </div>
        <dl className={cn("grid grid-cols-3 gap-2 border-b py-2 text-center", line)}>
          {(
            [
              [t("exercise"), totals.work],
              [t("rest"), totals.rest],
              [t("cardio"), totals.cardio],
            ] as const
          ).map(([label, v]) => (
            <div key={label}>
              <dt className={cn("text-xs", soft)}>{label}</dt>
              <dd className="font-display text-lg font-semibold tabular">{clock(v)}</dd>
            </div>
          ))}
        </dl>

        {exercises.length === 0 ? (
          <p className={cn("mt-10 text-center", soft)}>{t("noExercises")}</p>
        ) : (
          <>
            {/* exercise */}
            <div className="mt-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={cn("text-sm", soft)}>
                  {tm(ex.muscleGroup)}, {st.exIdx + 1}/{exercises.length}
                </p>
                <h1 className="font-display text-4xl font-bold leading-none">{ex.name}</h1>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => goTo(st.exIdx - 1)}
                  disabled={st.exIdx === 0}
                  aria-label={t("prev")}
                  className={cn("rounded-[var(--r-sm)] border p-2 disabled:opacity-30", line)}
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  onClick={() => goTo(st.exIdx + 1)}
                  disabled={st.exIdx === exercises.length - 1}
                  aria-label={t("next")}
                  className={cn("rounded-[var(--r-sm)] border p-2 disabled:opacity-30", line)}
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </div>
            <p className={cn("mt-2 text-sm", soft)}>
              {tp("setsXReps", { sets: ex.sets, min: ex.repsMin, max: ex.repsMax })}, {tp("rirShort", { rir: ex.rir })},{" "}
              {tp("rest", { time: duration(ex.restSec) })}
            </p>
            {ex.notes && <p className="mt-1 text-sm">{ex.notes}</p>}
            {props.last[ex.name] && (
              <p className={cn("mt-1 text-sm", soft)}>
                {t("lastTime", { reps: props.last[ex.name].reps, weight: props.last[ex.name].weightKg })}
              </p>
            )}

            {/* how the movement looks: always on a paper tile so it reads on any phase color */}
            <div className="mt-3 rounded-[var(--r-md)] bg-paper px-2 py-1">
              <ExerciseFigure name={ex.name} muscle={ex.muscleGroup} pattern={ex.pattern} className="mx-auto max-h-36" />
            </div>

            {/* sets as plates: filled = done */}
            <ol className="mt-4 flex flex-wrap items-center gap-2" aria-label={t("sets")}>
              {Array.from({ length: Math.max(ex.sets, exSets.length) }).map((_, i) => {
                const s = exSets[i];
                return (
                  <li
                    key={i}
                    className={cn(
                      "rounded-[var(--r-sm)] border px-2.5 py-1.5 text-sm tabular",
                      s ? (tone === "chalk" ? "border-iron bg-iron text-paper" : "border-transparent bg-paper text-iron") : line,
                    )}
                  >
                    {s ? `${s.reps} × ${s.weightKg} kg` : `${i + 1}`}
                  </li>
                );
              })}
              {exSets.length > 0 && st.phase === "idle" && (
                <li>
                  <button onClick={undoLastSet} className={cn("flex size-11 items-center justify-center", soft)} aria-label="undo">
                    <Undo2 className="size-4" />
                  </button>
                </li>
              )}
            </ol>

            {/* the big clock */}
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              {st.phase === "working" && (
                <>
                  <p className="font-display text-2xl font-semibold">{t("setOf", { n: nextSetNumber, total: ex.sets })}</p>
                  <p className="font-display text-[7rem] font-bold leading-none tabular">{clock(secs(st.workStartedAt, tick))}</p>
                </>
              )}
              {resting && (
                <>
                  <p className="font-display text-2xl font-semibold">
                    {st.phase === "idle" && restNow >= restTarget ? t("go") : t("resting")}
                  </p>
                  <p className="font-display text-[7rem] font-bold leading-none tabular">{clock(restNow)}</p>
                  <p className={cn("text-sm", soft)}>{t("restTarget", { time: clock(restTarget) })}</p>
                </>
              )}
              {st.phase === "cardio" && (
                <>
                  <p className="font-display text-2xl font-semibold">{st.cardioType || t("cardio")}</p>
                  <p className="font-display text-[7rem] font-bold leading-none tabular">
                    {clock(secs(st.cardioStartedAt, tick))}
                  </p>
                </>
              )}
              {tone === "chalk" && (
                <p className="font-display text-3xl font-semibold text-steel">
                  {t("setOf", { n: Math.min(nextSetNumber, ex.sets), total: ex.sets })}
                </p>
              )}
            </div>

            {/* controls */}
            {st.phase === "idle" &&
              (exSets.length >= ex.sets && st.exIdx < exercises.length - 1 ? (
                <div className="grid gap-2">
                  <Button size="lg" variant={mainVariant} className="border-transparent" onClick={() => goTo(st.exIdx + 1)}>
                    {t("next")} <ChevronRight className="size-5" />
                  </Button>
                  <Button variant="ghost" className={cn("border", line, tone !== "chalk" && "text-inherit hover:bg-paper/10")} onClick={startSet}>
                    <Play className="size-4" /> {t("extraSet", { n: nextSetNumber })}
                  </Button>
                </div>
              ) : (
                <Button size="lg" variant={mainVariant} className="w-full border-transparent" onClick={startSet}>
                  <Play className="size-5 fill-current" />
                  {nextSetNumber > ex.sets ? t("extraSet", { n: nextSetNumber }) : t("startSet")}
                </Button>
              ))}

            {st.phase === "working" && (
              <Button size="lg" variant={mainVariant} className="w-full border-transparent" onClick={finishSet}>
                <Square className="size-5 fill-current" /> {t("finishSet")}
              </Button>
            )}

            {st.phase === "logging" && (
              <div className="space-y-3 rounded-[var(--r-lg)] bg-paper p-4 text-iron">
                <p className="font-display text-xl font-semibold">{t("logTitle")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["reps", t("reps"), "numeric"],
                      ["weight", t("weight"), "decimal"],
                      ["rir", t("rir"), "numeric"],
                    ] as const
                  ).map(([k, label, mode]) => (
                    <label key={k}>
                      <span className="mb-1 block text-xs text-steel">{label}</span>
                      <Input
                        type="number"
                        inputMode={mode}
                        min={0}
                        step={k === "weight" ? 0.5 : 1}
                        value={form[k]}
                        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                        className="h-14 text-center font-display text-2xl font-semibold"
                      />
                    </label>
                  ))}
                </div>
                <Button size="lg" className="w-full" onClick={saveSet} loading={pending}>
                  <Check className="size-5" /> {t("saveSet")}
                </Button>
              </div>
            )}
          </>
        )}

        {/* cardio */}
        <div className={cn("mt-6 border-t pt-4", line)}>
          {props.plannedCardio && props.plannedCardio.minutes > 0 && (
            <p className={cn("mb-2 text-sm", soft)}>
              {t("planned", { minutes: props.plannedCardio.minutes, type: props.plannedCardio.type })}
            </p>
          )}
          {st.phase === "cardio" ? (
            <Button size="lg" className="w-full" onClick={toggleCardio}>
              <Square className="size-4 fill-current" /> {t("stopCardio")}
            </Button>
          ) : (
            <div className="flex items-end gap-2">
              <label className="flex-1">
                <span className={cn("mb-1 block text-xs", soft)}>{t("cardioType")}</span>
                <Input
                  value={st.cardioType}
                  placeholder={t("cardioPlaceholder")}
                  onChange={(e) => setSt((s) => ({ ...s, cardioType: e.target.value }))}
                />
              </label>
              <Button
                variant="secondary"
                onClick={toggleCardio}
                disabled={st.phase !== "idle"}
                className="border-transparent"
              >
                <Bike className="size-4" /> {t("startCardio")}
              </Button>
            </div>
          )}
        </div>

        {/* finish */}
        {!finishing ? (
          <div className="mt-6 flex items-center justify-between">
            <button onClick={abandon} className={cn("-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm", soft)}>
              <X className="size-4" /> {t("abandon")}
            </button>
            <Button
              variant="secondary"
              className="border-transparent"
              onClick={() => setFinishing(true)}
              disabled={st.phase === "working" || st.phase === "logging" || st.phase === "cardio"}
            >
              <Flag className="size-4" /> {t("finish")}
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-4 rounded-[var(--r-lg)] bg-paper p-5 text-iron">
            <h2 className="font-display text-2xl font-semibold">{t("finishTitle")}</h2>
            <div>
              <Label>{t("sessionRpe")}</Label>
              <div className="grid grid-cols-5 gap-2 sm:flex sm:flex-wrap sm:gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <Chip key={n} active={rpe === n} onClick={() => setRpe(n)}>
                    {n}
                  </Chip>
                ))}
              </div>
            </div>
            <label className="block">
              <Label>{t("notes")}</Label>
              <Textarea rows={2} className="min-h-16" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            {/* Phones: full-width, main action on top (closest to the thumb after typing notes) */}
            <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
              <Button size="lg" className="w-full sm:w-auto" onClick={finish} loading={pending}>
                {t("confirmFinish")}
              </Button>
              <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setFinishing(false)}>
                {t("keepGoing")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
