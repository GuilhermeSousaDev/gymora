"use server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bodyWeights, profiles, trainingPlans } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { generatePlan, reviewPlan, understandUser } from "@/lib/ai/tasks";
import {
  missingRequiredFields,
  trainingPlanSchema,
  userProfileSchema,
  type UserProfile,
} from "@/lib/types";
import { isValidImageDataUrl, runAi, type ActionResult } from "./helpers";

/** Merge AI-extracted values without wiping what we already know. */
function mergeProfile(base: UserProfile, next: UserProfile): UserProfile {
  const out = { ...base };
  for (const [k, v] of Object.entries(next) as [keyof UserProfile, unknown][]) {
    const empty = v === null || v === "" || (Array.isArray(v) && v.length === 0);
    if (k === "extra") out.extra = { ...base.extra, ...(v as Record<string, string>) };
    else if (!empty) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export async function onboardingUnderstand(input: {
  mode: "generate" | "import";
  text: string;
  profile: unknown;
  round: number;
}) {
  await requireUser();
  const current = userProfileSchema.parse(input.profile ?? {});
  const res = await runAi((locale) =>
    understandUser({
      locale,
      mode: input.mode,
      text: String(input.text ?? "").slice(0, 6000),
      profile: current,
      round: input.round,
    }),
  );
  if (!res.ok) return res;
  const profile = mergeProfile(current, res.data.profile);
  return {
    ok: true as const,
    data: {
      profile,
      questions: res.data.questions.filter((q) => q.question),
      missing: missingRequiredFields(profile),
    },
  };
}

export async function onboardingGenerate(input: { profile: unknown; instructions?: string }) {
  await requireUser();
  const profile = userProfileSchema.parse(input.profile ?? {});
  return runAi((locale) => generatePlan({ locale, profile, instructions: input.instructions?.slice(0, 1000) }));
}

export async function onboardingReview(input: { profile: unknown; planText?: string; planImage?: string }) {
  await requireUser();
  const profile = userProfileSchema.parse(input.profile ?? {});
  const planText = input.planText?.slice(0, 20000);
  const planImage = isValidImageDataUrl(input.planImage) ? input.planImage : undefined;
  if (!planText && !planImage) return { ok: false as const, error: "invalid" as const };
  return runAi((locale) => reviewPlan({ locale, profile, planText, planImage }));
}

export async function onboardingComplete(input: {
  profile: unknown;
  plan: unknown;
  source: "ai" | "imported";
}): Promise<ActionResult<null>> {
  const user = await requireUser();
  const profile = userProfileSchema.parse(input.profile ?? {});
  const plan = trainingPlanSchema.parse(input.plan ?? {});
  if (!plan.days.length) return { ok: false, error: "invalid" };

  await db.transaction(async (tx) => {
    await tx
      .insert(profiles)
      .values({ userId: user.id, data: profile, onboardingCompletedAt: new Date() })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { data: profile, onboardingCompletedAt: new Date(), updatedAt: new Date() },
      });
    await tx.update(trainingPlans).set({ isActive: false }).where(eq(trainingPlans.userId, user.id));
    await tx.insert(trainingPlans).values({
      userId: user.id,
      name: plan.name,
      source: input.source,
      isActive: true,
      plan,
    });
    if (profile.weightKg) await tx.insert(bodyWeights).values({ userId: user.id, weightKg: profile.weightKg });
  });
  return { ok: true, data: null };
}
