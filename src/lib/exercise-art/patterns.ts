import type { P, Pose } from "./figure";
import { PATTERN_IDS, type PatternId } from "./ids";

export type Hold = "barbell" | "dumbbell" | "handle" | "none";

/** Static scenery drawn behind the figure (same in both frames). */
export type Prop =
  | { k: "bench"; x1: number; x2: number; y: number }
  | { k: "pad"; from: P; to: P; w?: number }
  | { k: "post"; from: P; to: P }
  | { k: "bar"; at: P };

/** Things attached to the body, resolved per frame. */
export type Attach = "rollerFront" | "rollerBack" | "barOnHips" | "footPlate";

export type Pattern = {
  frames: [Pose, Pose];
  hold: Hold;
  /** Cable pulley position; when set, a cable runs from the hand to it */
  anchor?: P;
  /** Pulley to use if the exercise name says "cable" */
  cableAnchor?: P;
  props?: Prop[];
  attach?: Attach[];
  muscles: string[];
};

const STAND: P = [100, 184];

export const PATTERNS: Record<PatternId, Pattern> = {
  squat: {
    hold: "barbell",
    muscles: ["quads", "glutes"],
    frames: [
      { ankle: [104, 184], torso: 10, leg: { thigh: 0, shin: 0 }, arm: { upper: -20, fore: 172 } },
      { ankle: [104, 184], torso: 42, leg: { thigh: 82, shin: -22 }, arm: { upper: 12, fore: 205 } },
    ],
  },
  hinge: {
    hold: "barbell",
    muscles: ["hamstrings", "glutes"],
    frames: [
      { ankle: STAND, torso: 4, leg: { thigh: 2, shin: 0 }, arm: { upper: 0, fore: 0 } },
      { ankle: STAND, torso: 68, leg: { thigh: 40, shin: -5 }, arm: { upper: -15, fore: -15 } },
    ],
  },
  lunge: {
    hold: "dumbbell",
    muscles: ["quads", "glutes"],
    frames: [
      { ankle: [122, 184], torso: 2, leg: { thigh: 18, shin: 12 }, farLeg: { thigh: -20, shin: -15, foot: 60 }, arm: { upper: 0, fore: 0 } },
      { ankle: [122, 184], torso: 5, leg: { thigh: 80, shin: 0 }, farLeg: { thigh: -5, shin: -95, foot: 10 }, arm: { upper: 0, fore: 0 } },
    ],
  },
  leg_press: {
    hold: "none",
    muscles: ["quads", "glutes"],
    props: [
      { k: "pad", from: [62, 160], to: [18, 116] },
      { k: "pad", from: [60, 162], to: [96, 162] },
      { k: "post", from: [78, 164], to: [78, 188] },
    ],
    attach: ["footPlate"],
    frames: [
      { hip: [70, 150], torso: -45, leg: { thigh: 118, shin: 112, foot: 200 }, arm: { upper: 30, fore: 80 } },
      { hip: [70, 150], torso: -45, leg: { thigh: 160, shin: 58, foot: 150 }, arm: { upper: 30, fore: 80 } },
    ],
  },
  leg_extension: {
    hold: "none",
    muscles: ["quads"],
    props: [
      { k: "pad", from: [72, 155], to: [128, 155] },
      { k: "pad", from: [72, 150], to: [66, 94] },
      { k: "post", from: [95, 159], to: [95, 188] },
    ],
    attach: ["rollerFront"],
    frames: [
      { hip: [88, 140], torso: -8, leg: { thigh: 92, shin: 5 }, arm: { upper: 5, fore: 40 } },
      { hip: [88, 140], torso: -8, leg: { thigh: 92, shin: 80 }, arm: { upper: 5, fore: 40 } },
    ],
  },
  leg_curl_seated: {
    hold: "none",
    muscles: ["hamstrings"],
    props: [
      { k: "pad", from: [72, 155], to: [128, 155] },
      { k: "pad", from: [70, 150], to: [60, 94] },
      { k: "post", from: [95, 159], to: [95, 188] },
    ],
    attach: ["rollerBack"],
    frames: [
      { hip: [88, 140], torso: -12, leg: { thigh: 92, shin: 78 }, arm: { upper: 5, fore: 40 } },
      { hip: [88, 140], torso: -12, leg: { thigh: 92, shin: -15 }, arm: { upper: 5, fore: 40 } },
    ],
  },
  leg_curl_lying: {
    hold: "none",
    muscles: ["hamstrings"],
    props: [{ k: "bench", x1: 38, x2: 176, y: 163 }],
    attach: ["rollerBack"],
    frames: [
      { hip: [95, 150], torso: 90, leg: { thigh: -90, shin: -90, foot: 0 }, arm: { upper: 10, fore: 30 } },
      { hip: [95, 150], torso: 90, leg: { thigh: -90, shin: 165, foot: 255 }, arm: { upper: 10, fore: 30 } },
    ],
  },
  hip_thrust: {
    hold: "none",
    muscles: ["glutes"],
    props: [{ k: "bench", x1: 8, x2: 62, y: 152 }],
    attach: ["barOnHips"],
    frames: [
      { ankle: [150, 184], torso: -64.5, leg: { thigh: 120, shin: 0 }, arm: { upper: 70, fore: 50 } },
      { ankle: [150, 184], torso: -84, leg: { thigh: 90, shin: -3 }, arm: { upper: 88, fore: 80 } },
    ],
  },
  hip_abduction: {
    hold: "none",
    muscles: ["glutes"],
    frames: [
      { view: "front", hip: [100, 106], arms: 8, legs: [3, 3] },
      { view: "front", hip: [100, 106], arms: 8, legs: [34, 3] },
    ],
  },
  calf_raise: {
    hold: "dumbbell",
    muscles: ["calves"],
    frames: [
      { ankle: [100, 184], torso: 0, leg: { thigh: 0, shin: 0, foot: 90 }, arm: { upper: 0, fore: 0 } },
      { ankle: [100, 176], torso: 0, leg: { thigh: 0, shin: 0, foot: 40 }, arm: { upper: 0, fore: 0 } },
    ],
  },
  bench_press: {
    hold: "barbell",
    muscles: ["chest"],
    props: [{ k: "bench", x1: 28, x2: 140, y: 159 }],
    frames: [
      { hip: [125, 146], torso: -90, leg: { thigh: 90, shin: 0 }, arm: { upper: 180, fore: 180 } },
      { hip: [125, 146], torso: -90, leg: { thigh: 90, shin: 0 }, arm: { upper: 70, fore: -153 } },
    ],
  },
  incline_press: {
    hold: "dumbbell",
    muscles: ["chest"],
    props: [
      { k: "pad", from: [110, 158], to: [44, 111] },
      { k: "pad", from: [104, 159], to: [138, 159] },
      { k: "post", from: [120, 162], to: [120, 188] },
    ],
    frames: [
      { hip: [118, 146], torso: -55, leg: { thigh: 90, shin: 0 }, arm: { upper: 175, fore: 178 } },
      { hip: [118, 146], torso: -55, leg: { thigh: 90, shin: 0 }, arm: { upper: 60, fore: -147 } },
    ],
  },
  chest_fly: {
    hold: "handle",
    muscles: ["chest"],
    anchor: [30, 30],
    props: [{ k: "post", from: [30, 30], to: [30, 188] }],
    frames: [
      { ankle: [104, 184], torso: 12, leg: { thigh: 0, shin: 0 }, farLeg: { thigh: -8, shin: -8 }, arm: { upper: -60, fore: -50 } },
      { ankle: [104, 184], torso: 12, leg: { thigh: 0, shin: 0 }, farLeg: { thigh: -8, shin: -8 }, arm: { upper: 55, fore: 75 } },
    ],
  },
  push_up: {
    hold: "none",
    muscles: ["chest"],
    frames: [
      { ankle: [30, 175], torso: 71.1, leg: { thigh: -71.1, shin: -71.1, foot: 10 }, arm: { upper: 0, fore: 0 } },
      { ankle: [30, 175], torso: 85, leg: { thigh: -85, shin: -85, foot: 10 }, arm: { upper: -80, fore: 49 } },
    ],
  },
  dip: {
    hold: "none",
    muscles: ["chest", "triceps"],
    props: [
      { k: "post", from: [108, 97], to: [108, 188] },
      { k: "bar", at: [108, 97] },
    ],
    frames: [
      { hip: [100, 95], torso: 8, leg: { thigh: 15, shin: -50 }, arm: { upper: 0, fore: 0 } },
      { hip: [96, 120], torso: 22, leg: { thigh: 20, shin: -45 }, arm: { upper: -80, fore: 45 } },
    ],
  },
  overhead_press: {
    hold: "barbell",
    muscles: ["shoulders"],
    frames: [
      { ankle: STAND, torso: -2, leg: { thigh: 0, shin: 0 }, arm: { upper: 25, fore: 172 } },
      { ankle: STAND, torso: -2, leg: { thigh: 0, shin: 0 }, arm: { upper: 174, fore: 179 } },
    ],
  },
  lateral_raise: {
    hold: "dumbbell",
    muscles: ["shoulders"],
    frames: [
      { view: "front", hip: [100, 106], arms: 12, legs: [4, 4] },
      { view: "front", hip: [100, 106], arms: 86, legs: [4, 4] },
    ],
  },
  face_pull: {
    hold: "handle",
    muscles: ["shoulders", "back"],
    anchor: [182, 50],
    props: [{ k: "post", from: [182, 50], to: [182, 188] }],
    frames: [
      { ankle: [96, 184], torso: -5, leg: { thigh: 0, shin: 0 }, farLeg: { thigh: -8, shin: -8 }, arm: { upper: 88, fore: 90 } },
      { ankle: [96, 184], torso: -5, leg: { thigh: 0, shin: 0 }, farLeg: { thigh: -8, shin: -8 }, arm: { upper: -70, fore: 120 } },
    ],
  },
  bent_row: {
    hold: "barbell",
    muscles: ["back"],
    cableAnchor: [190, 170],
    frames: [
      { ankle: STAND, torso: 70, leg: { thigh: 35, shin: -8 }, arm: { upper: 0, fore: 0 } },
      { ankle: STAND, torso: 70, leg: { thigh: 35, shin: -8 }, arm: { upper: -80, fore: 5 } },
    ],
  },
  seated_row: {
    hold: "handle",
    muscles: ["back"],
    anchor: [190, 150],
    props: [
      { k: "pad", from: [28, 170], to: [84, 170] },
      { k: "post", from: [56, 174], to: [56, 188] },
      { k: "post", from: [190, 150], to: [190, 188] },
      { k: "pad", from: [148, 164], to: [148, 186], w: 5 },
    ],
    frames: [
      { hip: [60, 158], torso: 18, leg: { thigh: 82, shin: 70, foot: 160 }, arm: { upper: 80, fore: 85 } },
      { hip: [60, 158], torso: -5, leg: { thigh: 82, shin: 70, foot: 160 }, arm: { upper: -50, fore: 85 } },
    ],
  },
  pulldown: {
    hold: "handle",
    muscles: ["back"],
    anchor: [100, 4],
    props: [
      { k: "pad", from: [70, 160], to: [118, 160] },
      { k: "post", from: [92, 164], to: [92, 188] },
    ],
    frames: [
      { hip: [95, 150], torso: -10, leg: { thigh: 88, shin: 0 }, arm: { upper: 172, fore: 178 } },
      { hip: [95, 150], torso: -10, leg: { thigh: 88, shin: 0 }, arm: { upper: -10, fore: 172 } },
    ],
  },
  pull_up: {
    hold: "none",
    muscles: ["back"],
    props: [{ k: "bar", at: [110, 20] }],
    frames: [
      { hip: [115, 135], torso: -5, leg: { thigh: 5, shin: -25 }, arm: { upper: 180, fore: 180 } },
      { hip: [112, 103], torso: -8, leg: { thigh: 8, shin: -25 }, arm: { upper: 110, fore: -125 } },
    ],
  },
  curl: {
    hold: "dumbbell",
    muscles: ["biceps"],
    cableAnchor: [150, 182],
    frames: [
      { ankle: STAND, torso: 0, leg: { thigh: 0, shin: 0 }, arm: { upper: 0, fore: 0 } },
      { ankle: STAND, torso: 0, leg: { thigh: 0, shin: 0 }, arm: { upper: 8, fore: 160 } },
    ],
  },
  pushdown: {
    hold: "handle",
    muscles: ["triceps"],
    anchor: [150, 8],
    props: [{ k: "post", from: [150, 8], to: [150, 188] }],
    frames: [
      { ankle: [96, 184], torso: 8, leg: { thigh: 0, shin: 0 }, arm: { upper: 5, fore: 130 } },
      { ankle: [96, 184], torso: 8, leg: { thigh: 0, shin: 0 }, arm: { upper: 5, fore: 8 } },
    ],
  },
  overhead_triceps: {
    hold: "dumbbell",
    muscles: ["triceps"],
    cableAnchor: [34, 172],
    frames: [
      { ankle: STAND, torso: 0, leg: { thigh: 0, shin: 0 }, arm: { upper: 168, fore: -15 } },
      { ankle: STAND, torso: 0, leg: { thigh: 0, shin: 0 }, arm: { upper: 168, fore: 176 } },
    ],
  },
  skullcrusher: {
    hold: "barbell",
    muscles: ["triceps"],
    props: [{ k: "bench", x1: 28, x2: 140, y: 159 }],
    frames: [
      { hip: [125, 146], torso: -90, leg: { thigh: 90, shin: 0 }, arm: { upper: 180, fore: 180 } },
      { hip: [125, 146], torso: -90, leg: { thigh: 90, shin: 0 }, arm: { upper: -170, fore: -60 } },
    ],
  },
  crunch: {
    hold: "none",
    muscles: ["abs"],
    frames: [
      { hip: [110, 175], torso: -90, leg: { thigh: 145, shin: 25, foot: 90 }, arm: { upper: 100, fore: 100 } },
      { hip: [110, 175], torso: -58, leg: { thigh: 145, shin: 25, foot: 90 }, arm: { upper: 105, fore: 105 } },
    ],
  },
  plank: {
    hold: "none",
    muscles: ["abs"],
    frames: [
      { ankle: [30, 175], torso: 82, leg: { thigh: -82, shin: -82, foot: 10 }, arm: { upper: 0, fore: 90 } },
      { ankle: [30, 175], torso: 82, leg: { thigh: -82, shin: -82, foot: 10 }, arm: { upper: 0, fore: 90 } },
    ],
  },
  leg_raise: {
    hold: "none",
    muscles: ["abs"],
    props: [{ k: "bar", at: [100, 20] }],
    frames: [
      { hip: [100, 134.8], torso: 0, leg: { thigh: 0, shin: 0 }, arm: { upper: 180, fore: 180 } },
      { hip: [108.1, 134.2], torso: -8, leg: { thigh: 95, shin: 95 }, arm: { upper: 172, fore: 178 } },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Name -> pattern (English + Portuguese). Order matters: specific first */
/* ------------------------------------------------------------------ */

const KEYWORDS: [PatternId, string[]][] = [
  ["hip_thrust", ["hip thrust", "glute bridge", "elevacao pelvica", "elevacao de quadril", "ponte"]],
  ["leg_curl_seated", ["seated leg curl", "seated hamstring curl", "flexora sentad", "cadeira flexora"]],
  ["leg_curl_lying", ["leg curl", "hamstring curl", "flexora", "mesa flexora"]],
  ["leg_extension", ["leg extension", "extensora"]],
  ["leg_press", ["leg press"]],
  ["calf_raise", ["calf", "panturrilha", "gemeos"]],
  ["hip_abduction", ["abduct", "abducao", "abdutora"]],
  ["lunge", ["lunge", "split squat", "bulgarian", "afundo", "passada", "bulgaro", "avanco", "step up", "step-up"]],
  ["hinge", ["romanian", "rdl", "stiff", "deadlift", "levantamento terra", "good morning", "bom dia"]],
  ["squat", ["squat", "agachamento", "hack", "goblet"]],
  ["leg_raise", ["leg raise", "knee raise", "elevacao de pernas", "elevacao de joelhos"]],
  ["curl", ["curl", "rosca"]],
  ["skullcrusher", ["skull", "lying triceps", "triceps testa", "testa"]],
  ["overhead_triceps", ["overhead triceps", "overhead extension", "triceps frances", "frances", "acima da cabeca", "overhead cable"]],
  ["pushdown", ["pushdown", "push down", "pressdown", "triceps pulley", "triceps corda", "extensao de triceps", "triceps extension", "triceps na polia", "triceps polia", "kickback", "coice"]],
  ["dip", ["dip", "mergulho", "paralelas"]],
  ["push_up", ["push-up", "push up", "pushup", "flexao"]],
  ["chest_fly", ["fly", "flye", "crossover", "crucifixo", "pec deck", "peck deck", "voador"]],
  ["face_pull", ["face pull", "rear delt", "reverse fly", "posterior de ombro", "crucifixo inverso", "deltoide posterior"]],
  ["lateral_raise", ["lateral raise", "side raise", "elevacao lateral", "lateral"]],
  ["pull_up", ["pull-up", "pull up", "pullup", "chin-up", "chin up", "barra fixa"]],
  ["pulldown", ["pulldown", "pull-down", "puxada", "pullover"]],
  ["seated_row", ["seated row", "cable row", "seated cable", "remada sentad", "remada baixa", "remada no cabo", "remada na polia"]],
  ["bent_row", ["row", "remada", "shrug", "encolhimento"]],
  ["overhead_press", ["overhead press", "shoulder press", "military", "desenvolvimento", "arnold", "ohp", "front raise", "elevacao frontal"]],
  ["incline_press", ["incline", "inclinado"]],
  ["bench_press", ["bench", "supino", "chest press", "press de peito"]],
  ["crunch", ["crunch", "abdominal", "sit-up", "situp", "sit up"]],
  ["plank", ["plank", "prancha"]],
];

const BY_MUSCLE: Record<string, PatternId> = {
  chest: "bench_press",
  back: "pulldown",
  shoulders: "overhead_press",
  biceps: "curl",
  triceps: "pushdown",
  forearms: "curl",
  abs: "crunch",
  glutes: "hip_thrust",
  quads: "squat",
  hamstrings: "hinge",
  calves: "calf_raise",
};

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

// Keywords must start a word: "lateral" must not match "unilateral", "row" must not match "narrow"
const MATCHERS: [PatternId, RegExp[]][] = KEYWORDS.map(([id, words]) => [
  id,
  words.map((w) => new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")}`)),
]);

export function patternFromName(name: string): PatternId | null {
  const n = normalize(name);
  for (const [id, res] of MATCHERS) if (res.some((r) => r.test(n))) return id;
  return null;
}

/**
 * Names whose meaning is settled regardless of what the AI tagged.
 * "Tríceps francês" / "French press" is the overhead extension in Brazilian gyms (unless it says lying).
 */
const NAME_OVERRIDES: [RegExp, PatternId][] = [[/(^|[^a-z])(triceps frances|frances|french press)(?!.*(deitado|lying|banco))/, "overhead_triceps"]];

export function resolvePattern(ex: { name: string; muscleGroup: string; pattern?: string | null }): PatternId {
  const n = normalize(ex.name);
  for (const [re, id] of NAME_OVERRIDES) if (re.test(n)) return id;
  if (ex.pattern && (PATTERN_IDS as readonly string[]).includes(ex.pattern)) return ex.pattern as PatternId;
  return patternFromName(ex.name) ?? BY_MUSCLE[ex.muscleGroup] ?? "squat";
}

/** Equipment named in the exercise, if any. */
export function implementFromName(name: string): "barbell" | "dumbbell" | "cable" | "machine" | null {
  const n = normalize(name);
  if (/cable|polia|cabo|crossover|pulley|corda/.test(n)) return "cable";
  if (/dumbbell|halter|\bdb\b/.test(n)) return "dumbbell";
  if (/machine|maquina|smith|hammer strength|articulad/.test(n)) return "machine";
  if (/barbell|barra(?! fixa)|\bbar\b|\bez\b/.test(n)) return "barbell";
  return null;
}
