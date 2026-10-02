"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { trainingPlans } from "@/db/schema";
import { getProfile, requireOnboardedUser, requireUser } from "@/lib/session";
import { analyzePhoto, editPlan, generatePlan, needsRepair, repairPlanVolume, revisePlan } from "@/lib/ai/tasks";
import { photoFeedbackSchema, trainingPlanSchema, userProfileSchema, type TrainingPlan } from "@/lib/types";
import { getActivePlan } from "@/lib/data";
import { isValidImageDataUrl, runAi, type ActionResult } from "./helpers";

async function ownPlan(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(trainingPlans)
    .where(and(eq(trainingPlans.id, id), eq(trainingPlans.userId, userId)));
  return row ?? null;
}

export async function setActivePlan(id: string) {
  const { user } = await requireOnboardedUser();
  if (!(await ownPlan(user.id, id))) return;
  await db.transaction(async (tx) => {
    await tx.update(trainingPlans).set({ isActive: false }).where(eq(trainingPlans.userId, user.id));
    await tx.update(trainingPlans).set({ isActive: true }).where(eq(trainingPlans.id, id));
  });
  revalidatePath("/", "layout");
}

export async function deletePlan(id: string) {
  const { user } = await requireOnboardedUser();
  await db.delete(trainingPlans).where(and(eq(trainingPlans.id, id), eq(trainingPlans.userId, user.id)));
  revalidatePath("/", "layout");
}

export async function updatePlan(id: string, rawPlan: unknown): Promise<ActionResult<null>> {
  const { user } = await requireOnboardedUser();
  const parsed = trainingPlanSchema.safeParse(rawPlan);
  if (!parsed.success || !(await ownPlan(user.id, id))) return { ok: false, error: "invalid" };
  await db
    .update(trainingPlans)
    .set({ plan: parsed.data, name: parsed.data.name, updatedAt: new Date() })
    .where(eq(trainingPlans.id, id));
  revalidatePath("/", "layout");
  return { ok: true, data: null };
}

export async function createPlan(input: {
  plan: unknown;
  source: "ai" | "imported" | "manual";
  makeActive: boolean;
}): Promise<ActionResult<{ id: string }>> {
  const { user } = await requireOnboardedUser();
  const parsed = trainingPlanSchema.safeParse(input.plan);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const id = await db.transaction(async (tx) => {
    if (input.makeActive)
      await tx.update(trainingPlans).set({ isActive: false }).where(eq(trainingPlans.userId, user.id));
    const [row] = await tx
      .insert(trainingPlans)
      .values({
        userId: user.id,
        name: parsed.data.name,
        source: input.source,
        isActive: input.makeActive,
        plan: parsed.data,
      })
      .returning({ id: trainingPlans.id });
    return row.id;
  });
  revalidatePath("/", "layout");
  return { ok: true, data: { id } };
}

export async function createBlankPlan(): Promise<ActionResult<{ id: string }>> {
  const t = await getTranslations("editor");
  const blank: TrainingPlan = trainingPlanSchema.parse({
    name: t("blankName"),
    days: [{ weekday: "mon", title: t("newDay"), exercises: [] }],
  });
  return createPlan({ plan: blank, source: "manual", makeActive: false });
}

export async function generateAnotherPlan(instructions?: string) {
  const { profile } = await requireOnboardedUser();
  return runAi(async (locale) => {
    const plan = await generatePlan({ locale, profile: profile.data, instructions: instructions?.slice(0, 1000) });
    return { plan, needsRepair: needsRepair(plan, profile.data) };
  });
}

/**
 * Second step of plan generation (its own request, so neither step hits the gateway timeout).
 * During onboarding there's no saved profile yet, so the in-progress one is accepted.
 */
export async function repairPlan(input: { plan: unknown; profile?: unknown }) {
  const user = await requireUser();
  const saved = await getProfile(user.id);
  const profile = saved?.onboardingCompletedAt ? saved.data : userProfileSchema.parse(input.profile ?? {});
  const plan = trainingPlanSchema.safeParse(input.plan);
  if (!plan.success) return { ok: false as const, error: "invalid" as const };
  return runAi((locale) => repairPlanVolume({ locale, profile, plan: plan.data }));
}

/** The photo only lives in memory for this request — it is never written anywhere. */
export async function analyzePhotoAction(image: string) {
  const { profile } = await requireOnboardedUser();
  if (!isValidImageDataUrl(image)) return { ok: false as const, error: "invalid" as const };
  return runAi((locale) => analyzePhoto({ locale, profile: profile.data, image }));
}

export async function revisePlanFromFeedback(rawFeedback: unknown) {
  const { user, profile } = await requireOnboardedUser();
  const active = await getActivePlan(user.id);
  if (!active) return { ok: false as const, error: "invalid" as const };
  const feedback = photoFeedbackSchema.parse(rawFeedback);
  return runAi((locale) => revisePlan({ locale, profile: profile.data, plan: active.plan, feedback }));
}

export async function applyRevision(input: { plan: unknown; asNew: boolean }): Promise<ActionResult<null>> {
  const { user } = await requireOnboardedUser();
  if (input.asNew) {
    const res = await createPlan({ plan: input.plan, source: "ai", makeActive: true });
    return res.ok ? { ok: true, data: null } : res;
  }
  const active = await getActivePlan(user.id);
  if (!active) return { ok: false, error: "invalid" };
  return updatePlan(active.id, input.plan);
}

/**
 * Change a plan using the user's own words. Works on unsaved plans too (onboarding / freshly generated),
 * so nothing is written here; the caller decides whether to save.
 * During onboarding there is no saved profile yet, so the in-progress one is accepted.
 */
export async function editPlanWithAi(input: { plan: unknown; request: string; profile?: unknown }) {
  const user = await requireUser();
  const saved = await getProfile(user.id);
  const profile = saved?.onboardingCompletedAt ? saved.data : userProfileSchema.parse(input.profile ?? {});
  const plan = trainingPlanSchema.safeParse(input.plan);
  const request = String(input.request ?? "").trim().slice(0, 2000);
  if (!plan.success || !request) return { ok: false as const, error: "invalid" as const };
  return runAi((locale) => editPlan({ locale, profile, plan: plan.data, request }));
}
