/**
 * Smoke test for the AI pipeline (hits the real provider).
 * Run: npm run ai:smoke
 */
import "dotenv/config";
import { generatePlan, reviewPlan, understandUser, volumeIssues } from "../src/lib/ai/tasks";
import { emptyProfile, missingRequiredFields, weeklySetsByMuscle } from "../src/lib/types";

async function main() {
  const locale = process.argv[2] ?? "en";
  console.time("understand");
  const u = await understandUser({
    locale,
    mode: "generate",
    round: 1,
    profile: emptyProfile(),
    text:
      locale === "pt"
        ? "Sou mulher, 31 anos, quero crescer glúteos e pernas e perder uns 5kg. Treino há 1 ano, academia completa, seg/qua/sex, 1 hora."
        : "I'm a 27 year old guy, training 3 years, want a bigger chest and arms and lose some belly. Gym Mon, Tue, Thu, Fri, about 70 minutes.",
  });
  console.timeEnd("understand");
  console.log("profile:", JSON.stringify(u.profile));
  console.log("questions:", u.questions.map((q) => `${q.field}: ${q.question}`));
  console.log("missing required:", missingRequiredFields(u.profile));

  const profile = { ...u.profile, sex: u.profile.sex ?? "male", age: u.profile.age ?? 27 };
  console.time("generate");
  const plan = await generatePlan({ locale, profile });
  console.timeEnd("generate");
  console.log(`plan: ${plan.name} | ${plan.split} | ${plan.days.length} days`);
  for (const d of plan.days) console.log(`  ${d.weekday} ${d.title}: ${d.exercises.map((e) => `${e.name} ${e.sets}x${e.repsMin}-${e.repsMax}@${e.rir}`).join(", ")}`);
  console.log("weekly sets:", weeklySetsByMuscle(plan));
  console.log("volume issues after guardrail:", volumeIssues(plan, profile));
  console.log("principles:", plan.principles.map((p) => `[${p.label}] ${p.text}`));

  console.time("review");
  const r = await reviewPlan({
    locale,
    profile,
    planText: "Mon: bench 5x5, flys 3x12\nWed: squat 5x5, leg ext 3x15\nFri: deadlift 3x5, pullups 3x8, curls 3x10",
  });
  console.timeEnd("review");
  console.log("review:", r.review.overall);
  console.log("changes:", r.review.changes);
  console.log("original days:", r.original.days.length, "improved days:", r.improved.days.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
