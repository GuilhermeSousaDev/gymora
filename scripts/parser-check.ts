/**
 * Quick check of the deterministic plan parser.
 * Run: npx tsx scripts/parser-check.ts
 */
import { assignWeekdays, parsePlanText } from "../src/lib/plan-parser";

const samples: Record<string, string> = {
  user: `Quinta— Pernas



 Agachamento/hack — 3×6–10

 Leg press — 2×8–12

 RDL — 3×6–10

 Flexora — 2×10–15

 Panturrilha — 3×10–15`,
  mixed: `Treino A - Superior
1. Supino reto: 4 séries de 8 a 10 (descanso 2 min)
2. Remada curvada 3x10 RIR 1
- Rosca direta 3 x 12, 60s

Treino B - Inferior
• Stiff 3 sets of 8-10
• Cadeira extensora 3x15
Observação: beber água`,
  english: `Monday: Push
Bench press 4x6-8
Incline DB press 3x8-12
Cable fly 3 x 12-15

Thursday: Pull
Lat pulldown 3x10
Chest-supported row 3x10-12`,
};

for (const [label, text] of Object.entries(samples)) {
  const r = parsePlanText(text);
  const days = assignWeekdays(r.days, ["mon", "wed", "fri"]);
  console.log(`\n=== ${label}: ${r.exerciseLines}/${r.contentLines} lines read as exercises`);
  for (const d of days) {
    console.log(`  [${d.weekday}] ${d.title || "(no title)"}`);
    for (const e of d.exercises)
      console.log(`     ${e.name} | ${e.sets}x${e.repsMin}-${e.repsMax} | rir ${e.rir} | rest ${e.restSec}s | ${e.muscleGroup} | ${e.pattern}`);
  }
  if (r.unread.length) console.log("  unread:", r.unread);
}
