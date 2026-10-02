/**
 * Plan quality check against the framework (hits the real provider).
 * Run: npx tsx --conditions=react-server scripts/plan-quality-smoke.ts [en|pt]
 */
import "dotenv/config";
import { generatePlan, issueText, volumeIssues } from "../src/lib/ai/tasks";
import { skeletonText, weeklySkeleton } from "../src/lib/splits";
import { userProfileSchema, weeklySetsByMuscle } from "../src/lib/types";

// Same person as the plan the user complained about
const profile = userProfileSchema.parse({
  sex: "male",
  age: 21,
  experience: "advanced",
  trainingYears: 4,
  goals: ["hypertrophy"],
  focusAreas: [],
  availableDays: ["mon", "tue", "wed", "thu", "fri"],
  sessionMinutes: 75,
  equipment: "full_gym",
  preferences: "doesn't like push-ups or dips",
});

async function main() {
  const locale = process.argv[2] ?? "pt";
  console.log("skeleton:\n" + skeletonText(weeklySkeleton(profile)));
  console.time("generate");
  const plan = await generatePlan({ locale, profile });
  console.timeEnd("generate");
  console.log(`\nplan: ${plan.name} | by ${plan.generatedBy} | fallback=${plan.fallback}`);
  for (const d of plan.days)
    console.log(`  ${d.weekday} ${d.title}: ${d.exercises.map((e) => `${e.name} ${e.sets}x${e.repsMin}-${e.repsMax}`).join(", ")}`);
  console.log("weekly sets:", weeklySetsByMuscle(plan));
  console.log("issues left:", volumeIssues(plan, profile).map(issueText));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
