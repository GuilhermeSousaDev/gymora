import type { Exercise, TrainingPlan } from "./types";

export type DayDiff = {
  title: string;
  weekday: string;
  removed: string[];
  added: string[];
  changed: { name: string; from: string; to: string }[];
};

const key = (name: string) => name.trim().toLowerCase();
const shape = (e: Exercise) => `${e.sets} × ${e.repsMin}–${e.repsMax}`;

/** Exercise-level differences per day (days matched by position). */
export function diffPlans(before: TrainingPlan, after: TrainingPlan): DayDiff[] {
  const out: DayDiff[] = [];
  const n = Math.max(before.days.length, after.days.length);
  for (let i = 0; i < n; i++) {
    const a = before.days[i];
    const b = after.days[i];
    const oldEx = new Map((a?.exercises ?? []).map((e) => [key(e.name), e]));
    const newEx = new Map((b?.exercises ?? []).map((e) => [key(e.name), e]));
    const d: DayDiff = {
      title: (b ?? a)!.title,
      weekday: (b ?? a)!.weekday,
      removed: [...oldEx.entries()].filter(([k]) => !newEx.has(k)).map(([, e]) => e.name),
      added: [...newEx.entries()].filter(([k]) => !oldEx.has(k)).map(([, e]) => e.name),
      changed: [...newEx.entries()]
        .filter(([k, e]) => oldEx.has(k) && shape(oldEx.get(k)!) !== shape(e))
        .map(([k, e]) => ({ name: e.name, from: shape(oldEx.get(k)!), to: shape(e) })),
    };
    if (d.removed.length || d.added.length || d.changed.length || !a || !b) out.push(d);
  }
  return out;
}
