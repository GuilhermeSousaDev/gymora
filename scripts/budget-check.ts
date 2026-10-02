/**
 * Checks that plan generation fits the per-request time budget (gateway timeout ~30s).
 * Run: npx tsx --conditions=react-server scripts/budget-check.ts
 */
import "dotenv/config";
import { AIError, withBudget } from "../src/lib/ai/client";
import { generatePlan, needsRepair, repairPlanVolume } from "../src/lib/ai/tasks";
import { userProfileSchema } from "../src/lib/types";

const profile = userProfileSchema.parse({
  sex: "female",
  age: 29,
  experience: "intermediate",
  goals: ["hypertrophy", "fat_loss"],
  focusAreas: ["glutes", "hamstrings"],
  availableDays: ["mon", "tue", "thu", "fri"],
  sessionMinutes: 60,
  equipment: "full_gym",
});

const timed = async <T>(label: string, fn: () => Promise<T>) => {
  const t0 = Date.now();
  try {
    const r = await fn();
    console.log(`${label}: ${((Date.now() - t0) / 1000).toFixed(1)}s ok`);
    return r;
  } catch (e) {
    const s = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`${label}: ${s}s failed -> ${e instanceof AIError ? `AIError retryAfter=${e.retryAfter}` : e}`);
    return null;
  }
};

async function main() {
  // 1. Real flow: request 1 = draft, request 2 = repair (only if needed)
  const draft = await timed("request 1 (draft)", () => withBudget(() => generatePlan({ locale: "pt", profile })));
  if (draft) {
    const repair = needsRepair(draft, profile);
    console.log(`  needsRepair=${repair}, by ${draft.generatedBy}`);
    if (repair) await timed("request 2 (repair)", () => withBudget(() => repairPlanVolume({ locale: "pt", profile, plan: draft })));
  }
  // 2. Tiny budget: must fail fast with a retry hint, never hang
  await timed("tiny budget (3s)", () => withBudget(() => generatePlan({ locale: "pt", profile }), 3_000));
}

main().then(() => process.exit(0));
