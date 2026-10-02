import "server-only";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { bodyWeights, cardioEntries, sessionSets, trainingPlans, workoutSessions } from "@/db/schema";
import { WEEKDAYS, weeklySetsByMuscle, type TrainingPlan, type Weekday } from "@/lib/types";

const DAY = 86_400_000;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Monday 00:00 (server time) of the week containing `d`. */
export function weekStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function todayWeekday(): Weekday {
  return WEEKDAYS[(new Date().getDay() + 6) % 7];
}

/** Epley estimate; only trusted up to 12 reps. */
export const e1rm = (weight: number, reps: number) => (reps > 0 && reps <= 12 ? weight * (1 + reps / 30) : 0);

export async function getActivePlan(userId: string) {
  const [row] = await db
    .select()
    .from(trainingPlans)
    .where(and(eq(trainingPlans.userId, userId), eq(trainingPlans.isActive, true)));
  return row ?? null;
}

export async function listPlans(userId: string) {
  return db
    .select()
    .from(trainingPlans)
    .where(eq(trainingPlans.userId, userId))
    .orderBy(desc(trainingPlans.isActive), desc(trainingPlans.updatedAt));
}

export async function getPlan(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(trainingPlans)
    .where(and(eq(trainingPlans.id, id), eq(trainingPlans.userId, userId)));
  return row ?? null;
}

export async function getActiveSession(userId: string) {
  const [row] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, "active")));
  return row ?? null;
}

export async function recentSessions(userId: string, limit = 5) {
  return db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, "completed")))
    .orderBy(desc(workoutSessions.startedAt))
    .limit(limit);
}

/** Session + its sets/cardio, plus the previous performance for each exercise name. */
export async function getSessionDetail(userId: string, id: string) {
  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, userId)));
  if (!session) return null;
  const [sets, cardio, plan] = await Promise.all([
    db.select().from(sessionSets).where(eq(sessionSets.sessionId, id)).orderBy(asc(sessionSets.completedAt)),
    db.select().from(cardioEntries).where(eq(cardioEntries.sessionId, id)).orderBy(asc(cardioEntries.createdAt)),
    session.planId ? getPlan(userId, session.planId) : Promise.resolve(null),
  ]);
  return { session, sets, cardio, plan };
}

/** Last completed set for each exercise (used to prefill training mode). */
export async function lastPerformance(userId: string, names: string[]) {
  if (!names.length) return {};
  const rows = await db
    .selectDistinctOn([sessionSets.exerciseName], {
      name: sessionSets.exerciseName,
      reps: sessionSets.reps,
      weightKg: sessionSets.weightKg,
    })
    .from(sessionSets)
    .innerJoin(workoutSessions, eq(workoutSessions.id, sessionSets.sessionId))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.status, "completed"),
        inArray(sessionSets.exerciseName, names),
      ),
    )
    .orderBy(sessionSets.exerciseName, desc(sessionSets.completedAt));
  return Object.fromEntries(rows.map((r) => [r.name, { reps: r.reps, weightKg: r.weightKg }]));
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export type WeekBar = { start: string; work: number; rest: number; cardio: number; other: number };

export async function getDashboard(userId: string, plan: TrainingPlan | null) {
  const now = new Date();
  const thisWeek = weekStart(now);
  const chartFrom = new Date(thisWeek.getTime() - 7 * 7 * DAY);
  const streakFrom = new Date(thisWeek.getTime() - 52 * 7 * DAY);

  const [sessions, setsRows, prs, weights] = await Promise.all([
    db
      .select()
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          eq(workoutSessions.status, "completed"),
          gte(workoutSessions.startedAt, streakFrom),
        ),
      )
      .orderBy(desc(workoutSessions.startedAt)),
    db
      .select({
        sessionId: sessionSets.sessionId,
        muscleGroup: sessionSets.muscleGroup,
        reps: sessionSets.reps,
        weightKg: sessionSets.weightKg,
        restSeconds: sessionSets.restSeconds,
        startedAt: workoutSessions.startedAt,
      })
      .from(sessionSets)
      .innerJoin(workoutSessions, eq(workoutSessions.id, sessionSets.sessionId))
      .where(
        and(
          eq(workoutSessions.userId, userId),
          eq(workoutSessions.status, "completed"),
          gte(workoutSessions.startedAt, new Date(now.getTime() - 30 * DAY)),
        ),
      ),
    db
      .select({
        name: sessionSets.exerciseName,
        best: sql<number>`max(${sessionSets.weightKg} * (1 + ${sessionSets.reps} / 30.0))`.mapWith(Number),
      })
      .from(sessionSets)
      .innerJoin(workoutSessions, eq(workoutSessions.id, sessionSets.sessionId))
      .where(
        and(
          eq(workoutSessions.userId, userId),
          eq(workoutSessions.status, "completed"),
          sql`${sessionSets.reps} between 1 and 12`,
          sql`${sessionSets.weightKg} > 0`,
        ),
      )
      .groupBy(sessionSets.exerciseName)
      .orderBy(desc(sql`2`))
      .limit(6),
    db
      .select()
      .from(bodyWeights)
      .where(eq(bodyWeights.userId, userId))
      .orderBy(desc(bodyWeights.measuredAt))
      .limit(30),
  ]);

  // --- this week
  const weekSessions = sessions.filter((s) => s.startedAt >= thisWeek);
  const weekIds = new Set(weekSessions.map((s) => s.id));
  const weekSets = setsRows.filter((r) => weekIds.has(r.sessionId));
  const planned = plan?.days.length ?? 0;

  const week = {
    sessions: weekSessions.length,
    planned,
    minutes: Math.round(weekSessions.reduce((a, s) => a + s.totalSeconds, 0) / 60),
    cardioMinutes: Math.round(weekSessions.reduce((a, s) => a + s.cardioSeconds, 0) / 60),
    volume: Math.round(weekSets.reduce((a, r) => a + r.reps * r.weightKg, 0)),
    sets: weekSets.length,
  };

  // --- streak: consecutive weeks hitting the plan (current week counts once achieved)
  const perWeek = new Map<number, number>();
  for (const s of sessions) {
    const k = weekStart(s.startedAt).getTime();
    perWeek.set(k, (perWeek.get(k) ?? 0) + 1);
  }
  const target = Math.max(1, planned);
  let streak = (perWeek.get(thisWeek.getTime()) ?? 0) >= target ? 1 : 0;
  for (let w = 1; w <= 52; w++) {
    const k = weekStart(new Date(thisWeek.getTime() - w * 7 * DAY)).getTime();
    if ((perWeek.get(k) ?? 0) >= target) streak++;
    else break;
  }

  // --- averages (30 days)
  const last30 = sessions.filter((s) => s.startedAt.getTime() >= now.getTime() - 30 * DAY);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const restSets = setsRows.filter((r) => r.restSeconds > 0);
  const totalWork = last30.reduce((a, s) => a + s.workSeconds, 0);
  const totalRest = last30.reduce((a, s) => a + s.restSeconds, 0);
  const rpes = last30.map((s) => s.sessionRpe).filter((x): x is number => x != null);
  const averages = {
    count: last30.length,
    sessionMinutes: Math.round(avg(last30.map((s) => s.totalSeconds)) / 60),
    workMinutes: Math.round(avg(last30.map((s) => s.workSeconds)) / 60),
    restBetweenSets: Math.round(avg(restSets.map((r) => r.restSeconds))),
    workRestRatio: totalRest ? totalWork / totalRest : 0,
    rpe: rpes.length ? Math.round(avg(rpes) * 10) / 10 : null,
  };

  // --- 8-week chart (minutes)
  const chart: WeekBar[] = [];
  for (let i = 0; i < 8; i++) {
    const start = new Date(chartFrom.getTime() + i * 7 * DAY);
    const end = new Date(start.getTime() + 7 * DAY);
    const ws = sessions.filter((s) => s.startedAt >= start && s.startedAt < end);
    const work = ws.reduce((a, s) => a + s.workSeconds, 0) / 60;
    const rest = ws.reduce((a, s) => a + s.restSeconds, 0) / 60;
    const cardio = ws.reduce((a, s) => a + s.cardioSeconds, 0) / 60;
    const total = ws.reduce((a, s) => a + s.totalSeconds, 0) / 60;
    chart.push({
      start: start.toISOString(),
      work: Math.round(work),
      rest: Math.round(rest),
      cardio: Math.round(cardio),
      other: Math.max(0, Math.round(total - work - rest - cardio)),
    });
  }

  // --- sets per muscle this week vs plan
  const targets = plan ? weeklySetsByMuscle(plan) : {};
  const done: Record<string, number> = {};
  for (const r of weekSets) done[r.muscleGroup] = (done[r.muscleGroup] ?? 0) + 1;
  const muscles = [...new Set([...Object.keys(targets), ...Object.keys(done)])]
    .map((m) => ({ muscle: m, done: done[m] ?? 0, target: targets[m] ?? 0 }))
    .sort((a, b) => b.target - a.target || b.done - a.done);

  // --- bodyweight
  const latest = weights[0] ?? null;
  const monthAgo = weights.find((w) => w.measuredAt.getTime() <= now.getTime() - 30 * DAY) ?? weights.at(-1);
  const bodyweight = latest
    ? {
        latest: round1(latest.weightKg),
        change30: monthAgo && monthAgo.id !== latest.id ? round1(latest.weightKg - monthAgo.weightKg) : 0,
        series: weights
          .slice(0, 12)
          .reverse()
          .map((w) => ({ date: w.measuredAt.toISOString(), kg: round1(w.weightKg) })),
      }
    : null;

  return {
    week,
    streak,
    averages,
    chart,
    muscles,
    prs: prs.map((p) => ({ name: p.name, e1rm: Math.round(p.best * 10) / 10 })),
    bodyweight,
    recent: sessions.slice(0, 5),
    /** Weekdays with a completed session this week (for the week strip) */
    doneWeekdays: [...new Set(weekSessions.map((x) => WEEKDAYS[(x.startedAt.getDay() + 6) % 7]))],
  };
}
