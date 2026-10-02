/**
 * Condensed "Natural Bodybuilding Training Framework" used inside AI prompts.
 * Full version with sources: docs/training-framework.md — keep both in sync.
 */
export const TRAINING_FRAMEWORK = `
NATURAL BODYBUILDING TRAINING FRAMEWORK (drug-free lifters; evidence first, practitioner insight second)

Labels (use exactly): [EVIDENCE-SUPPORTED] [PRACTITIONER-BASED] [PLAUSIBLE BUT UNCERTAIN] [INSUFFICIENT EVIDENCE].
Never invent studies, authors or numbers. Pump/soreness/burn are not proof of growth.

VOLUME (direct hard sets per muscle per week; hard set = 0-4 RIR)
- Dose-response with diminishing returns (Schoenfeld 2017; Pelland 2026) [EVIDENCE-SUPPORTED]
- Beginner 6-10 | Intermediate 10-16 | Advanced 12-20 | Specialized muscle 16-22 | Maintenance 4-6 [PRACTITIONER-BASED]
- Max ~6-10 hard sets per muscle per session; otherwise split across sessions [PRACTITIONER-BASED]
- Count compound sets ~0.5 for synergists (bench -> triceps/front delts) [PLAUSIBLE BUT UNCERTAIN]
- MEV/MAV/MRV are mental models, not measurable thresholds [PRACTITIONER-BASED]

FREQUENCY
- Volume-equated frequency barely changes hypertrophy (Schoenfeld 2019) [EVIDENCE-SUPPORTED]
- Train each muscle >=2x/week to distribute volume [PRACTITIONER-BASED]
- Split by days: 2-3 full body; 4 upper/lower; 5 upper/lower+push/pull/legs; 6 PPLx2 [PRACTITIONER-BASED]

PROXIMITY TO FAILURE
- Closer to failure -> more hypertrophy, failure itself adds little (Refalo 2023; Robinson 2024; Grgic 2022) [EVIDENCE-SUPPORTED]
- Heavy compounds 1-3 RIR; machines/isolation 0-1 RIR (failure on last set ok) [PRACTITIONER-BASED]
- Beginners 2-3 RIR while learning technique [PRACTITIONER-BASED]

LOAD / REPS
- 5-30 reps all grow muscle if sets are hard (Lopez 2021) [EVIDENCE-SUPPORTED]; mostly 6-15 is practical [PRACTITIONER-BASED]
- Rest: compounds 2-3 min, isolation 1-2 min (enough to keep set quality) [PRACTITIONER-BASED]

EXERCISE SELECTION
- Free weights ~ machines for hypertrophy (Haugen 2023) [EVIDENCE-SUPPORTED]
- Long muscle length loading: seated leg curl > prone (Maeo 2021), overhead triceps extension > pushdown (Maeo 2023) [EVIDENCE-SUPPORTED]; generalizing to all muscles [PLAUSIBLE BUT UNCERTAIN]
- Prefer stable, progressable, comfortable, low-fatigue-cost exercises; respect injuries/equipment [PRACTITIONER-BASED]
- Keep exercises fixed within a mesocycle so progress is measurable [PRACTITIONER-BASED]

EXERCISE MENU (prefer these over generic "gym card" picks; choose by equipment, comfort and the person's preferences)
- Chest: incline press (DB/machine/Smith), flat press (barbell/DB/machine), deep fly (cable, DB or pec deck) [PRACTITIONER-BASED; extra benefit of the stretch PLAUSIBLE BUT UNCERTAIN]
- Back: lat pulldown or pull-up, chest-supported or cable row, single-arm cable/DB row, straight-arm pulldown or pullover [PRACTITIONER-BASED]
- Shoulders: lateral raise, cable version keeps tension at long lengths [PLAUSIBLE BUT UNCERTAIN]; rear-delt fly or face pull; overhead press optional because pressing already trains front delts [PRACTITIONER-BASED]
- Biceps: incline DB curl or Bayesian cable curl (long length) [PLAUSIBLE BUT UNCERTAIN], preacher/EZ curl [PRACTITIONER-BASED]
- Triceps: overhead extension, cable or DB (Maeo 2023) [EVIDENCE-SUPPORTED]; pushdown; close-grip press only if comfortable [PRACTITIONER-BASED]
- Quads: hack or pendulum squat, leg press, back/front squat, Bulgarian split squat, leg extension [PRACTITIONER-BASED]
- Hamstrings: seated leg curl over lying (Maeo 2021) [EVIDENCE-SUPPORTED]; Romanian deadlift/Stiff [PRACTITIONER-BASED]
- Glutes: hip thrust, RDL, deep squat or split squat, cable/machine abduction [PRACTITIONER-BASED]
- Calves: standing and seated raises with a full stretch and a pause at the bottom [PLAUSIBLE BUT UNCERTAIN]
- Abs: cable crunch, hanging leg raise [PRACTITIONER-BASED]
- Prefer stable machines/cables for isolation; max 2 exercises of the same pattern per day; use "notes" to say why a pick suits this person.

PROGRESSION & MESOCYCLE
- Double progression: reps to top of range at target RIR, then smallest load jump [PRACTITIONER-BASED]
- 4-6 week mesocycles, RIR trending ~3 -> ~0-1, add 1-2 sets only where recovery allows [PRACTITIONER-BASED]
- Deloads not required for hypertrophy (Coleman 2024); use when performance drops/joints ache: ~50% sets, 3+ RIR [PRACTITIONER-BASED]

DECISION RULES (per muscle, weekly) [PRACTITIONER-BASED]
- Improving & recovered -> keep volume. Flat 2+ weeks & recovered -> +1-2 sets or new rep range/exercise.
- Performance down 2 sessions or still sore at next session -> -20-30% sets. Global fatigue -> deload. Joint pain -> swap exercise.

SPECIALIZATION
- 1-2 priority muscles at 16-22 sets over ~3 sessions, trained first; others at maintenance 4-6; 4-8 weeks [PRACTITIONER-BASED]

FAT LOSS / CARDIO / RECOVERY
- Big deficits blunt muscle gain, not strength (Murphy & Koehler 2022) -> keep load & RIR, volume at lower end [EVIDENCE-SUPPORTED direction]
- Moderate cardio rarely blunts hypertrophy; prefer cycling / incline walking; separate from leg days when possible (Murach & Bagley 2016) [EVIDENCE-SUPPORTED at moderate doses]
- Protein 1.6-2.2 g/kg/day (Morton 2018) [EVIDENCE-SUPPORTED]; fat loss ~0.5-1% bodyweight/week [PRACTITIONER-BASED]
- Sleep 7-9 h (sleep loss lowers protein synthesis, Lamon 2021) [PLAUSIBLE BUT UNCERTAIN for long-term growth]

NATURAL vs ENHANCED
- No studies directly compare programming needs; advice built for enhanced athletes should not be assumed to transfer [INSUFFICIENT EVIDENCE]
- Naturals likely have a lower recovery ceiling -> avoid junk volume [PLAUSIBLE BUT UNCERTAIN]

WOMEN / GENERAL-FITNESS USERS
- Similar relative hypertrophy to men (Roberts 2020) -> same effort principles [EVIDENCE-SUPPORTED]
- Many want lower-body/glute growth + fat loss: 2 lower-body days (hip thrust, RDL, squat/leg press, split squat, seated leg curl, abduction) + 1-2 upper days + low-impact cardio + daily steps — ALWAYS adapt to the individual's stated goals [PRACTITIONER-BASED]
- Use plain, friendly language; avoid jargon (RIR, MEV...) unless the user is experienced — explain RIR as "reps left in the tank"

ADHERENCE
- A plan the person enjoys and completes beats a theoretically optimal one; fit it to available days and session length [PRACTITIONER-BASED]
`.trim();
