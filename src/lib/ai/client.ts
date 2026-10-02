import "server-only";
import type { z } from "zod";

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
  ) {
    super(message);
  }
}

class HttpError extends Error {
  constructor(
    public readonly status: number,
    body: string,
    public readonly retryAfter: number | null,
  ) {
    super(`HTTP ${status}: ${body}`);
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

/** Max wait for a short per-minute rate limit before falling back to the next model. */
const MAX_RATE_LIMIT_WAIT_S = 25;

type CallOpts = { json: boolean; temperature: number; maxTokens: number; effort: "low" | "medium" };

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
    signal: AbortSignal.timeout(90_000),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new HttpError(res.status, text.slice(0, 400), retryAfterSeconds(res, text));
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

  for (const model of models) {
    // Vision models on Groq don't all support json mode; ask for JSON in the prompt instead.
    let json = !opts.vision;
    let waited = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const raw = await callModel(model, messages, {
          json,
          temperature: opts.temperature ?? 0.4,
          maxTokens: opts.maxTokens ?? 6000,
          effort: opts.effort ?? "medium",
        });
        const parsed = schema.safeParse(extractJson(raw));
        if (!parsed.success) throw new Error(`Schema mismatch: ${parsed.error.message.slice(0, 200)}`);
        return { data: parsed.data, model };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        attempts.push(`${model}${json ? " (json)" : ""}: ${msg}`);
        console.warn(`[ai] ${model}${json ? " (json mode)" : ""} failed. ${msg.slice(0, 160)}`);

        if (json && msg.includes("json_validate_failed")) {
          json = false; // same model, parse the JSON ourselves
          continue;
        }
        const e = err instanceof HttpError ? err : null;
        if (e?.status === 429 && !waited && e.retryAfter != null && e.retryAfter <= MAX_RATE_LIMIT_WAIT_S) {
          waited = true;
          await sleep(e.retryAfter * 1000 + 500);
          continue;
        }
        break; // next model
      }
    }
  }
  throw new AIError("All AI models failed", attempts);
}
