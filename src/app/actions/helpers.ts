import "server-only";
import { getLocale } from "next-intl/server";
import { AIError } from "@/lib/ai/client";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: "ai" | "invalid" | "unknown" };

/** Runs an AI task and turns failures into a serializable result. */
export async function runAi<T>(fn: (locale: string) => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn(await getLocale()) };
  } catch (err) {
    console.error("[ai action]", err instanceof AIError ? err.attempts : err);
    return { ok: false, error: err instanceof AIError ? "ai" : "unknown" };
  }
}

const MAX_IMAGE_CHARS = 6 * 1024 * 1024;

export function isValidImageDataUrl(v: unknown): v is string {
  return typeof v === "string" && /^data:image\/(png|jpe?g|webp);base64,/.test(v) && v.length < MAX_IMAGE_CHARS;
}
