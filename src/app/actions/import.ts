"use server";
import { getTranslations } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/session";
import { extractPlan, transcribePlanImage } from "@/lib/ai/tasks";
import { AIError } from "@/lib/ai/client";
import { assignWeekdays, parsePlanText, type ParsedDay } from "@/lib/plan-parser";
import { trainingPlanSchema, type TrainingPlan } from "@/lib/types";
import { isValidImageDataUrl, type ActionResult } from "./helpers";

type ImportInput = {
  text?: string;
  /** Photo or screenshot of a plan (already compressed client-side) */
  image?: string;
  /** PDF or Word file, base64 without the data: prefix */
  file?: { name: string; data: string };
};

export type ImportResult = {
  plan: TrainingPlan;
  /** Lines we could not turn into exercises (shown to the user, never silently dropped) */
  unread: string[];
  /** "parser" = read directly from the text; "ai" = the AI transcribed it */
  method: "parser" | "ai";
};

const MAX_TEXT = 20_000;

async function fileToText(file: NonNullable<ImportInput["file"]>): Promise<string> {
  const buf = Buffer.from(file.data, "base64");
  if (buf.byteLength > 5 * 1024 * 1024) throw new Error("file too large");
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const { extractText } = await import("unpdf");
    const { text } = await extractText(new Uint8Array(buf), { mergePages: true });
    return text;
  }
  if (name.endsWith(".docx")) {
    const { extractRawText } = await import("mammoth");
    const { value } = await extractRawText({ buffer: buf });
    return value;
  }
  throw new Error("unsupported file");
}

const countExercises = (days: { exercises: unknown[] }[]) => days.reduce((a, d) => a + d.exercises.length, 0);

/** Reads a plan the user already has, exactly as written, and returns it for preview (nothing is saved). */
export async function importPlan(input: ImportInput): Promise<ActionResult<ImportResult>> {
  const { profile } = await requireOnboardedUser();
  const t = await getTranslations("import");

  // 1. Gather text from whatever was sent
  let text = (input.text ?? "").slice(0, MAX_TEXT);
  try {
    if (input.file) text = `${text}\n${await fileToText(input.file)}`.slice(0, MAX_TEXT);
    if (input.image) {
      if (!isValidImageDataUrl(input.image)) return { ok: false, error: "invalid" };
      const { text: seen } = await transcribePlanImage(input.image);
      text = `${text}\n${seen}`.slice(0, MAX_TEXT);
    }
  } catch (err) {
    console.error("[import] could not read input", err);
    return { ok: false, error: err instanceof AIError ? "ai" : "invalid" };
  }
  if (!text.trim()) return { ok: false, error: "invalid" };

  // 2. Deterministic parser first: instant, free and exactly what the user wrote
  const parsed = parsePlanText(text);
  const confident =
    parsed.days.length > 0 &&
    parsed.unread.length === 0 &&
    parsed.days.every((d) => d.exercises.every((e) => e.muscleGroup !== "other"));

  let days: ParsedDay[] = parsed.days;
  let unread = parsed.unread;
  let method: ImportResult["method"] = "parser";
  let name = parsed.title;

  // 3. Messy or unfamiliar text: let the AI transcribe it (it may not drop exercises the parser found)
  if (!confident) {
    try {
      const ai = await extractPlan({ text });
      if (countExercises(ai.days) >= countExercises(parsed.days) && ai.days.length) {
        days = ai.days.filter((d) => d.exercises.length);
        unread = [];
        method = "ai";
        name = ai.name || name;
      }
    } catch (err) {
      // AI busy: keep what the parser read and show the rest as unread
      console.warn("[import] AI extraction failed, using parser result", err instanceof AIError ? err.attempts : err);
    }
  }
  if (!countExercises(days)) return { ok: false, error: "invalid" };

  const dated = assignWeekdays(
    days.map((d, i) => ({ ...d, title: d.title || t("dayTitle", { n: i + 1 }) })),
    profile.data.availableDays,
  );
  const plan = trainingPlanSchema.parse({
    name: name || t("defaultName"),
    days: dated.map((d) => ({ ...d, focus: [], cardio: null })),
  });
  return { ok: true, data: { plan, unread, method } };
}
