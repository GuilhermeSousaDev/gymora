import { notFound, redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/session";
import { getSessionDetail, lastPerformance } from "@/lib/data";
import { WorkoutMode } from "./workout-mode";

export default async function WorkoutPage({ params }: PageProps<"/workout/[id]">) {
  const { id } = await params;
  const { user } = await requireOnboardedUser();
  const detail = await getSessionDetail(user.id, id);
  if (!detail) notFound();
  if (detail.session.status !== "active") redirect(`/sessions/${id}`);

  const day = detail.plan?.plan.days[detail.session.dayIndex] ?? null;
  const exercises = day?.exercises ?? [];
  const last = await lastPerformance(user.id, exercises.map((e) => e.name));

  return (
    <WorkoutMode
      sessionId={id}
      startedAt={detail.session.startedAt.toISOString()}
      title={detail.session.dayTitle}
      exercises={exercises}
      plannedCardio={day?.cardio ?? null}
      initialSets={detail.sets.map((s) => ({
        id: s.id,
        exerciseIndex: s.exerciseIndex,
        setNumber: s.setNumber,
        reps: s.reps,
        weightKg: s.weightKg,
        rir: s.rir,
        workSeconds: s.workSeconds,
        restSeconds: s.restSeconds,
      }))}
      initialCardioSeconds={detail.cardio.reduce((a, c) => a + c.seconds, 0)}
      last={last}
    />
  );
}
