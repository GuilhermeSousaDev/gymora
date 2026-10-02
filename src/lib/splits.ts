/**
 * Weekly structure chosen in code (not by the AI), following the framework's frequency rules:
 * every major muscle at least twice a week whenever there are 2+ training days.
 * The AI only fills in exercises for each day.
 */
import { WEEKDAYS, type Muscle, type UserProfile, type Weekday } from "./types";

export type DayType = "full" | "upper" | "lower" | "push" | "pull" | "legs" | "glutes_hams";
export type DaySkeleton = { weekday: Weekday; type: DayType; variant: string; muscles: Muscle[] };

const MUSCLES_BY_TYPE: Record<DayType, Muscle[]> = {
  full: ["quads", "hamstrings", "glutes", "chest", "back", "shoulders", "biceps", "triceps"],
  upper: ["chest", "back", "shoulders", "biceps", "triceps"],
  lower: ["quads", "hamstrings", "glutes", "calves", "abs"],
  push: ["chest", "shoulders", "triceps"],
  pull: ["back", "biceps", "shoulders"],
  legs: ["quads", "hamstrings", "glutes", "calves", "abs"],
  glutes_hams: ["glutes", "hamstrings", "abs"],
};

const LOWER_FOCUS = new Set(["glutes", "quads", "hamstrings", "calves", "lower_body"]);
const UPPER_FOCUS = new Set(["chest", "back", "shoulders", "biceps", "triceps", "upper_body"]);

function emphasis(p: UserProfile): "lower" | "upper" | "balanced" {
  const lower = p.focusAreas.filter((f) => LOWER_FOCUS.has(f)).length;
  const upper = p.focusAreas.filter((f) => UPPER_FOCUS.has(f)).length;
  if (lower > upper) return "lower";
  if (upper > lower) return "upper";
  return "balanced";
}

function template(days: number, e: "lower" | "upper" | "balanced"): [DayType, string][] {
  switch (Math.min(days, 6)) {
    case 1:
      return [["full", ""]];
    case 2:
      return [["full", "A"], ["full", "B"]];
    case 3:
      if (e === "lower") return [["lower", "A"], ["upper", ""], ["lower", "B"]];
      if (e === "upper") return [["upper", "A"], ["lower", ""], ["upper", "B"]];
      return [["full", "A"], ["full", "B"], ["full", "C"]];
    case 4:
      return [["upper", "A"], ["lower", "A"], ["upper", "B"], ["lower", "B"]];
    case 5:
      if (e === "lower") return [["lower", "A"], ["upper", "A"], ["glutes_hams", ""], ["upper", "B"], ["lower", "B"]];
      return [["upper", ""], ["lower", ""], ["push", ""], ["pull", ""], ["legs", ""]];
    default:
      return [["push", "A"], ["pull", "A"], ["legs", "A"], ["push", "B"], ["pull", "B"], ["legs", "B"]];
  }
}

/** Training days in week order; with 7 available days one becomes a rest day. */
export function weeklySkeleton(p: UserProfile): DaySkeleton[] {
  const days = [...p.availableDays].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
  if (!days.length) return [];
  const t = template(days.length, emphasis(p));
  return t.map(([type, variant], i) => ({ weekday: days[i], type, variant, muscles: MUSCLES_BY_TYPE[type] }));
}

export function skeletonText(s: DaySkeleton[]): string {
  const name: Record<DayType, string> = {
    full: "Full body",
    upper: "Upper",
    lower: "Lower",
    push: "Push",
    pull: "Pull",
    legs: "Legs",
    glutes_hams: "Glutes & hamstrings",
  };
  return s
    .map((d, i) => `${i + 1}. ${d.weekday}: ${name[d.type]}${d.variant ? ` ${d.variant}` : ""} — trains ${d.muscles.join(", ")}`)
    .join("\n");
}
