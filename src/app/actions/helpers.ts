import "server-only";
import { getLocale } from "next-intl/server";
import { AIError, withBudget } from "@/lib/ai/client";
import type { ActionResult } from "@/lib/action-result";

export type { ActionResult } from "@/lib/action-result";

/**
 * Runs an AI task inside the per-request time budget (Netlify cuts requests at ~30s) and turns
 * failures into a serializable result. "ai" errors carry `retryAfter` so the browser can retry.
 */
export async function runAi<T>(fn: (locale: string) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const locale = await getLocale();
    return { ok: true, data: await withBudget(() => fn(locale)) };
  } catch (err) {
    console.error("[ai action]", err instanceof AIError ? err.attempts : err);
    if (err instanceof AIError) return { ok: false, error: "ai", retryAfter: err.retryAfter };
    return { ok: false, error: "unknown" };
  }
}

const MAX_IMAGE_CHARS = 6 * 1024 * 1024;

export function isValidImageDataUrl(v: unknown): v is string {
  return typeof v === "string" && /^data:image\/(png|jpe?g|webp);base64,/.test(v) && v.length < MAX_IMAGE_CHARS;
}
