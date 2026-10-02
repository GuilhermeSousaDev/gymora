# Gymora — Natural Bodybuilding Training Framework

> Goal: maximize hypertrophy for **drug-free** lifters while managing fatigue and recovery —
> not maximizing volume for its own sake. The system is adaptable, not one universal program.
>
> This document is the human-readable source of truth. A condensed version is embedded in the AI
> prompts at `src/lib/ai/framework.ts` — keep both in sync.

Every recommendation carries one label:

| Label | Meaning |
|---|---|
| **[EVIDENCE-SUPPORTED]** | Backed by meta-analyses / RCTs in (mostly) trained people |
| **[PRACTITIONER-BASED]** | Common, sensible coaching practice; not directly tested |
| **[PLAUSIBLE BUT UNCERTAIN]** | Some indirect/mechanistic or limited data |
| **[INSUFFICIENT EVIDENCE]** | Not adequately tested; don't sell it as fact |

---

## 1. Evidence hierarchy

1. Systematic reviews & meta-analyses
2. Randomized controlled trials
3. Narrative / scoping reviews
4. Studies in resistance-trained people
5. Studies in physique athletes / natural bodybuilders
6. Position stands
7. Experienced practitioners (coaches, competitors)
8. Social media / video content — **never** primary evidence for physiological claims

Rules:
- Separate evidence from opinion. A coach's experience is not a study.
- Mechanistic speculation ("more tension ⇒ more growth") is not an outcome.
- Statistically significant ≠ practically important. Look at effect sizes and uncertainty.
- When studies disagree, check: trained vs untrained, volume equated or not, duration, exercise,
  measurement method (ultrasound/MRI vs DXA/skinfolds), and confidence intervals.

### A note on practitioner sources
Practitioner positions below reflect widely shared views in the natural-bodybuilding coaching
community (e.g. Eric Helms' published work, Renaissance Periodization's "volume landmarks",
Jaime de la Madrid and other natural competitors). **Specific claims were not attributed to any
individual coach in this pass** — review their public material directly before quoting them, and
never present their views as experimental findings.

---

## 2. Verified sources (PubMed-checked)

| # | Source | Type | Population | Main finding (short) | Limitations |
|---|---|---|---|---|---|
| S1 | Schoenfeld, Ogborn, Krieger (2017). *Dose-response relationship between weekly RT volume and increases in muscle mass.* J Sports Sci. doi:10.1080/02640414.2016.1210197 | Meta-analysis | Mixed training status | Graded dose-response; ≥10 sets/muscle/week > <5 | Few studies at high volumes; set definitions vary |
| S2 | Pelland, Remmert, Robinson et al. (2026). *The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency…* Sports Med. doi:10.1007/s40279-025-02344-w | Meta-regression | Mixed | Hypertrophy keeps rising with volume but with diminishing returns; frequency adds little once volume is accounted for | Between-study comparisons; wide uncertainty at high volumes |
| S3 | Schoenfeld, Grgic, Krieger (2019). *How many times per week should a muscle be trained…* J Sports Sci. doi:10.1080/02640414.2018.1555906 | Meta-analysis | Mixed | With volume equated, frequency doesn't meaningfully change hypertrophy | Short studies; mostly ≤3×/week compared |
| S4 | Refalo, Helms, Trexler, Hamilton (2023). *Influence of RT Proximity-to-Failure on Skeletal Muscle Hypertrophy.* Sports Med. doi:10.1007/s40279-022-01784-y | Meta-analysis | Mixed | Failure vs non-failure: no clear hypertrophy difference; proximity is poorly controlled in studies | "Non-failure" defined inconsistently |
| S5 | Robinson, Pelland, Remmert, Refalo (2024). *Dose-Response Between Estimated Proximity to Failure, Strength Gain, and Hypertrophy.* Sports Med. doi:10.1007/s40279-024-02069-2 | Meta-regressions | Mixed | Hypertrophy tends to increase as sets end closer to failure; strength much less sensitive | RIR was *estimated* retrospectively |
| S6 | Grgic, Schoenfeld, Orazem, Sabol (2022). *Effects of RT performed to repetition failure or non-failure…* J Sport Health Sci. doi:10.1016/j.jshs.2021.01.007 | Meta-analysis | Mixed | No significant hypertrophy/strength advantage for failure overall; possible benefit in trained people | Small number of trained-subject studies |
| S7 | Pelland, Robinson, Remmert, Cerminaro et al. (2022). *Methods for Controlling and Reporting RT Proximity to Failure.* Sports Med. doi:10.1007/s40279-022-01667-2 | Review | — | RIR is a useful but imperfect tool; accuracy improves closer to failure and with experience | Narrative synthesis |
| S8 | Lopez, Radaelli, Taaffe et al. (2021). *RT Load Effects on Muscle Hypertrophy and Strength Gain.* Med Sci Sports Exerc. doi:10.1249/MSS.0000000000002585 | Network meta-analysis | Mixed | Similar hypertrophy across low/moderate/high loads when sets are hard; heavy loads better for strength | Many untrained samples |
| S9 | Haugen, Vårvik, Larsen et al. (2023). *Free-weight vs machine-based strength training…* BMC Sports Sci Med Rehabil. doi:10.1186/s13102-023-00713-4 | Meta-analysis | Mixed | No meaningful hypertrophy difference between free weights and machines | Heterogeneous exercises/measures |
| S10 | Maeo et al. (2021). *Greater hamstrings hypertrophy… training at long vs short muscle lengths.* Med Sci Sports Exerc. doi:10.1249/MSS.0000000000002523 | RCT (within-subject) | Untrained | Seated leg curl (long length) > prone leg curl | Untrained; 12 weeks; single muscle |
| S11 | Maeo et al. (2023). *Triceps hypertrophy greater after overhead vs neutral elbow extension.* Eur J Sport Sci. doi:10.1080/17461391.2022.2100279 | RCT (within-subject) | Untrained | Overhead extensions > pushdowns for triceps growth | Untrained; single exercise pair |
| S12 | Coleman, Burke, Augustin et al. (2024). *Gaining more from doing less? One-week deload…* PeerJ. doi:10.7717/peerj.16777 | RCT | Trained | A 1-week training cessation "deload" did not improve hypertrophy; slightly worse lower-body strength | Deload = full cessation; 9 weeks; small n |
| S13 | Helms, Fitschen, Aragon et al. (2015). *Recommendations for natural bodybuilding contest preparation: resistance and cardiovascular training.* J Sports Med Phys Fitness | Review | Natural bodybuilders | Keep training heavy/hard in a deficit; limit cardio interference; individualize | Narrative; limited direct data |
| S14 | Helms, Aragon, Fitschen (2014). *Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation.* JISSN (PMC4033492) | Review | Natural bodybuilders | Protein 2.3–3.1 g/kg LBM in a deficit; slow weight loss (~0.5–1%/week) | Narrative; contest-prep specific |
| S15 | Chappell, Simper, Barker (2018). *Nutritional strategies of high-level natural bodybuilders during competition preparation.* JISSN (PMC5769537) | Observational | Natural competitors | Describes real prep practices (high protein, gradual deficits) | Self-reported; small; descriptive only |
| S16 | Roberts, Helms, Trexler et al. (2020). *Nutritional Recommendations for Physique Athletes.* J Hum Kinet. doi:10.2478/hukin-2019-0096 | Review | Physique athletes | Off-season: small surplus; in-season: gradual deficit; high protein | Narrative |
| S17 | Morton, Murphy, McKellar et al. (2018). *Protein supplementation and RT-induced gains in muscle mass and strength.* Br J Sports Med. doi:10.1136/bjsports-2017-097608 | Meta-analysis | Mixed | Benefit of protein plateaus ~1.6 g/kg/day (upper CI ~2.2) | Mostly surplus/maintenance conditions |
| S18 | Murphy, Koehler (2022). *Energy deficiency impairs RT gains in lean mass but not strength.* Scand J Med Sci Sports. doi:10.1111/sms.14075 | Meta-analysis | Mixed | Larger energy deficits blunt lean-mass gain; strength largely preserved | Heterogeneous deficits/measures |
| S19 | Murach, Bagley (2016). *Skeletal muscle hypertrophy with concurrent exercise training: contrary evidence for an interference effect.* Sports Med. doi:10.1007/s40279-016-0496-y | Review | Mixed | Cardio does not necessarily blunt hypertrophy; mode/dose matter (cycling friendlier than running) | Narrative |
| S20 | Roberts, Nuckols, Krieger (2020). *Sex Differences in Resistance Training.* J Strength Cond Res. doi:10.1519/JSC.0000000000003521 | Meta-analysis | Men & women | Similar *relative* hypertrophy; women gain relatively more upper-body strength | Mostly untrained |
| S21 | Lamon, Morabito, Arentson-Lantz et al. (2021). *Acute sleep deprivation and muscle protein synthesis.* Physiol Rep. doi:10.14814/phy2.14660 | RCT (acute) | Young adults | One night of total sleep deprivation lowered muscle protein synthesis | Acute; not a training study |

---

## 3. Core principles

1. **Hard sets are the unit of stimulus.** Count sets taken within ~0–4 RIR. [EVIDENCE-SUPPORTED — S1, S2, S5]
2. **More volume helps, with diminishing returns.** Add volume only while recovery and performance allow. [EVIDENCE-SUPPORTED — S1, S2]
3. **Train close to failure, not necessarily to failure.** [EVIDENCE-SUPPORTED — S4, S5, S6]
4. **Load is flexible (≈5–30 reps) if effort is high;** most work in 6–15 reps is practical. [EVIDENCE-SUPPORTED — S8] / 6–15 preference [PRACTITIONER-BASED]
5. **Progressive overload, tracked.** Log load × reps × RIR every session. [PRACTITIONER-BASED; consistent with all training literature]
6. **Choose exercises you can progress, feel stable in, and load through a long range of motion.** [PARTLY EVIDENCE-SUPPORTED — S9, S10, S11]
7. **Fatigue is the constraint, not motivation.** Recovery (sleep, food, stress) limits useful volume. [PLAUSIBLE BUT UNCERTAIN]
8. **Individualize.** Response to volume varies widely between people. [EVIDENCE-SUPPORTED that variation exists; how to predict it: INSUFFICIENT EVIDENCE]

---

## 4. Volume framework

| Situation | Direct hard sets / muscle / week |
|---|---|
| Beginner (<1 yr) | 6–10 |
| Intermediate | 10–16 |
| Advanced | 12–20 (priority muscles only above this) |
| Specialized muscle (1–2 at a time) | 16–22+, temporarily |
| Maintenance (non-priority muscles during specialization, or in a big deficit) | ~4–6 |

- Graded dose-response with diminishing returns. [EVIDENCE-SUPPORTED — S1, S2]
- Exact ranges above. [PRACTITIONER-BASED]
- MEV / MAV / MRV "landmarks" are a useful *mental model* but are **not measurable, validated
  thresholds**. [PRACTITIONER-BASED]
- Count compound sets fractionally for synergists (e.g. a bench set ≈ 0.5 triceps set). [PLAUSIBLE BUT UNCERTAIN — S2 found fractional counting fit well]
- Per-session cap of ~6–10 hard sets per muscle; beyond that, split into another session. [PRACTITIONER-BASED / PLAUSIBLE BUT UNCERTAIN]
- Within a mesocycle: start near the low end, add ~1–2 sets/muscle/week only where recovery allows. [PRACTITIONER-BASED]

## 5. Frequency framework

- With volume equated, frequency has little effect on hypertrophy. [EVIDENCE-SUPPORTED — S3, S2]
- Train each muscle **≥2×/week** mainly to *distribute* volume and keep set quality high. [PRACTITIONER-BASED, supported indirectly]
- Choose the split by available days: 2–3 days → full body; 4 → upper/lower; 5 → upper/lower + push/pull/legs; 6 → PPL×2. [PRACTITIONER-BASED]
- ≥48 h before hard-training the same muscle again is a sensible default. [PLAUSIBLE BUT UNCERTAIN]

## 6. RIR / failure framework

- Hypertrophy improves as sets get closer to failure; the benefit of true failure over ~1–2 RIR is small/uncertain. [EVIDENCE-SUPPORTED — S4, S5, S6]
- Default targets: **heavy compounds 1–3 RIR**, **machines/isolation 0–1 RIR** (failure on last set allowed). [PRACTITIONER-BASED — failure on stable/isolation moves is safer and costs less systemic fatigue]
- Beginners: 2–3 RIR while learning technique; teach RIR by occasionally testing sets to failure on safe machines. [PRACTITIONER-BASED; S7: RIR accuracy improves with experience/closer to failure]
- Distinguish *technical failure* (form breaks) from *momentary muscular failure*. Stop compounds at technical failure. [PRACTITIONER-BASED]

## 7. Exercise-selection framework

Score each candidate on:
1. Stability (can the target muscle be the limiter?) [PRACTITIONER-BASED]
2. Load in the lengthened position / full ROM. [EVIDENCE-SUPPORTED for hamstrings & triceps — S10, S11; generalizing to all muscles: PLAUSIBLE BUT UNCERTAIN]
3. Progressability (small, repeatable load jumps). [PRACTITIONER-BASED]
4. Fatigue cost (systemic + joint) vs stimulus ("stimulus-to-fatigue ratio"). [PRACTITIONER-BASED; not formally measurable]
5. Individual comfort / anatomy / injury history. [PRACTITIONER-BASED]

- Free weights vs machines: pick either. [EVIDENCE-SUPPORTED — S9]
- Pump, burn or soreness are **not** proof of a better stimulus. [INSUFFICIENT EVIDENCE that they predict growth]
- Keep exercises stable across a mesocycle so progress is measurable; rotate between mesocycles. [PRACTITIONER-BASED]

### Exercise menu (what the AI picks from)
Preferred options per muscle, so plans aren't the generic "gym card". Choose by equipment, comfort and preference.

| Muscle | Preferred options | Label |
|---|---|---|
| Chest | Incline press (DB/machine/Smith), flat press, deep fly (cable, DB, pec deck) | [PRACTITIONER-BASED]; extra stretch benefit [PLAUSIBLE BUT UNCERTAIN] |
| Back | Lat pulldown / pull-up, chest-supported or cable row, single-arm row, straight-arm pulldown / pullover | [PRACTITIONER-BASED] |
| Shoulders | Lateral raise (cable keeps tension at long lengths), rear-delt fly / face pull; overhead press optional | [PLAUSIBLE BUT UNCERTAIN] / [PRACTITIONER-BASED] |
| Biceps | Incline DB curl, Bayesian cable curl, preacher / EZ curl | [PLAUSIBLE BUT UNCERTAIN] / [PRACTITIONER-BASED] |
| Triceps | Overhead extension (S11), pushdown; close-grip press if comfortable | [EVIDENCE-SUPPORTED] / [PRACTITIONER-BASED] |
| Quads | Hack / pendulum squat, leg press, squat, Bulgarian split squat, leg extension | [PRACTITIONER-BASED] |
| Hamstrings | Seated leg curl over lying (S10), RDL / Stiff | [EVIDENCE-SUPPORTED] / [PRACTITIONER-BASED] |
| Glutes | Hip thrust, RDL, deep squat / split squat, abduction | [PRACTITIONER-BASED] |
| Calves | Standing and seated raises with a full stretch and pause | [PLAUSIBLE BUT UNCERTAIN] |
| Abs | Cable crunch, hanging leg raise | [PRACTITIONER-BASED] |

Rules: stable machines/cables for isolation; at most 2 exercises of the same pattern per day.

### Weekly structure (chosen in code, `src/lib/splits.ts`)
2 days → full body A/B · 3 → full body A/B/C (lower or upper emphasis: L/U/L or U/L/U) · 4 → upper/lower ×2 ·
5 → upper, lower, push, pull, legs (lower emphasis: L/U/glutes & hamstrings/U/L) · 6+ → push/pull/legs ×2.
Every major muscle is trained at least twice a week. The plan check rejects filler days (fewer than 6 real sets)
when the goal is muscle. [PRACTITIONER-BASED; frequency as a way to distribute volume — S2, S3]

## 8. Progression framework

- **Double progression**: stay in the rep range at target RIR; when all sets hit the top of the range, add the smallest load increment. [PRACTITIONER-BASED]
- Rep progression first, then load. [PRACTITIONER-BASED]
- Add sets only when performance is stable/improving **and** the muscle recovers between sessions. [PRACTITIONER-BASED]
- Track: load, reps, RIR, rest, session RPE, bodyweight. [PRACTITIONER-BASED]

## 9. Mesocycle framework

- 4–6 weeks accumulation → optional lighter week → repeat/re-evaluate. [PRACTITIONER-BASED]
- RIR can start ~3 and trend toward ~0–1 by the last week. [PRACTITIONER-BASED]
- Deloads are **not required for hypertrophy** in the short term; use them reactively (performance drop, joint pain, poor sleep/stress) or every ~4–8 weeks as a fatigue tool: ~50% of sets, 3+ RIR. [S12: EVIDENCE shows no hypertrophy benefit of a full-rest week; benefit of reduced-volume deload: INSUFFICIENT EVIDENCE]
- "Resensitization" through low-volume phases. [INSUFFICIENT EVIDENCE]

## 10. Fatigue-management framework

- Local fatigue: performance drop within/between sessions for a muscle.
- Systemic fatigue: sleep, mood, motivation, resting HR, all lifts dropping.
- Put the most fatiguing / most important lifts first; place priority muscles early in the session. [PRACTITIONER-BASED]
- Prefer lower-fatigue exercise variants when total volume is high (e.g. machines, supported rows). [PRACTITIONER-BASED]
- Cardio: moderate doses rarely blunt hypertrophy; prefer cycling/incline walking; separate from leg sessions by a few hours when possible. [EVIDENCE-SUPPORTED at moderate doses — S19; best timing: PLAUSIBLE BUT UNCERTAIN]

## 11. Specialization framework

- Raise 1–2 priority muscles to ~16–22 sets across 3 sessions/week; drop others to maintenance (~4–6). [PRACTITIONER-BASED; volume dose-response supports the direction — S1, S2]
- Train the priority muscle first in the session, fresh. [PRACTITIONER-BASED]
- Run specialization for one mesocycle (4–8 weeks), then return to balanced volume. [PRACTITIONER-BASED]
- Examples:
  - **Chest**: incline press, flat machine press, deep fly (cable/machine) 3×/week; reduce shoulder pressing (front delts already worked).
  - **Back**: vertical pull + supported row + stretch-biased pulldown/pullover; reduce deadlift-style systemic fatigue.
  - **Delts**: lateral raises 4–6×/week (low systemic cost), rear-delt fly; keep pressing moderate.
  - **Arms**: overhead triceps extension (S11), incline/Bayesian curls; reduce redundant compound pushing/pulling.
  - **Legs/glutes**: squat or leg press pattern, hip thrust/RDL, seated leg curl (S10), split squats; cut upper-body volume to maintenance.

## 12. Recovery framework

- Protein ~1.6–2.2 g/kg/day; up to ~2.3–3.1 g/kg lean mass in a deficit. [EVIDENCE-SUPPORTED — S17, S14]
- Off-season small surplus; fat-loss ~0.5–1% bodyweight/week. [PRACTITIONER-BASED/review — S14, S16]
- Big energy deficits blunt muscle gain but not strength → in a deficit keep intensity, trim volume ~20–30% if recovery suffers. [EVIDENCE-SUPPORTED direction — S18; exact trim: PRACTITIONER-BASED]
- Sleep 7–9 h; sleep loss lowers muscle protein synthesis. [PLAUSIBLE BUT UNCERTAIN for long-term hypertrophy — S21 is acute]
- Life stress, training age and individual capacity change useful volume. [PLAUSIBLE BUT UNCERTAIN]

## 13. Decision rules — increase / maintain / decrease volume (per muscle, weekly)

| Signal (last 1–2 weeks) | Action |
|---|---|
| Performance ↑, recovered before next session, joints fine | **Maintain** (progression is happening) |
| Performance flat ≥2 weeks, recovered, sleep/food fine | **+1–2 sets** or change rep range / exercise |
| Performance ↓ in ≥2 consecutive sessions or soreness still present at next session | **−20–30% sets** for that muscle; check sleep/food/stress |
| Several muscles dropping + poor sleep / motivation | **Deload week** (≈50% sets, 3+ RIR) |
| Joint pain on an exercise | **Swap the exercise**, keep the muscle's volume |
| In an aggressive deficit | Keep load/RIR, volume at the lower end |

All rules: [PRACTITIONER-BASED]

## 14. Example templates

### A. 3 days — Full body (beginners / limited time)
Mon / Wed / Fri. Each day: 1 squat or leg-press pattern, 1 hinge or leg curl, 1 horizontal press, 1 row, 1 vertical pull or press, 1–2 arm/delt isolations. ~2–3 sets each, 2–3 RIR.

### B. 4 days — Upper / Lower (intermediate default)
Upper A (horizontal focus), Lower A (squat focus), Upper B (vertical focus), Lower B (hinge focus). ~12–16 sets/muscle/week, compounds 1–3 RIR, isolations 0–1 RIR.

### C. 5 days — Upper / Lower / Push / Pull / Legs
Good for intermediates/advanced who want more session spread.

### D. 6 days — Push / Pull / Legs ×2
Advanced only; watch systemic fatigue; each session shorter.

### E. Lower-body & fat-loss focus (common women's request — always adapt to the individual)
3–4 days: 2 lower-body days (hip thrust, RDL, squat/leg press, split squat, seated leg curl, abduction),
1–2 full-upper days at moderate volume; 2–4 × 20–40 min low-impact cardio (incline walk, bike);
daily steps target. Same effort rules (close to failure) — women respond with similar relative
hypertrophy (S20). Explain in plain language, no jargon unless the user wants it.

## 15. When to modify templates

- Fewer days available → full body; more days → more split, same weekly volume.
- Beginner → lower volume, higher RIR, simpler exercises.
- Injury / pain → swap exercises, never train through sharp pain; suggest a professional.
- Energy deficit / poor sleep / high stress → volume at low end.
- Home / limited equipment → higher reps with dumbbells/bodyweight, still close to failure (S8).
- Lagging muscle → specialization (section 11).
- Performance trends → decision rules (section 13).
- User preference/adherence → an enjoyable plan that gets done beats an "optimal" plan that doesn't. [PRACTITIONER-BASED]

---

## Known gaps (be honest with users)

- No controlled studies directly compare *natural vs enhanced* programming → claims that naturals
  "need" low volume / high frequency are [INSUFFICIENT EVIDENCE]. It is plausible that naturals
  have a lower recovery ceiling, but it is not well tested.
- Most studies: ≤12 weeks, often untrained participants, small samples.
- Individual response prediction: [INSUFFICIENT EVIDENCE].
