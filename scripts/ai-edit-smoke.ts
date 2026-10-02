/**
 * Smoke test for "Change with AI" (hits the real provider).
 * Run: npx tsx --conditions=react-server scripts/ai-edit-smoke.ts
 */
import "dotenv/config";
import { editPlan, issueText } from "../src/lib/ai/tasks";
import { diffPlans } from "../src/lib/plan-diff";
import { trainingPlanSchema, userProfileSchema } from "../src/lib/types";

const profile = userProfileSchema.parse({
  sex: "male",
  age: 30,
  experience: "intermediate",
  goals: ["hypertrophy"],
  focusAreas: ["chest", "triceps"],
  availableDays: ["mon", "wed", "fri"],
  sessionMinutes: 60,
  equipment: "full_gym",
});

const plan = trainingPlanSchema.parse({
  name: "Push focus",
  split: "Full body",
  days: [
    {
      weekday: "mon",
      title: "Full A",
      exercises: [
        { name: "Supino reto", muscleGroup: "chest", sets: 4, repsMin: 6, repsMax: 10, rir: 2, restSec: 150 },
        { name: "Flexão de braço", muscleGroup: "chest", sets: 3, repsMin: 10, repsMax: 20, rir: 1, restSec: 90 },
        { name: "Mergulho nas paralelas", muscleGroup: "triceps", sets: 3, repsMin: 8, repsMax: 12, rir: 1, restSec: 120 },
        { name: "Remada curvada", muscleGroup: "back", sets: 4, repsMin: 8, repsMax: 12, rir: 2, restSec: 120 },
        { name: "Agachamento", muscleGroup: "quads", sets: 4, repsMin: 6, repsMax: 10, rir: 2, restSec: 180 },
      ],
    },
    {
      weekday: "fri",
      title: "Full B",
      exercises: [
        { name: "Supino inclinado com halteres", muscleGroup: "chest", sets: 4, repsMin: 8, repsMax: 12, rir: 2, restSec: 120 },
        { name: "Mergulho nas paralelas", muscleGroup: "triceps", sets: 3, repsMin: 8, repsMax: 12, rir: 1, restSec: 120 },
        { name: "Tríceps francês", muscleGroup: "triceps", sets: 3, repsMin: 10, repsMax: 15, rir: 1, restSec: 90 },
        { name: "Puxada frontal", muscleGroup: "back", sets: 4, repsMin: 8, repsMax: 12, rir: 2, restSec: 120 },
        { name: "Stiff", muscleGroup: "hamstrings", sets: 3, repsMin: 8, repsMax: 10, rir: 2, restSec: 150 },
        { name: "Elevação lateral", muscleGroup: "shoulders", sets: 3, repsMin: 12, repsMax: 20, rir: 1, restSec: 60 },
        { name: "Hip thrust", muscleGroup: "glutes", sets: 3, repsMin: 8, repsMax: 12, rir: 2, restSec: 120 },
      ],
    },
  ],
});

async function main() {
  console.time("edit");
  const res = await editPlan({
    locale: "pt",
    profile,
    plan,
    request: "Não gostei da flexão de braço nem do mergulho, troque por outros exercícios",
  });
  console.timeEnd("edit");
  console.log("summary:", res.summary);
  console.log("changes:", res.changes);
  console.log("diff:", JSON.stringify(diffPlans(plan, res.plan), null, 2));
  console.log("warnings:", res.warnings.map(issueText));
  console.log("illustration patterns:", res.plan.days.flatMap((d) => d.exercises.map((e) => `${e.name} -> ${e.pattern}`)));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
