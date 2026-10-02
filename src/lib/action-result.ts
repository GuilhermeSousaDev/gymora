/** What every server action returns. Shared by server and browser code. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: "ai" | "invalid" | "unknown"; /** seconds until a retry is likely to work */ retryAfter?: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Calls an AI action and, when the AI is busy, waits and tries again (up to `tries` times).
 * `onWait(seconds)` drives a countdown in the UI; it's called with 0 when retrying starts.
 */
export async function withAiRetry<T>(
  call: () => Promise<ActionResult<T>>,
  onWait: (seconds: number) => void,
  tries = 3,
): Promise<ActionResult<T>> {
  for (let i = 0; ; i++) {
    const res = await call();
    if (res.ok || res.error !== "ai" || i >= tries - 1) return res;
    const seconds = Math.min(Math.max(res.retryAfter ?? 8, 3), 45);
    for (let s = seconds; s > 0; s--) {
      onWait(s);
      await sleep(1000);
    }
    onWait(0);
  }
}
