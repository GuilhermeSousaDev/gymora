import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { z } from "zod";

/*
 * Time budget per request. Netlify's gateway answers 504 after ~30s, so every AI call made while
 * handling one request shares a deadline: no wait or retry is started if it can't finish in time.
 * Instead the request fails fast with "busy, retry in N s" and the browser retries.
 */
const DEFAULT_BUDGET_MS = Number(process.env.AI_REQUEST_BUDGET_MS ?? 24_000);
/** Don't start a model call with less time than this left. */
const MIN_CALL_MS = 6_000;
const budget = new AsyncLocalStorage<{ deadline: number }>();

export function withBudget<T>(fn: () => Promise<T>, ms = DEFAULT_BUDGET_MS): Promise<T> {
  return budget.run({ deadline: Date.now() + ms }, fn);
}

/** Milliseconds left for AI work in the current request. */
export function timeLeft(): number {
  const store = budget.getStore();
  return store ? store.deadline - Date.now() : DEFAULT_BUDGET_MS;
}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
};

export class AIError extends Error {
  constructor(
    message: string,
    public readonly attempts: string[] = [],
    /** Seconds after which trying again is likely to work (rate limits, out of time) */
    public readonly retryAfter?: number,
  ) {
    super(message);
  }
}

class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly retryAfter: number | null,
  ) {
    super(`HTTP ${status}: ${body.slice(0, 400)}`);
  }
}

/** Groq's json_validate_failed error carries what the model wrote; it's often usable as-is. */
function failedGeneration(err: unknown): string | null {
  if (!(err instanceof HttpError)) return null;
  try {
    return JSON.parse(err.body)?.error?.failed_generation ?? null;
  } catch {
    return null;
  }
}

const list = (v?: string) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

function textModels() {
  return [process.env.REMOTE_AI_MODEL ?? "openai/gpt-oss-120b", ...list(process.env.REMOTE_AI_FALLBACKS)];
}

function visionModels() {
  return [process.env.REMOTE_AI_VISION_MODEL ?? "qwen/qwen3.8-27b", ...list(process.env.REMOTE_AI_VISION_FALLBACKS)];
}

/** Pull a JSON object out of a model reply (handles ```json fences and <think> blocks). */
export function extractJson(raw: string): unknown {
  let s = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in response");
  return JSON.parse(s.slice(start, end + 1));
}

/** Groq tells us how long to wait on per-minute limits (header or message). */
function retryAfterSeconds(res: Response, body: string): number | null {
  const header = Number(res.headers.get("retry-after"));
  if (Number.isFinite(header) && header > 0) return header;
  const m = body.match(/try again in (?:(\d+)m)?([\d.]+)s/i);
  return m ? Number(m[1] ?? 0) * 60 + Number(m[2]) : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type CallOpts = { json: boolean; temperature: number; maxTokens: number; effort: "low" | "medium"; timeoutMs: number };

async function callModel(model: string, messages: ChatMessage[], opts: CallOpts) {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
  };
  if (opts.json) body.response_format = { type: "json_object" };
  if (model.startsWith("openai/gpt-oss")) body.reasoning_effort = opts.effort;

  const res = await fetch(`${process.env.REMOTE_AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.REMOTE_AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts.timeoutMs),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new HttpError(res.status, text, retryAfterSeconds(res, text));
  }
  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response");
  return content;
}

/**
 * Ask the AI for JSON matching `schema`.
 * Per model: json mode -> plain mode on json_validate_failed; a short 429 is waited out once.
 * Then falls back to the next model (rate limits, server errors, bad JSON, schema mismatch).
 */
type AiOpts = { vision?: boolean; temperature?: number; maxTokens?: number; effort?: "low" | "medium" };

export async function aiJson<T extends z.ZodType>(schema: T, messages: ChatMessage[], opts: AiOpts = {}): Promise<z.infer<T>> {
  return (await aiJsonWithModel(schema, messages, opts)).data;
}

/** True when the answer came from the main model rather than a fallback. */
export function isPrimaryModel(model: string) {
  return model === textModels()[0];
}

/** Same as aiJson, but also says which model answered (fallbacks give weaker plans). */
export async function aiJsonWithModel<T extends z.ZodType>(
  schema: T,
  messages: ChatMessage[],
  opts: AiOpts = {},
): Promise<{ data: z.infer<T>; model: string }> {
  const models = opts.vision ? visionModels() : textModels();
  const attempts: string[] = [];
  // Shortest "try again in" any provider gave us, to tell the browser when to retry
  let soonest: number | undefined;
  const outOfTime = () => new AIError("Out of time for this request", attempts, Math.ceil(soonest ?? 5));

  for (const model of models) {
    // Vision models on Groq don't all support json mode; ask for JSON in the prompt instead.
    let json = !opts.vision;
    let waited = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (timeLeft() < MIN_CALL_MS) throw outOfTime();
      try {
        const raw = await callModel(model, messages, {
          json,
          temperature: opts.temperature ?? 0.4,
          maxTokens: opts.maxTokens ?? 6000,
          effort: opts.effort ?? "medium",
          timeoutMs: Math.min(90_000, timeLeft() - 500),
        });
        const parsed = schema.safeParse(extractJson(raw));
        if (!parsed.success) throw new Error(`Schema mismatch: ${parsed.error.message.slice(0, 200)}`);
        return { data: parsed.data, model };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        attempts.push(`${model}${json ? " (json)" : ""}: ${msg}`);
        console.warn(`[ai] ${model}${json ? " (json mode)" : ""} failed. ${msg.slice(0, 160)}`);

        if (json && msg.includes("json_validate_failed")) {
          // Salvage the model's answer instead of paying for the whole call again
          const salvaged = failedGeneration(err);
          if (salvaged) {
            try {
              const parsed = schema.safeParse(extractJson(salvaged));
              if (parsed.success) return { data: parsed.data, model };
            } catch {
              // not parseable: fall through to a plain-mode retry
            }
          }
          json = false; // same model, parse the JSON ourselves
          continue;
        }
        const e = err instanceof HttpError ? err : null;
        if (e?.status === 429 && e.retryAfter != null) {
          soonest = Math.min(soonest ?? Infinity, e.retryAfter);
          // Wait it out only if the call can still finish within this request's budget
          const waitMs = e.retryAfter * 1000 + 500;
          if (!waited && waitMs < timeLeft() - MIN_CALL_MS - 4_000) {
            waited = true;
            await sleep(waitMs);
            continue;
          }
        }
        // Groq answers 413 when this minute's token budget is used up (no Retry-After given)
        if (e?.status === 413 && /tokens per minute|TPM/i.test(e.body)) soonest = Math.min(soonest ?? Infinity, 20);
        if (err instanceof Error && err.name === "TimeoutError") throw outOfTime();
        break; // next model
      }
    }
  }
  throw new AIError("All AI models failed", attempts, soonest !== undefined ? Math.ceil(soonest) : undefined);
}
