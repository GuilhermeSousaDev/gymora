import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { profiles } from "@/db/schema";

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Returns the signed-in user or redirects to /login. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

export const getProfile = cache(async (userId: string) => {
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  return row ?? null;
});

/** Signed-in user who finished onboarding; otherwise redirects. */
export async function requireOnboardedUser() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.onboardingCompletedAt) redirect("/onboarding");
  return { user, profile };
}
