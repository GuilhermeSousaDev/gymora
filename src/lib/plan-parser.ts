/**
 * Deterministic reader for plans written the usual way:
 *
 *   Quinta — Pernas
 *   Agachamento/hack — 3×6–10
 *   Leg press: 4 séries de 12
 *   - Panturrilha 3x10-15 (RIR 1, 60s)
 *
 * It never invents anything: what it can't read goes to `unread` so the user can see it.
 */
import { PATTERNS, normalize, patternFromName } from "./exercise-art/patterns";
import { WEEKDAYS, type Exercise, type Weekday } from "./types";

export type ParsedDay = { weekday: Weekday | null; title: string; exercises: Exercise[] };
export type ParseResult = { title: string; days: ParsedDay[]; unread: string[]; exerciseLines: number; contentLines: number };

const WEEKDAY_WORDS: [Weekday, string[]][] = [
  ["mon", ["segunda-feira", "segunda", "seg", "monday", "mon"]],
  ["tue", ["terca-feira", "terca", "ter", "tuesday", "tue", "tues"]],
  ["wed", ["quarta-feira", "quarta", "qua", "wednesday", "wed"]],
  ["thu", ["quinta-feira", "quinta", "qui", "thursday", "thu", "thurs"]],
  ["fri", ["sexta-feira", "sexta", "sex", "friday", "fri"]],
  ["sat", ["sabado", "sab", "saturday", "sat"]],
  ["sun", ["domingo", "dom", "sunday", "sun"]],
];

const NUM_RANGE = String.raw`(\d+)(?:\s*(?:-|–|—|a|to|ate|/)\s*(\d+))?`;
// "3x6-10", "3 × 8–12", "4*10"
const RE_SETS_X_REPS = new RegExp(String.raw`(\d+)\s*(?:x|×|\*)\s*${NUM_RANGE}`, "i");
// "4 séries de 12", "3 sets of 8-10", "3 series x 10"
const RE_SERIES = new RegExp(String.raw`(\d+)\s*(?:series|sets|serie|set)\s*(?:de|of|x|×|com)?\s*${NUM_RANGE}`, "i");
const RE_RIR = /rir\s*(\d+(?:[.,]\d+)?)/i;
const RE_REST_S = /(\d+)\s*(?:s|seg|sec|segundos|seconds)\b/i;
const RE_REST_MIN = /(\d+(?:[.,]\d+)?)\s*(?:min|minutos|minutes|')(?![a-z])/i;
const RE_HEADER_WORD = /^(treino|dia|day|workout|semana|week|sessao|session|upper|lower|push|pull|legs|pernas|superior|inferior|full)\b/;

const BULLET = /^\s*(?:[-*•+▪◦·]|\d+[.)]|[a-z][.)])\s+/i;

function weekdayOf(line: string): { weekday: Weekday; rest: string } | null {
  const n = normalize(line).trim();
  for (const [wd, words] of WEEKDAY_WORDS)
    for (const w of words) {
      const m = n.match(new RegExp(`^${w}(?![a-z])\\.?`));
      if (m) return { weekday: wd, rest: line.trim().slice(m[0].length) };
    }
  return null;
}

const cleanTitle = (s: string) => s.replace(/^[\s:—–\-|,.()]+|[\s:—–\-|,.()]+$/g, "").trim();

/** Accent-free copy with the same length, so match positions still slice the original text. */
const plain = (s: string) => [...s].map((c) => c.normalize("NFD")[0]).join("");

function exerciseFrom(line: string): Exercise | null {
  const p = plain(line);
  const m = p.match(RE_SETS_X_REPS) ?? p.match(RE_SERIES);
  if (!m || m.index === undefined) return null;
  let name = cleanTitle(line.slice(0, m.index));
  const after = p.slice(m.index + m[0].length);
  if (!name) name = cleanTitle(after.replace(/\(.*?\)/g, "").split(/[,;(]/)[0]);
  if (!name) return null;

  const sets = Number(m[1]);
  const repsMin = Number(m[2]);
  const repsMax = m[3] ? Number(m[3]) : repsMin;
  const rir = after.match(RE_RIR) ?? line.match(RE_RIR);
  const restS = after.match(RE_REST_S);
  const restM = after.match(RE_REST_MIN);

  const pattern = patternFromName(name);
  const muscleGroup = pattern ? PATTERNS[pattern].muscles[0] : "other";
  const compound = pattern ? ["squat", "hinge", "lunge", "leg_press", "bench_press", "incline_press", "overhead_press", "bent_row", "pull_up", "dip", "hip_thrust"].includes(pattern) : false;

  return {
    name,
    muscleGroup,
    sets,
    repsMin: Math.min(repsMin, repsMax),
    repsMax: Math.max(repsMin, repsMax),
    rir: rir ? Number(rir[1].replace(",", ".")) : compound ? 2 : 1,
    restSec: restS ? Number(restS[1]) : restM ? Math.round(Number(restM[1].replace(",", ".")) * 60) : compound ? 150 : 90,
    notes: "",
    pattern,
  };
}

export function parsePlanText(text: string): ParseResult {
  const days: ParsedDay[] = [];
  const unread: string[] = [];
  let exerciseLines = 0;
  let contentLines = 0;
  let current: ParsedDay | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(BULLET, "").replace(/\s+/g, " ").trim();
    if (!line || !/[a-zà-ú]/i.test(line)) continue;
    contentLines++;

    const ex = exerciseFrom(line);
    if (ex) {
      if (!current) {
        current = { weekday: null, title: "", exercises: [] };
        days.push(current);
      }
      current.exercises.push(ex);
      exerciseLines++;
      continue;
    }

    const wd = weekdayOf(line);
    const n = normalize(line);
    const looksLikeHeader = wd || RE_HEADER_WORD.test(n) || line.endsWith(":") || (line.length <= 40 && !/\d+\s*(?:x|×)/i.test(line));
    if (looksLikeHeader) {
      current = { weekday: wd?.weekday ?? null, title: cleanTitle(wd ? wd.rest : line), exercises: [] };
      days.push(current);
    } else {
      unread.push(raw.trim());
    }
  }

  // A heading at the very top with nothing under it is the plan's name ("Treino ABC")
  let title = "";
  if (days.length > 1 && !days[0].exercises.length && !days[0].weekday) title = days.shift()!.title;
  // Other headers with nothing under them were probably notes, not days
  const kept = days.filter((d) => d.exercises.length > 0);
  for (const d of days) if (!d.exercises.length && d.title) unread.push(d.title);
  return { title, days: kept, unread, exerciseLines, contentLines };
}

/** Days without a stated weekday get the user's training days in order (or a spread-out default). */
export function assignWeekdays<T extends { weekday: Weekday | null }>(days: T[], available: Weekday[]): (T & { weekday: Weekday })[] {
  const taken = new Set(days.map((d) => d.weekday).filter(Boolean) as Weekday[]);
  const pool = [...available, ...(["mon", "wed", "fri", "tue", "thu", "sat", "sun"] as Weekday[])].filter(
    (w, i, a) => a.indexOf(w) === i && !taken.has(w),
  );
  pool.sort((a, b) => (available.includes(a) === available.includes(b) ? 0 : available.includes(a) ? -1 : 1));
  const out = days.map((d) => ({ ...d, weekday: d.weekday ?? pool.shift() ?? "mon" }));
  return out.sort((a, b) => WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday));
}
