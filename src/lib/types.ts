import { z } from "zod";
import { PATTERN_IDS } from "./exercise-art/ids";

/* ------------------------------------------------------------------ */
/* Enums / vocabularies (values are stable keys, labels live in i18n)   */
/* ------------------------------------------------------------------ */

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const SEXES = ["male", "female", "other"] as const;
export const EXPERIENCE = ["beginner", "intermediate", "advanced"] as const;
export const GOALS = [
  "hypertrophy",
  "fat_loss",
  "recomposition",
  "strength",
  "general_fitness",
  "endurance",
] as const;
export const EQUIPMENT = ["full_gym", "home_dumbbells", "home_basic", "bodyweight"] as const;
export const CARDIO_PREFS = ["none", "light", "moderate", "high"] as const;

export const MUSCLES = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
] as const;
export type Muscle = (typeof MUSCLES)[number];
export const FOCUS_AREAS = [...MUSCLES, "full_body", "lower_body", "upper_body"] as const;

export const EVIDENCE_LABELS = [
  "EVIDENCE-SUPPORTED",
  "PRACTITIONER-BASED",
  "PLAUSIBLE BUT UNCERTAIN",
  "INSUFFICIENT EVIDENCE",
] as const;
export type EvidenceLabel = (typeof EVIDENCE_LABELS)[number];

/* ------------------------------------------------------------------ */
/* Tolerant helpers: AI output is messy, never crash on it              */
/* ------------------------------------------------------------------ */

const num = (fallback: number | null = null) =>
  z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
    z.number().finite().nullable(),
  ).catch(fallback);

const numReq = (fallback: number) =>
  z.preprocess((v) => Number(v), z.number().finite()).catch(fallback);

const str = (fallback = "") =>
  z.preprocess((v) => (v === null || v === undefined ? fallback : String(v)), z.string()).catch(fallback);

function oneOf<T extends readonly string[]>(values: T) {
  return z
    .preprocess(
      (v) => (typeof v === "string" ? v.toLowerCase().trim().replace(/[\s-]+/g, "_") : v),
      z.enum(values as unknown as [T[number], ...T[number][]]),
    )
    .nullable()
    .catch(null);
}

function listOf<T extends readonly string[]>(values: T) {
  return z
    .preprocess(
      (v) =>
        (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [])
          .map((x) => String(x).toLowerCase().trim().replace(/[\s-]+/g, "_"))
          .filter((x) => (values as readonly string[]).includes(x)),
      z.array(z.enum(values as unknown as [T[number], ...T[number][]])),
    )
    .catch([]);
}

/* ------------------------------------------------------------------ */
/* Profile                                                              */
/* ------------------------------------------------------------------ */

export const userProfileSchema = z.object({
  sex: oneOf(SEXES),
  age: num(),
  heightCm: num(),
  weightKg: num(),
  goals: listOf(GOALS),
  focusAreas: listOf(FOCUS_AREAS),
  experience: oneOf(EXPERIENCE),
  trainingYears: num(),
  availableDays: listOf(WEEKDAYS),
  sessionMinutes: num(),
  equipment: oneOf(EQUIPMENT),
  cardio: oneOf(CARDIO_PREFS),
  limitations: str(),
  preferences: str(),
  sleepHours: num(),
  /** Short AI summary of what the user told us in their own words */
  summary: str(),
  /** Extra Q&A the AI found useful (question -> answer) */
  extra: z.record(z.string(), z.string()).catch({}),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export const emptyProfile = (): UserProfile => userProfileSchema.parse({});

/** Fields we must have before generating a plan. */
export const REQUIRED_PROFILE_FIELDS = [
  "sex",
  "age",
  "experience",
  "goals",
  "availableDays",
  "sessionMinutes",
  "equipment",
] as const;
export type RequiredField = (typeof REQUIRED_PROFILE_FIELDS)[number];

export function missingRequiredFields(p: UserProfile): RequiredField[] {
  return REQUIRED_PROFILE_FIELDS.filter((f) => {
    const v = p[f];
    return v === null || v === undefined || (Array.isArray(v) && v.length === 0);
  });
}

/* ------------------------------------------------------------------ */
/* Onboarding questions produced by the AI                              */
/* ------------------------------------------------------------------ */

export const PROFILE_QUESTION_FIELDS = [
  "sex",
  "age",
  "heightCm",
  "weightKg",
  "goals",
  "focusAreas",
  "experience",
  "trainingYears",
  "availableDays",
  "sessionMinutes",
  "equipment",
  "cardio",
  "limitations",
  "preferences",
  "sleepHours",
  "other",
] as const;
export type QuestionField = (typeof PROFILE_QUESTION_FIELDS)[number];

export const onboardingQuestionSchema = z.object({
  id: str(),
  field: z.enum(PROFILE_QUESTION_FIELDS).catch("other"),
  question: str(),
  /** Only used for "other" questions; known fields use fixed options. */
  options: z.array(str()).catch([]),
});
export type OnboardingQuestion = z.infer<typeof onboardingQuestionSchema>;

/* ------------------------------------------------------------------ */
/* Training plan                                                        */
/* ------------------------------------------------------------------ */

const muscleGroup = z
  .preprocess((v) => String(v ?? "").toLowerCase().trim(), z.string())
  .transform((v) => normalizeMuscle(v))
  .catch("other");

export function normalizeMuscle(v: string): string {
  const aliases: Record<string, Muscle> = {
    pecs: "chest", pectorals: "chest", peito: "chest",
    lats: "back", upper_back: "back", "upper back": "back", costas: "back", traps: "back",
    delts: "shoulders", deltoids: "shoulders", side_delts: "shoulders", ombros: "shoulders",
    rear_delts: "shoulders", "rear delts": "shoulders", "side delts": "shoulders",
    biceps: "biceps", "bíceps": "biceps", triceps: "triceps", "tríceps": "triceps",
    core: "abs", abdominals: "abs", abdomen: "abs",
    glute: "glutes", "glúteos": "glutes", gluteos: "glutes",
    quadriceps: "quads", "quadríceps": "quads", legs: "quads",
    posterior: "hamstrings", "posteriores": "hamstrings", panturrilha: "calves",
  };
  if ((MUSCLES as readonly string[]).includes(v)) return v;
  return aliases[v] ?? aliases[v.replace(/\s+/g, "_")] ?? "other";
}

export const exerciseSchema = z.object({
  name: str("Exercise"),
  muscleGroup,
  sets: numReq(3),
  repsMin: numReq(8),
  repsMax: numReq(12),
  rir: numReq(2),
  restSec: numReq(120),
  notes: str(),
  /** Which illustration to show; null = guess from the name */
  pattern: z.enum(PATTERN_IDS).nullable().catch(null),
});
export type Exercise = z.infer<typeof exerciseSchema>;

export const cardioSchema = z
  .object({
    type: str(),
    minutes: numReq(0),
    intensity: str(),
    notes: str(),
  })
  .nullable()
  .catch(null);

export const planDaySchema = z.object({
  weekday: z
    .preprocess((v) => String(v ?? "").toLowerCase().slice(0, 3), z.enum(WEEKDAYS))
    .catch("mon"),
  title: str("Workout"),
  focus: z.array(str()).catch([]),
  exercises: z.array(exerciseSchema).catch([]),
  cardio: cardioSchema,
});
export type PlanDay = z.infer<typeof planDaySchema>;

export const principleSchema = z.object({
  text: str(),
  label: z
    .preprocess((v) => String(v ?? "").toUpperCase().replace(/[\[\]]/g, "").trim(), z.enum(EVIDENCE_LABELS))
    .catch("PLAUSIBLE BUT UNCERTAIN"),
});

export const trainingPlanSchema = z.object({
  name: str("Training plan"),
  summary: str(),
  split: str(),
  mesocycleWeeks: numReq(5),
  days: z.array(planDaySchema).catch([]),
  progression: str(),
  deload: str(),
  principles: z.array(principleSchema).catch([]),
  recoveryTips: z.array(str()).catch([]),
  /** Which AI model wrote this plan ("" for imported/manual plans) */
  generatedBy: str(),
  /** True when a backup model wrote it because the main one was busy (usually a weaker plan) */
  fallback: z.boolean().catch(false),
});
export type TrainingPlan = z.infer<typeof trainingPlanSchema>;

/** Weekly hard sets per muscle for a plan (direct sets only). */
export function weeklySetsByMuscle(plan: TrainingPlan): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of plan.days)
    for (const e of d.exercises) out[e.muscleGroup] = (out[e.muscleGroup] ?? 0) + e.sets;
  return out;
}

/* ------------------------------------------------------------------ */
/* AI feedback payloads                                                 */
/* ------------------------------------------------------------------ */

export const feedbackItemSchema = z.object({
  text: str(),
  label: principleSchema.shape.label,
});

export const planReviewSchema = z.object({
  overall: str(),
  strengths: z.array(str()).catch([]),
  improvements: z.array(feedbackItemSchema).catch([]),
  changes: z.array(str()).catch([]),
});
export type PlanReview = z.infer<typeof planReviewSchema>;

export const photoFeedbackSchema = z.object({
  isValidPhoto: z.boolean().catch(true),
  overall: str(),
  strengths: z.array(str()).catch([]),
  improvements: z.array(str()).catch([]),
  priorityMuscles: listOf(MUSCLES),
  trainingSuggestions: z.array(str()).catch([]),
  disclaimer: str(),
});
export type PhotoFeedback = z.infer<typeof photoFeedbackSchema>;
