"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bodyWeights, profiles } from "@/db/schema";
import { requireOnboardedUser, requireUser } from "@/lib/session";
import { userProfileSchema } from "@/lib/types";

export async function updateTrainingProfile(raw: unknown) {
  const { user, profile } = await requireOnboardedUser();
  const data = userProfileSchema.parse(raw);
  await db.update(profiles).set({ data, updatedAt: new Date() }).where(eq(profiles.userId, user.id));
  if (data.weightKg && data.weightKg !== profile.data.weightKg)
    await db.insert(bodyWeights).values({ userId: user.id, weightKg: data.weightKg });
  revalidatePath("/", "layout");
}

export async function logBodyweight(weightKg: number) {
  const user = await requireUser();
  if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 400) return;
  await db.insert(bodyWeights).values({ userId: user.id, weightKg });
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  if (row) await db.update(profiles).set({ data: { ...row.data, weightKg } }).where(eq(profiles.userId, user.id));
  revalidatePath("/", "layout");
}
