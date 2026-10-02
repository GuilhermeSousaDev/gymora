import "server-only";
import { z } from "zod";
import { aiJson, aiJsonWithModel, isPrimaryModel } from "./client";
import { skeletonText, weeklySkeleton } from "@/lib/splits";
import { TRAINING_FRAMEWORK } from "./framework";
import { PATTERN_IDS } from "@/lib/exercise-art/ids";
import {
  CARDIO_PREFS,
  EQUIPMENT,
  EXPERIENCE,
  FOCUS_AREAS,
  GOALS,
  MUSCLES,
  SEXES,
  WEEKDAYS,
  exerciseSchema,
  onboardingQuestionSchema,
  photoFeedbackSchema,
  planReviewSchema,
  trainingPlanSchema,
  userProfileSchema,
  weeklySetsByMuscle,
  type PhotoFeedback,
  type TrainingPlan,
  type UserProfile,
} from "@/lib/types";

const languageName = (locale: string) => (locale === "pt" ? "Brazilian Portuguese" : "English");

const PROFILE_SHAPE = `{
  "sex": ${SEXES.map((s) => `"${s}"`).join(" | ")} | null,
  "age": number | null,
  "heightCm": number | null,
  "weightKg": number | null,
  "goals": (${GOALS.map((s) => `"${s}"`).join(" | ")})[],
  "focusAreas": (${FOCUS_AREAS.map((s) => `"${s}"`).join(" | ")})[],
  "experience": ${EXPERIENCE.map((s) => `"${s}"`).join(" | ")} | null,
  "trainingYears": number | null,
  "availableDays": (${WEEKDAYS.map((s) => `"${s}"`).join(" | ")})[],
  "sessionMinutes": number | null,
  "equipment": ${EQUIPMENT.map((s) => `"${s}"`).join(" | ")} | null,
  "cardio": ${CARDIO_PREFS.map((s) => `"${s}"`).join(" | ")} | null,
  "limitations": string,   // injuries, pain, medical limits ("" if none mentioned)
  "preferences": string,   // liked/disliked exercises, style
  "sleepHours": number | null,
  "summary": string,       // 1-2 sentence summary of the person and what they want
  "extra": { [question: string]: string }
}`;

const PLAN_SHAPE = `{
  "name": string,
  "summary": string,              // 2-3 sentences: why this plan fits THIS person
  "split": string,                // e.g. "Upper / Lower"
  "mesocycleWeeks": number,       // usually 4-6
  "days": [{
    "weekday": ${WEEKDAYS.map((s) => `"${s}"`).join(" | ")},
    "title": string,              // e.g. "Upper A — Chest focus"
    "focus": string[],
    "exercises": [{
      "name": string,
      "muscleGroup": ${MUSCLES.map((s) => `"${s}"`).join(" | ")},   // PRIMARY muscle only
      "sets": number, "repsMin": number, "repsMax": number,
      "rir": number,              // target reps in reserve
      "restSec": number,
      "notes": string,            // short cue / why ("" if none)
      "pattern": ${PATTERN_IDS.map((s) => `"${s}"`).join(" | ")} | null   // closest movement, used for the illustration ("Tríceps francês"/French press = overhead_triceps)
    }],
    "cardio": { "type": string, "minutes": number, "intensity": string, "notes": string } | null
  }],
  "progression": string,          // how to progress week to week, plain language
  "deload": string,               // when/how to deload
  "principles": [{ "text": string, "label": "EVIDENCE-SUPPORTED" | "PRACTITIONER-BASED" | "PLAUSIBLE BUT UNCERTAIN" | "INSUFFICIENT EVIDENCE" }],
  "recoveryTips": string[]
}`;

const coachSystem = (locale: string) => `You are Gymora's coach: an evidence-based natural (drug-free) training coach.
Write ALL user-facing text in ${languageName(locale)}. Keep JSON keys and enum values exactly as specified (English).
Be concise, friendly and specific. Match technical depth to the person: plain language for beginners / general-fitness users.
Never recommend drugs (steroids, SARMs, etc). If an injury or medical issue is mentioned, be conservative and suggest a professional.
Reply with a single JSON object only.

${TRAINING_FRAMEWORK}`;

/* ------------------------------------------------------------------ */
/* Onboarding                                                           */
/* ------------------------------------------------------------------ */

const onboardingResultSchema = z.object({
  profile: userProfileSchema,
  questions: z.array(onboardingQuestionSchema).catch([]),
});

export async function understandUser(input: {
  locale: string;
  mode: "generate" | "import";
  text: string;
  profile: UserProfile;
  round: number;
}) {
  const importNote =
    input.mode === "import"
      ? "The user already HAS a training plan they will keep or improve. Only ask what's needed to evaluate that plan for their goals (focus, goals, experience, limitations, schedule). Do not ask things the plan itself already answers."
      : "We will GENERATE a full training plan for this person.";

  return aiJson(onboardingResultSchema, [
    { role: "system", content: coachSystem(input.locale) },
    {
      role: "user",
      content: `Onboarding round ${input.round}. ${importNote}

Profile collected so far (JSON):
${JSON.stringify(input.profile)}

What the user wrote:
"""${input.text || "(nothing new)"}"""

Tasks:
1. Merge everything you can reasonably infer into the profile. Infer, don't interrogate
   (e.g. "I want a big chest and to lose my belly" -> focusAreas ["chest"], goals ["hypertrophy","fat_loss"]).
   Keep existing values unless the user contradicts them. Use null / [] / "" for unknown.
2. List the questions still needed for a GOOD, personalized plan. Always ask for missing: sex, age, experience,
   availableDays, sessionMinutes, equipment, goals. Ask about limitations/injuries if never mentioned.
   You may add up to 2 extra useful questions with field "other" (with 2-5 short answer options).
   Max 7 questions. On round 2+ ask only what's truly important; return [] if the profile is good enough.

Return JSON:
{
  "profile": ${PROFILE_SHAPE},
  "questions": [{ "id": string, "field": "sex"|"age"|"heightCm"|"weightKg"|"goals"|"focusAreas"|"experience"|"trainingYears"|"availableDays"|"sessionMinutes"|"equipment"|"cardio"|"limitations"|"preferences"|"sleepHours"|"other", "question": string, "options": string[] }]
}`,
    },
  ], { temperature: 0.2, effort: "low", maxTokens: 3000 });
}

/* ------------------------------------------------------------------ */
/* Plan generation                                                      */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Volume guardrail: check the AI's plan against the framework ranges   */
/* ------------------------------------------------------------------ */

const MAJOR = ["chest", "back", "shoulders", "quads", "hamstrings", "glutes"];
const FOCUS_MIN = { beginner: 8, intermediate: 12, advanced: 14 } as const;
const MAX_WEEKLY = 22;
const MAX_PER_SESSION = 10;

function focusMuscles(p: UserProfile): string[] {
  const out = new Set<string>();
  for (const f of p.focusAreas) {
    if (f === "upper_body") ["chest", "back", "shoulders", "biceps", "triceps"].forEach((m) => out.add(m));
    else if (f === "lower_body") ["quads", "hamstrings", "glutes"].forEach((m) => out.add(m));
    else if (f !== "full_body") out.add(f);
  }
  return [...out];
}

/** Structured so the UI can translate it; `issueText` formats it for prompts. */
export type VolumeIssue = {
  kind: "focusLow" | "maintenanceLow" | "weeklyLow" | "weeklyHigh" | "sessionHigh" | "frequencyLow" | "fillerDay";
  muscle: string;
  /** sets — or, for frequencyLow, the number of days the muscle is trained */
  sets: number;
  limit: number;
  day?: string;
};

export function issueText(i: VolumeIssue): string {
  switch (i.kind) {
    case "focusLow":
      return `${i.muscle} is a FOCUS muscle but has only ${i.sets} direct weekly sets (needs >= ${i.limit}).`;
    case "maintenanceLow":
      return `${i.muscle} has ${i.sets} weekly sets (maintenance minimum is ${i.limit}).`;
    case "weeklyLow":
      return `${i.muscle} has ${i.sets} weekly sets (needs >= ${i.limit} for this experience level).`;
    case "weeklyHigh":
      return `${i.muscle} has ${i.sets} weekly sets (max ${i.limit}; beyond that is likely junk volume for naturals).`;
    case "sessionHigh":
      return `${i.day}: ${i.muscle} has ${i.sets} sets in one session (max ${i.limit}; split across days).`;
    case "frequencyLow":
      return `${i.muscle} is trained on only ${i.sets} day(s) a week (needs >= ${i.limit}; spread its sets over more days).`;
    case "fillerDay":
      return `${i.day} has only ${i.sets} hard sets for real muscle work (needs >= ${i.limit}; give this day a proper training purpose).`;
  }
}

/** Lowest useful weekly sets for a major muscle when there's no specialization. */
const WEEKLY_MIN = { beginner: 6, intermediate: 10, advanced: 12 } as const;
const LOWER_GROUP = ["quads", "hamstrings", "glutes"];

/** Violations of the framework's volume ranges (empty = plan is within range). */
export function volumeIssues(plan: TrainingPlan, profile: UserProfile): VolumeIssue[] {
  const issues: VolumeIssue[] = [];
  const weekly = weeklySetsByMuscle(plan);
  const focus = focusMuscles(profile);
  const focusMin = FOCUS_MIN[profile.experience ?? "intermediate"];
  // Only strict when the person is training for muscle; general fitness may go lighter
  const hypertrophyGoal = profile.goals.some((g) => ["hypertrophy", "recomposition"].includes(g));

  for (const m of focus)
    if ((weekly[m] ?? 0) < focusMin) issues.push({ kind: "focusLow", muscle: m, sets: weekly[m] ?? 0, limit: focusMin });
  if (hypertrophyGoal)
    for (const m of MAJOR)
      if (!focus.includes(m) && (weekly[m] ?? 0) < 4)
        issues.push({ kind: "maintenanceLow", muscle: m, sets: weekly[m] ?? 0, limit: 4 });
  for (const [m, n] of Object.entries(weekly))
    if (n > MAX_WEEKLY) issues.push({ kind: "weeklyHigh", muscle: m, sets: n, limit: MAX_WEEKLY });
  plan.days.forEach((d) => {
    const perDay: Record<string, number> = {};
    for (const e of d.exercises) perDay[e.muscleGroup] = (perDay[e.muscleGroup] ?? 0) + e.sets;
    for (const [m, n] of Object.entries(perDay))
      if (n > MAX_PER_SESSION) issues.push({ kind: "sessionHigh", muscle: m, sets: n, limit: MAX_PER_SESSION, day: d.title });
  });

  // No specialization: every major muscle needs a real dose for this experience level
  if (hypertrophyGoal && !focus.length) {
    const min = WEEKLY_MIN[profile.experience ?? "intermediate"];
    for (const m of ["chest", "back", "quads", "hamstrings"])
      if ((weekly[m] ?? 0) < min) issues.push({ kind: "weeklyLow", muscle: m, sets: weekly[m] ?? 0, limit: min });
  }

  // Frequency: with 2+ days, each major area (and every focus muscle) at least twice a week
  if (plan.days.length >= 2) {
    const daysWith = (ms: string[]) => plan.days.filter((d) => d.exercises.some((e) => ms.includes(e.muscleGroup))).length;
    const groups: [string, string[]][] = [["chest", ["chest"]], ["back", ["back"]], ["lower_body", LOWER_GROUP]];
    for (const m of focus) if (!groups.some(([g]) => g === m)) groups.push([m, [m]]);
    for (const [name, ms] of groups) {
      const n = daysWith(ms);
      if (n < 2) issues.push({ kind: "frequencyLow", muscle: name, sets: n, limit: 2 });
    }
  }

  // Filler days ("core & light cardio") waste a training day when the goal is muscle
  if (hypertrophyGoal)
    for (const d of plan.days) {
      const real = d.exercises.filter((e) => !["abs", "other"].includes(e.muscleGroup)).reduce((a, e) => a + e.sets, 0);
      if (real < 6) issues.push({ kind: "fillerDay", muscle: "", sets: real, limit: 6, day: d.title });
    }
  return issues;
}

async function repairPlan(locale: string, profile: UserProfile, plan: TrainingPlan, issueList: VolumeIssue[]) {
  const issues = issueList.map(issueText);
  return aiJsonWithModel(trainingPlanSchema, [
    { role: "system", content: coachSystem(locale) },
    {
      role: "user",
      content: `This plan breaks the framework's volume rules. Fix ONLY what's needed (add/remove sets or exercises),
keep sessions within ${profile.sessionMinutes ?? 60} minutes (trim lower-priority work if needed), keep everything else.

Problems:
- ${issues.join("\n- ")}

Profile: ${JSON.stringify(profile)}
Plan: ${JSON.stringify(plan)}

Return the full corrected plan JSON: ${PLAN_SHAPE}`,
    },
  ]);
}

/**
 * Deterministic fix for "too few sets" on muscles that already have exercises:
 * add sets round-robin (max 5 per exercise, max MAX_PER_SESSION per muscle per day). No AI call.
 */
export function topUpVolume(plan: TrainingPlan, profile: UserProfile): TrainingPlan {
  const out = structuredClone(plan);
  const focus = focusMuscles(profile);
  const hypertrophyGoal = profile.goals.some((g) => ["hypertrophy", "recomposition"].includes(g));
  const targets: Record<string, number> = {};
  for (const m of focus) targets[m] = FOCUS_MIN[profile.experience ?? "intermediate"];
  if (hypertrophyGoal && !focus.length)
    for (const m of ["chest", "back", "quads", "hamstrings"]) targets[m] = WEEKLY_MIN[profile.experience ?? "intermediate"];
  if (hypertrophyGoal) for (const m of MAJOR) targets[m] ??= 4;

  for (const [muscle, target] of Object.entries(targets)) {
    const slots = out.days.flatMap((d) => d.exercises.filter((e) => e.muscleGroup === muscle).map((e) => ({ d, e })));
    let missing = target - slots.reduce((a, s) => a + s.e.sets, 0);
    let progressed = true;
    while (missing > 0 && progressed) {
      progressed = false;
      for (const { d, e } of slots) {
        const today = d.exercises.filter((x) => x.muscleGroup === muscle).reduce((a, x) => a + x.sets, 0);
        if (missing > 0 && e.sets < 5 && today < MAX_PER_SESSION) {
          e.sets++;
          missing--;
          progressed = true;
        }
      }
    }
  }
  return out;
}

/** Guardrail: deterministic top-up first, AI repair only for what's left (frequency, filler days, missing exercises). */
async function enforceVolume(locale: string, profile: UserProfile, plan: TrainingPlan, models: string[] = []) {
  if (!volumeIssues(plan, profile).length) return plan;
  const topped = topUpVolume(plan, profile);
  const issues = volumeIssues(topped, profile);
  if (!issues.length) return topped;
  try {
    const { data: fixed, model } = await repairPlan(locale, profile, topped, issues);
    if (volumeIssues(fixed, profile).length >= issues.length) return topped;
    models.push(model);
    // The repair may still need set top-ups of its own
    return topUpVolume(fixed, profile);
  } catch {
    return topped;
  }
}

export async function generatePlan(input: { locale: string; profile: UserProfile; instructions?: string }) {
  const { data, model } = await generatePlanRaw(input);
  const models = [model];
  const plan = await enforceVolume(input.locale, input.profile, data, models);
  // Remember who wrote it: a fallback model usually means a weaker plan worth regenerating
  return { ...plan, generatedBy: models.join(" + "), fallback: models.some((m) => !isPrimaryModel(m)) };
}

async function generatePlanRaw(input: { locale: string; profile: UserProfile; instructions?: string }) {
  const skeleton = weeklySkeleton(input.profile);
  return aiJsonWithModel(trainingPlanSchema, [
    { role: "system", content: coachSystem(input.locale) },
    {
      role: "user",
      content: `Create a weekly training plan for this person using the framework.

Profile:
${JSON.stringify(input.profile)}
${input.instructions ? `\nExtra request from the user: """${input.instructions}"""\n` : ""}
Weekly structure (already chosen from the framework's frequency rules; follow it EXACTLY — same days, same order, same purpose):
${skeletonText(skeleton)}

Rules:
- One day object per line above. Give each day a short title in the user's language that says its purpose (e.g. "Superior A — peito e costas").
- Every day is a real training day: no "core only" or "light cardio" days. Cardio goes in the "cardio" field of a training day.
- Pick exercises from the EXERCISE MENU when the equipment allows; avoid more than 2 exercises of the same movement pattern per day.
- Fit each session into sessionMinutes (count ~2-3 min per set incl. rest for compounds, less for isolation).
- Respect equipment and limitations. Emphasize focusAreas (specialization rules) without neglecting the rest.
- Choose weekly volume by experience. Put priority muscles first in the session.
- COUNT direct weekly sets per muscle before answering (muscleGroup = primary muscle only):
  focus muscles >= ${FOCUS_MIN.beginner} (beginner) / ${FOCUS_MIN.intermediate} (intermediate) / ${FOCUS_MIN.advanced} (advanced);
  every other major muscle (chest, back, shoulders, quads, hamstrings, glutes) >= 4; no muscle > ${MAX_WEEKLY}; <= ${MAX_PER_SESSION} sets per muscle per session.
  With no focusAreas: chest, back, quads and hamstrings each >= ${WEEKLY_MIN.beginner} (beginner) / ${WEEKLY_MIN.intermediate} (intermediate) / ${WEEKLY_MIN.advanced} (advanced).
- Add cardio blocks when goals include fat_loss/endurance or cardio preference is not "none".
- 3-6 principles with honest evidence labels that explain the key choices for THIS person.

Return JSON: ${PLAN_SHAPE}`,
    },
  ]);
}

/* ------------------------------------------------------------------ */
/* Plan review (imported plans + revisions)                             */
/* ------------------------------------------------------------------ */

const reviewResultSchema = z.object({
  original: trainingPlanSchema,
  review: planReviewSchema,
  improved: trainingPlanSchema,
});

export async function reviewPlan(input: {
  locale: string;
  profile: UserProfile;
  planText?: string;
  planImage?: string;
}) {
  const r = await reviewPlanRaw(input);
  return { ...r, improved: await enforceVolume(input.locale, input.profile, r.improved) };
}

async function reviewPlanRaw(input: {
  locale: string;
  profile: UserProfile;
  planText?: string;
  planImage?: string;
}) {
  const task = `Review the user's CURRENT training plan against their profile and the framework.

Profile:
${JSON.stringify(input.profile)}

Tasks:
1. "original": convert their plan faithfully into the plan JSON format (don't improve it here; infer weekdays in order if missing; if RIR/rest unknown use 2 / 120).
2. "review": honest feedback. strengths (what's good), improvements (each with an evidence label), changes (short list of concrete edits made in "improved").
3. "improved": the same plan with the minimum changes needed to fit their goals better. Keep what already works and their exercise preferences.

Return JSON:
{
  "original": ${PLAN_SHAPE},
  "review": { "overall": string, "strengths": string[], "improvements": [{ "text": string, "label": "EVIDENCE-SUPPORTED"|"PRACTITIONER-BASED"|"PLAUSIBLE BUT UNCERTAIN"|"INSUFFICIENT EVIDENCE" }], "changes": string[] },
  "improved": (same shape as original)
}`;

  // Photo/screenshot of a plan: the vision model only transcribes (short output, fits its
  // small token limits); the stronger text model does the actual review.
  let planText = input.planText ?? "";
  if (input.planImage) {
    const transcribed = await transcribePlanImage(input.planImage);
    planText = `${transcribed.text}${planText ? `\n\nExtra notes from the user:\n${planText}` : ""}`;
  }

  return aiJson(reviewResultSchema, [
    { role: "system", content: coachSystem(input.locale) },
    { role: "user", content: `${task}\n\nThe user's plan:\n"""${planText}"""` },
  ]);
}

/* ------------------------------------------------------------------ */
/* Faithful extraction of a plan the user already has                  */
/* ------------------------------------------------------------------ */

const extractedSchema = z.object({
  name: z.string().catch(""),
  days: z
    .array(
      z.object({
        weekday: z
          .preprocess((v) => (typeof v === "string" ? v.toLowerCase().slice(0, 3) : v), z.enum(WEEKDAYS))
          .nullable()
          .catch(null),
        title: z.string().catch(""),
        exercises: z.array(exerciseSchema).catch([]),
      }),
    )
    .catch([]),
});
export type ExtractedPlan = z.infer<typeof extractedSchema>;

/** Turns pasted/uploaded text into plan JSON WITHOUT changing anything the user wrote. */
export async function extractPlan(input: { text: string }) {
  return aiJson(
    extractedSchema,
    [
      {
        role: "system",
        content:
          "You convert a gym training plan written by a person into JSON. You are a careful transcriber, not a coach: never add, remove, merge, rename, translate or improve exercises. Reply with a single JSON object only.",
      },
      {
        role: "user",
        content: `Plan:
"""${input.text}"""

Rules:
- One day object per training day in the text, in the same order. "weekday" only if the text states it (e.g. "Quinta" = "thu", "Monday" = "mon"), otherwise null.
- "title": the day's name as written, without the weekday (e.g. "Quinta — Pernas" -> "Pernas").
- Exercise "name" exactly as written (same language and spelling). Keep every exercise, even unusual ones.
- Sets and reps exactly as written: "3×6–10" -> sets 3, repsMin 6, repsMax 10; a single number -> repsMin = repsMax.
- "rir" and "restSec" only from the text; if not stated use rir 2 / restSec 150 for heavy compound lifts and rir 1 / restSec 90 for isolation.
- "muscleGroup": the primary muscle (${MUSCLES.join(", ")}, or "other"). "pattern": closest of ${PATTERN_IDS.join(", ")}, or null. "notes": only what the text says about that exercise, else "".
- "name" (top level): the plan's title if the text has one, else "".

Return JSON: { "name": string, "days": [{ "weekday": "mon"|"tue"|"wed"|"thu"|"fri"|"sat"|"sun"|null, "title": string, "exercises": [{ "name": string, "muscleGroup": string, "sets": number, "repsMin": number, "repsMax": number, "rir": number, "restSec": number, "notes": string, "pattern": string|null }] }] }`,
      },
    ],
    { temperature: 0, effort: "low", maxTokens: 5000 },
  );
}

export async function transcribePlanImage(image: string) {
  return aiJson(
    z.object({ text: z.string().catch("") }),
    [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: 'Transcribe the training plan in this image as compact plain text (days, exercises, sets x reps, rest, notes). No commentary. Reply as JSON {"text": string}.',
          },
          { type: "image_url", image_url: { url: image } },
        ],
      },
    ],
    { vision: true, temperature: 0, maxTokens: 900 },
  );
}

/* ------------------------------------------------------------------ */
/* Physique photo feedback (the photo is never stored)                  */
/* ------------------------------------------------------------------ */

export async function analyzePhoto(input: { locale: string; profile: UserProfile; image: string }) {
  return aiJson(
    photoFeedbackSchema,
    [
      {
        role: "system",
        content: `You are Gymora's physique coach for natural (drug-free) lifters. Write all user-facing text in ${languageName(input.locale)}.
Give respectful, constructive, non-judgmental feedback about MUSCULAR DEVELOPMENT and proportions only.
Never comment on attractiveness, never shame body fat, never identify the person, never sexualize.
If the image is not a photo of a person's physique (or shows a minor), set isValidPhoto false and explain briefly in "overall".
Visual estimates are uncertain (lighting, pump, pose) — say so in "disclaimer". Reply with a single JSON object only.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Profile: ${JSON.stringify({ sex: input.profile.sex, goals: input.profile.goals, focusAreas: input.profile.focusAreas, experience: input.profile.experience })}

Analyze the photo and return JSON:
{
  "isValidPhoto": boolean,
  "overall": string,
  "strengths": string[],
  "improvements": string[],        // what to improve visually
  "priorityMuscles": (${MUSCLES.map((s) => `"${s}"`).join(" | ")})[],   // max 3
  "trainingSuggestions": string[], // concrete training changes (volume, exercises, specialization)
  "disclaimer": string
}`,
          },
          { type: "image_url", image_url: { url: input.image } },
        ],
      },
    ],
    // Groq free tier: Qwen allows ~1000 output tokens/min
    { vision: true, temperature: 0.3, maxTokens: 900 },
  );
}

/* ------------------------------------------------------------------ */
/* Free-text edits ("swap the dips, I don't like them")                 */
/* ------------------------------------------------------------------ */

const editResultSchema = z.object({
  summary: z.string().catch(""),
  changes: z.array(z.string()).catch([]),
  plan: trainingPlanSchema,
});

/**
 * Applies the user's own words to a plan. The user's request wins: we don't auto-correct it with the
 * guardrail, we return `warnings` so the UI can flag anything that now falls outside the framework.
 */
export async function editPlan(input: { locale: string; profile: UserProfile; plan: TrainingPlan; request: string }) {
  const res = await aiJson(editResultSchema, [
    { role: "system", content: coachSystem(input.locale) },
    {
      role: "user",
      content: `The user wants to change their plan. Apply their request.

User request: """${input.request}"""

Rules:
- Change ONLY what the request asks for (plus the minimum needed to keep it coherent). Keep all other days, exercises, sets and notes identical.
- When replacing an exercise the user dislikes, pick an alternative for the SAME muscle with a similar or better stimulus
  (stable, progressable, loads the muscle at long lengths), respecting equipment (${input.profile.equipment ?? "unknown"}) and limitations ("${input.profile.limitations}").
- Keep weekly sets per muscle roughly the same unless the user asks otherwise.
- If the request conflicts with the evidence (e.g. far too little volume), still do it, and say so briefly in "summary".
- "changes": short list of what changed, in plain language.

Profile: ${JSON.stringify(input.profile)}
Current plan: ${JSON.stringify(input.plan)}

Return JSON: { "summary": string, "changes": string[], "plan": ${PLAN_SHAPE} }`,
    },
  ]);
  // Only flag what this edit caused or made worse, not problems the plan already had
  const before = volumeIssues(input.plan, input.profile);
  const warnings = volumeIssues(res.plan, input.profile).filter((w) => {
    const prev = before.find((b) => b.kind === w.kind && b.muscle === w.muscle && b.day === w.day);
    if (!prev) return true;
    return w.kind === "weeklyHigh" || w.kind === "sessionHigh" ? w.sets > prev.sets : w.sets < prev.sets;
  });
  return { ...res, warnings };
}

const revisionResultSchema = z.object({
  review: planReviewSchema,
  improved: trainingPlanSchema,
});

/** Apply photo feedback (or any feedback) to an existing plan. */
export async function revisePlan(input: {
  locale: string;
  profile: UserProfile;
  plan: TrainingPlan;
  feedback: PhotoFeedback;
}) {
  const r = await revisePlanRaw(input);
  return { ...r, improved: await enforceVolume(input.locale, input.profile, r.improved) };
}

async function revisePlanRaw(input: {
  locale: string;
  profile: UserProfile;
  plan: TrainingPlan;
  feedback: PhotoFeedback;
}) {
  return aiJson(revisionResultSchema, [
    { role: "system", content: coachSystem(input.locale) },
    {
      role: "user",
      content: `Adjust the user's current plan based on this physique feedback, using the specialization rules
(raise priority muscles, keep others at maintenance if needed to control fatigue; keep sessions within their time).

Profile: ${JSON.stringify(input.profile)}
Feedback: ${JSON.stringify(input.feedback)}
Current plan: ${JSON.stringify(input.plan)}

Return JSON:
{
  "review": { "overall": string, "strengths": string[], "improvements": [{ "text": string, "label": "EVIDENCE-SUPPORTED"|"PRACTITIONER-BASED"|"PLAUSIBLE BUT UNCERTAIN"|"INSUFFICIENT EVIDENCE" }], "changes": string[] },
  "improved": ${PLAN_SHAPE}
}`,
    },
  ]);
}
