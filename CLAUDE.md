@AGENTS.md

# Gymora notes

- Project lives in WSL; run node/npm via `wsl -d Ubuntu -- bash -ic "cd ~/Workspace/ideas/Gymora && ..."` (node comes from nvm).
- Local DB: `gymora-db` container, port **5434** (5432/5433 belong to other projects).
- All user-facing strings go in both `messages/en.json` and `messages/pt.json`.
- AI output is always parsed through the tolerant zod schemas in `src/lib/types.ts`; AI text must be in the user's locale.
- The training framework exists twice: `docs/training-framework.md` (full, with sources) and `src/lib/ai/framework.ts` (prompt). Keep them in sync; never cite unverified studies.
- Physique photos must never be persisted (memory only, sent to the vision model, then dropped).
- Groq free tier is rate-limited; test AI changes with `npm run ai:smoke`, one run at a time.
- Plan generation: the weekly split is chosen in code (`src/lib/splits.ts`), the AI only fills exercises; `volumeIssues` in `src/lib/ai/tasks.ts` checks volume, frequency (>=2x/week) and filler days. Check quality with `scripts/plan-quality-smoke.ts`.
- Plan import (`src/app/actions/import.ts`): deterministic parser first (`src/lib/plan-parser.ts`, test with `scripts/parser-check.ts`), AI only when the text is messy. Never change what the user wrote.

## Design ("chalk & plates", see `.claude/skills/frontend-design`)
- Tokens live in `src/app/globals.css`: chalk background, iron ink, and the competition plate colors.
- Plate colors always carry meaning, never decoration: red = working set, blue = resting, yellow/gold = cardio, green = done / go. Primary buttons are iron, not a plate color.
- Barlow Condensed (`font-display`) for headings, numbers and timers; Barlow for body text.
- Sentence case everywhere; no uppercase eyebrow labels, no "A · B · C" joins.
- Training mode is the one bold moment: the whole screen takes the phase color.

## Exercise illustrations
- Drawn in code (no image files): `src/lib/exercise-art/` (rig + poses + name matching) and `src/components/exercise-figure.tsx`.
- Every figure follows one pattern: side-view mannequin, start and end frames, target muscle in plate red, on a white tile.
- Exercise → pattern: the AI's `pattern` field, else EN/PT keywords (`patternFromName`), else the muscle's default.
- Tune poses at `/dev/exercise-art` (dev only). SVG coordinates must stay rounded (`fx`) or hydration breaks.
