# Gymora

Evidence-based training plans for **natural** (drug-free) lifters — English & Portuguese.

- **AI onboarding** — the user writes freely; the AI fills in what it can and only asks what's missing.
  Or the user pastes/uploads a plan they already have (text or image) and gets a review + an improved version to accept or reject.
- **Plans** grounded in the [Natural Bodybuilding Training Framework](docs/training-framework.md)
  (every principle labeled *evidence-supported / practitioner-based / plausible / insufficient evidence*),
  plus a code-level volume guardrail that checks weekly sets per muscle.
- **Training mode** — per-set work timer, rest timer with target + vibration, cardio timer, total time, set logging (reps, kg, RIR), resume after refresh.
- **Dashboard** — weekly sessions vs plan, training/cardio time, volume load, streak, sets per muscle vs plan, 30-day averages (session length, rest, work:rest, session RPE), 8-week time chart, estimated 1RM bests, bodyweight trend.
- **Training tab** — start any day, multiple saved plans (pick the main one), editor, generate a new plan with AI, physique **photo feedback** (photo is never stored) with optional plan changes to approve.
- **Profile** — name, password, language, all training-profile fields, redo onboarding.

## Stack

Next.js 16 (App Router, server actions) · Tailwind 4 · next-intl · Drizzle ORM + Postgres · Better Auth (email/password) · Groq (OpenAI-compatible) free models.

**Why Better Auth instead of Supabase Auth?** Local dev uses a plain Postgres container, which has no Supabase Auth.
Better Auth stores users/sessions in the same Postgres, so the exact same code runs locally and on Supabase —
in production Supabase is simply the Postgres host (`DATABASE_URL`).

## Run locally

```bash
cp .env.example .env          # fill REMOTE_AI_API_KEY and BETTER_AUTH_SECRET (openssl rand -base64 32)
npm install
npm run db:up                 # postgres:17-alpine on localhost:5434
npm run db:migrate
npm run dev                   # http://localhost:3000
```

Useful scripts: `db:generate` (after editing `src/db/schema.ts`), `db:studio`, `typecheck`, `lint`,
`ai:smoke [en|pt]` (calls the real AI: onboarding → plan → review).

## Production (Supabase)

1. Create a Supabase project → *Connect*. Set `DATABASE_URL` to the **transaction pooler** (port 6543, used by the app)
   and `DIRECT_URL` to the **session pooler** (port 5432, used by migrations).
2. `npm run db:migrate` (uses `DIRECT_URL`). All tables have Row Level Security on with no policies, so Supabase's
   public REST API can't read them; the app connects as the table owner and isn't affected.
3. Set `BETTER_AUTH_URL` to your public URL and a strong `BETTER_AUTH_SECRET`.
4. `npx tsx scripts/db-check.ts` confirms the app can reach the database and that the connection is encrypted.

### Copying local data to Supabase
Run the migrations on Supabase first, then (Supabase must be empty; it runs in one transaction):
```bash
DIRECT_URL=$(grep -E '^DIRECT_URL=' .env | cut -d= -f2- | tr -d '"')
docker exec gymora-db pg_dump -U gymora -d gymora --data-only --schema=public --no-owner --no-privileges \
  | docker exec -i -e PGURL="$DIRECT_URL" gymora-db sh -c 'psql "$PGURL" -v ON_ERROR_STOP=1 --single-transaction'
```

## AI models & limits

| Purpose | Env | Default |
|---|---|---|
| Text (onboarding, plans, reviews) | `REMOTE_AI_MODEL` + `REMOTE_AI_FALLBACKS` | `openai/gpt-oss-120b` → `openai/gpt-oss-20b` → `qwen/qwen3.8-27b` |
| Vision (physique photo, plan screenshots) | `REMOTE_AI_VISION_MODEL` + `REMOTE_AI_VISION_FALLBACKS` | `qwen/qwen3.8-27b` |

Per model: JSON mode → plain mode if JSON validation fails → wait out a short 429 once → next model.

⚠️ Groq's free tier is tight (~8k tokens/min per text model, ~1k output tokens/min for Qwen). One plan
generation uses most of a minute's budget, so several users at once will hit fallbacks/errors.
For real traffic use Groq's paid tier or point `REMOTE_AI_BASE_URL` at another OpenAI-compatible provider.

## Project map

```
docs/training-framework.md   research framework + verified sources (keep in sync with src/lib/ai/framework.ts)
messages/{en,pt}.json        translations
src/lib/ai/                  client (fallbacks), framework prompt, tasks (+ volume guardrail)
src/lib/types.ts             zod schemas for profile / plan / AI outputs (tolerant parsing)
src/lib/data.ts              server-only queries + dashboard metrics
src/app/actions/             server actions (onboarding, plans, sessions, profile, locale)
src/app/onboarding/          onboarding wizard
src/app/(app)/               dashboard, training, plan editor, session detail, profile
src/app/workout/[id]/        training mode (full screen)
```

## Known limitations

- Week boundaries and "today" use the server's timezone.
- Plan-edit history is not versioned (applying AI changes overwrites the main plan unless "Save as new plan" is chosen).
- Practitioner claims (e.g. Jaime de la Madrid) are described generically in the framework — not yet attributed to specific sources.
