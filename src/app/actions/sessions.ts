"use server";
import { and, eq, sum } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { cardioEntries, sessionSets, trainingPlans, workoutSessions } from "@/db/schema";
import { requireOnboardedUser } from "@/lib/session";

async function ownSession(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, userId)));
  return row ?? null;
}

/** Starts (or resumes) a session for a plan day and opens training mode. */
export async function startSession(planId: string, dayIndex: number) {
  const { user } = await requireOnboardedUser();

  const [existing] = await db
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, user.id), eq(workoutSessions.status, "active")));
  if (existing) redirect(`/workout/${existing.id}`);

  const [plan] = await db
    .select()
    .from(trainingPlans)
    .where(and(eq(trainingPlans.id, planId), eq(trainingPlans.userId, user.id)));
  const day = plan?.plan.days[dayIndex];
  if (!plan || !day) redirect("/training");

  const [row] = await db
    .insert(workoutSessions)
    .values({ userId: user.id, planId, dayIndex, dayTitle: day.title })
    .returning({ id: workoutSessions.id });
  redirect(`/workout/${row.id}`);
}

const setInput = z.object({
  exerciseIndex: z.number().int().min(0),
  exerciseName: z.string().min(1).max(200),
  muscleGroup: z.string().max(50),
  setNumber: z.number().int().min(1),
  reps: z.number().int().min(0).max(1000),
  weightKg: z.number().min(0).max(2000),
  rir: z.number().min(0).max(10).nullable(),
  workSeconds: z.number().int().min(0).max(3600),
  restSeconds: z.number().int().min(0).max(7200),
});

export async function logSet(sessionId: string, raw: unknown) {
  const { user } = await requireOnboardedUser();
  const data = setInput.parse(raw);
  const s = await ownSession(user.id, sessionId);
  if (!s || s.status !== "active") return null;
  const [row] = await db
    .insert(sessionSets)
    .values({ sessionId, ...data })
    .returning({ id: sessionSets.id });
  return row.id;
}

export async function deleteSet(sessionId: string, setId: string) {
  const { user } = await requireOnboardedUser();
  const s = await ownSession(user.id, sessionId);
  if (!s || s.status !== "active") return;
  await db.delete(sessionSets).where(and(eq(sessionSets.id, setId), eq(sessionSets.sessionId, sessionId)));
}

export async function logCardio(sessionId: string, type: string, seconds: number) {
  const { user } = await requireOnboardedUser();
  const s = await ownSession(user.id, sessionId);
  if (!s || s.status !== "active" || seconds < 1) return;
  await db.insert(cardioEntries).values({
    sessionId,
    type: type.slice(0, 100) || "cardio",
    seconds: Math.min(Math.round(seconds), 6 * 3600),
  });
}

export async function finishSession(sessionId: string, input: { sessionRpe: number | null; notes: string }) {
  const { user } = await requireOnboardedUser();
  const s = await ownSession(user.id, sessionId);
  if (!s || s.status !== "active") redirect("/training");

  // Totals come from what was actually logged, not from the client
  const [sets] = await db
    .select({ work: sum(sessionSets.workSeconds), rest: sum(sessionSets.restSeconds) })
    .from(sessionSets)
    .where(eq(sessionSets.sessionId, sessionId));
  const [cardio] = await db
    .select({ secs: sum(cardioEntries.seconds) })
    .from(cardioEntries)
    .where(eq(cardioEntries.sessionId, sessionId));

  const endedAt = new Date();
  const rpe = input.sessionRpe == null ? null : Math.max(1, Math.min(10, Math.round(input.sessionRpe)));
  await db
    .update(workoutSessions)
    .set({
      status: "completed",
      endedAt,
      totalSeconds: Math.round((endedAt.getTime() - s.startedAt.getTime()) / 1000),
      workSeconds: Number(sets?.work ?? 0),
      restSeconds: Number(sets?.rest ?? 0),
      cardioSeconds: Number(cardio?.secs ?? 0),
      sessionRpe: rpe,
      notes: input.notes?.slice(0, 2000) || null,
    })
    .where(eq(workoutSessions.id, sessionId));
  revalidatePath("/", "layout");
  redirect(`/sessions/${sessionId}`);
}

export async function abandonSession(sessionId: string) {
  const { user } = await requireOnboardedUser();
  await db
    .delete(workoutSessions)
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, user.id), eq(workoutSessions.status, "active")));
  revalidatePath("/", "layout");
  redirect("/training");
}
