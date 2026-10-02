import type { ReactNode } from "react";
import { add, FLOOR, lerp, solve, sub, type FrontJoints, type P, type SideJoints } from "@/lib/exercise-art/figure";
import { implementFromName, PATTERNS, resolvePattern, type Attach, type Hold, type Pattern, type Prop } from "@/lib/exercise-art/patterns";
import { cn } from "./ui";

/*
 * One visual language for every exercise: a neutral mannequin seen from the side, start and end
 * frames side by side, the target muscle in plate red. Colors are fixed so thumbnails look the
 * same on any background (they always sit on a paper-white tile).
 */
const C = {
  body: "#aab3bd",
  near: "#96a1ac",
  far: "#cdd3d9",
  hl: "#c8302a",
  iron: "#18212b",
  machine: "#5a6571",
  floor: "#d6dad7",
};
const W = { torso: 26, neck: 9, upper: 11.5, fore: 9.5, thigh: 16, shin: 12, foot: 6 };

/** Round coordinates: server and browser trig differ in the last digits (hydration mismatch). */
const fx = (n: number) => Math.round(n * 10) / 10;
const pts = (...ps: P[]) => ps.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");
const unit = (a: P, b: P): P => {
  const d = sub(b, a);
  const l = Math.hypot(d[0], d[1]) || 1;
  return [d[0] / l, d[1] / l];
};
/** "Front" side of a limb running from a to b (for a limb hanging down, that's the side facing right). */
const frontNormal = (a: P, b: P): P => {
  const d = unit(a, b);
  return [d[1], -d[0]];
};

function Seg({ a, b, w, color }: { a: P; b: P; w: number; color: string }) {
  return <polyline points={pts(a, b)} stroke={color} strokeWidth={w} strokeLinecap="round" fill="none" />;
}

/** A red strip along one side of a limb segment. side: 1 = front, -1 = back, 0 = centered. */
function Strip({ a, b, from, to, side, offset, w, color = C.hl }: { a: P; b: P; from: number; to: number; side: number; offset: number; w: number; color?: string }) {
  const n = frontNormal(a, b);
  const o: P = [n[0] * offset * side, n[1] * offset * side];
  return <Seg a={add(lerp(a, b, from), o)} b={add(lerp(a, b, to), o)} w={w} color={color} />;
}

function sideHighlights(j: SideJoints, muscles: string[]): ReactNode[] {
  const out: ReactNode[] = [];
  const { hip, shoulder } = j;
  const { elbow, hand, knee, ankle } = j.near;
  for (const m of muscles) {
    // Torso strips run shoulder -> hip, so "front" is the chest side
    if (m === "chest") out.push(<Strip key={m} a={shoulder} b={hip} from={0.08} to={0.42} side={1} offset={6.5} w={12} />);
    if (m === "back") out.push(<Strip key={m} a={shoulder} b={hip} from={0.05} to={0.55} side={-1} offset={6.5} w={12} />);
    if (m === "abs") out.push(<Strip key={m} a={shoulder} b={hip} from={0.48} to={0.9} side={1} offset={7} w={10} />);
    if (m === "glutes") {
      const n = frontNormal(shoulder, hip);
      out.push(<circle key={m} cx={fx(hip[0] - n[0] * 8)} cy={fx(hip[1] - n[1] * 8)} r={8.5} fill={C.hl} />);
    }
    if (m === "quads") out.push(<Strip key={m} a={hip} b={knee} from={0.15} to={0.88} side={1} offset={3.5} w={9} />);
    if (m === "hamstrings") out.push(<Strip key={m} a={hip} b={knee} from={0.2} to={0.88} side={-1} offset={3.5} w={9} />);
    if (m === "calves") out.push(<Strip key={m} a={knee} b={ankle} from={0.12} to={0.55} side={-1} offset={2.5} w={8} />);
    if (m === "biceps") out.push(<Strip key={m} a={shoulder} b={elbow} from={0.2} to={0.85} side={1} offset={2.5} w={6.5} />);
    if (m === "triceps") out.push(<Strip key={m} a={shoulder} b={elbow} from={0.15} to={0.85} side={-1} offset={2.5} w={6.5} />);
    if (m === "forearms") out.push(<Strip key={m} a={elbow} b={hand} from={0.1} to={0.75} side={0} offset={0} w={7} />);
    if (m === "shoulders") out.push(<circle key={m} cx={fx(shoulder[0])} cy={fx(shoulder[1])} r={7.5} fill={C.hl} />);
  }
  return out;
}

function holdAt(hand: P, hold: Hold, key: string, far = false): ReactNode {
  const color = far ? "#5b646e" : C.iron;
  if (hold === "barbell")
    return (
      <g key={key}>
        <circle cx={fx(hand[0])} cy={fx(hand[1])} r={13} fill={color} />
        <circle cx={fx(hand[0])} cy={fx(hand[1])} r={3} fill="#eef0ec" />
      </g>
    );
  if (hold === "dumbbell") return <circle key={key} cx={fx(hand[0])} cy={fx(hand[1])} r={6.5} fill={color} />;
  if (hold === "handle") return <circle key={key} cx={fx(hand[0])} cy={fx(hand[1])} r={3.5} fill={color} />;
  return null;
}

function propEl(p: Prop, i: number): ReactNode {
  switch (p.k) {
    case "bench":
      return (
        <g key={i}>
          <Seg a={[p.x1 + 3, p.y + 4]} b={[p.x2 - 3, p.y + 4]} w={8} color={C.machine} />
          <Seg a={[p.x1 + 12, p.y + 8]} b={[p.x1 + 12, FLOOR]} w={3} color={C.machine} />
          <Seg a={[p.x2 - 12, p.y + 8]} b={[p.x2 - 12, FLOOR]} w={3} color={C.machine} />
        </g>
      );
    case "pad":
      return <Seg key={i} a={p.from} b={p.to} w={p.w ?? 8} color={C.machine} />;
    case "post":
      return <Seg key={i} a={p.from} b={p.to} w={2.5} color={C.machine} />;
    case "bar":
      return <Seg key={i} a={[p.at[0] - 24, p.at[1]]} b={[p.at[0] + 24, p.at[1]]} w={4} color={C.iron} />;
  }
}

function attachEl(a: Attach, j: SideJoints): ReactNode {
  const { knee, ankle, toe } = j.near;
  if (a === "rollerFront" || a === "rollerBack") {
    const n = frontNormal(knee, ankle);
    const s = a === "rollerFront" ? 1 : -1;
    const at = add(lerp(knee, ankle, 0.85), [n[0] * 11 * s, n[1] * 11 * s]);
    return <circle key={a} cx={fx(at[0])} cy={fx(at[1])} r={6} fill={C.machine} />;
  }
  if (a === "barOnHips") {
    const n = frontNormal(j.shoulder, j.hip);
    const at = add(j.hip, [n[0] * 17, n[1] * 17]);
    return (
      <g key={a}>
        <circle cx={fx(at[0])} cy={fx(at[1])} r={13} fill={C.iron} />
        <circle cx={fx(at[0])} cy={fx(at[1])} r={3} fill="#eef0ec" />
      </g>
    );
  }
  // footPlate: a plate under the sole, perpendicular to the shin
  const d = unit(knee, ankle);
  const n = frontNormal(knee, ankle);
  const c = add(lerp(ankle, toe, 0.5), [d[0] * 6, d[1] * 6]);
  return <Seg key={a} a={add(c, [n[0] * 20, n[1] * 20])} b={add(c, [-n[0] * 20, -n[1] * 20])} w={6} color={C.machine} />;
}

function SideFrame({ j, pattern, hold, anchor, muscles }: { j: SideJoints; pattern: Pattern; hold: Hold; anchor?: P; muscles: string[] }) {
  const f = j.far;
  const n = j.near;
  return (
    <>
      {pattern.props?.map(propEl)}
      {/* far side */}
      <Seg a={f.hip} b={f.knee} w={W.thigh} color={C.far} />
      <Seg a={f.knee} b={f.ankle} w={W.shin} color={C.far} />
      <Seg a={f.heel} b={f.toe} w={W.foot} color={C.far} />
      <Seg a={f.shoulder} b={f.elbow} w={W.upper} color={C.far} />
      <Seg a={f.elbow} b={f.hand} w={W.fore} color={C.far} />
      {hold === "dumbbell" && holdAt(f.hand, hold, "fh", true)}
      {/* body */}
      <Seg a={j.hip} b={j.shoulder} w={W.torso} color={C.body} />
      <Seg a={j.shoulder} b={j.neck} w={W.neck} color={C.body} />
      <circle cx={fx(j.head[0])} cy={fx(j.head[1])} r={10.5} fill={C.body} />
      {/* near side */}
      <Seg a={j.hip} b={n.knee} w={W.thigh} color={C.near} />
      <Seg a={n.knee} b={n.ankle} w={W.shin} color={C.near} />
      <Seg a={n.heel} b={n.toe} w={W.foot} color={C.near} />
      {sideHighlights(j, muscles.filter((m) => !["biceps", "triceps", "forearms", "shoulders"].includes(m)))}
      <Seg a={j.shoulder} b={n.elbow} w={W.upper} color={C.near} />
      <Seg a={n.elbow} b={n.hand} w={W.fore} color={C.near} />
      {sideHighlights(j, muscles.filter((m) => ["biceps", "triceps", "forearms", "shoulders"].includes(m)))}
      {pattern.attach?.map((a) => attachEl(a, j))}
      {anchor && (
        <>
          <line x1={fx(n.hand[0])} y1={fx(n.hand[1])} x2={fx(anchor[0])} y2={fx(anchor[1])} stroke={C.iron} strokeWidth={1.5} />
          <circle cx={fx(anchor[0])} cy={fx(anchor[1])} r={4.5} fill={C.machine} />
        </>
      )}
      {holdAt(n.hand, hold, "nh")}
    </>
  );
}

function FrontFrame({ j, hold, muscles }: { j: FrontJoints; hold: Hold; muscles: string[] }) {
  const [sl, sr] = j.shoulders;
  const [hl, hr] = j.hips;
  return (
    <>
      {[0, 1].map((i) => (
        <g key={`leg${i}`}>
          <Seg a={j.hips[i]} b={j.knees[i]} w={W.thigh} color={C.near} />
          <Seg a={j.knees[i]} b={j.ankles[i]} w={W.shin} color={C.near} />
          <Seg a={j.ankles[i]} b={add(j.ankles[i], [i ? 5 : -5, 1])} w={W.foot} color={C.near} />
        </g>
      ))}
      <polygon points={pts(add(sl, [-6, -4]), add(sr, [6, -4]), add(hr, [5, 4]), add(hl, [-5, 4]))} fill={C.body} strokeLinejoin="round" stroke={C.body} strokeWidth={8} />
      <Seg a={j.neck} b={[j.neck[0], j.neck[1] + 8]} w={W.neck} color={C.body} />
      <circle cx={fx(j.head[0])} cy={fx(j.head[1])} r={10.5} fill={C.body} />
      {muscles.includes("glutes") && j.hips.map((h, i) => <circle key={`g${i}`} cx={fx(h[0] + (i ? 7 : -7))} cy={fx(h[1] - 2)} r={6} fill={C.hl} />)}
      {muscles.includes("quads") &&
        [0, 1].map((i) => <Strip key={`q${i}`} a={j.hips[i]} b={j.knees[i]} from={0.15} to={0.85} side={0} offset={0} w={9} />)}
      {[0, 1].map((i) => (
        <g key={`arm${i}`}>
          <Seg a={j.shoulders[i]} b={j.elbows[i]} w={W.upper} color={C.near} />
          <Seg a={j.elbows[i]} b={j.hands[i]} w={W.fore} color={C.near} />
          {muscles.includes("shoulders") && <circle cx={fx(j.shoulders[i][0])} cy={fx(j.shoulders[i][1])} r={7.5} fill={C.hl} />}
          {holdAt(j.hands[i], hold, `h${i}`)}
        </g>
      ))}
    </>
  );
}

export function ExerciseFigure({
  name,
  muscle,
  pattern: patternId,
  className,
}: {
  name: string;
  muscle?: string;
  pattern?: string | null;
  className?: string;
}) {
  const id = resolvePattern({ name, muscleGroup: muscle ?? "", pattern: patternId });
  const pattern = PATTERNS[id];
  const muscles = muscle && muscle !== "other" ? [muscle] : pattern.muscles;

  // Equipment named in the exercise overrides the pattern default where it makes sense
  const impl = implementFromName(name);
  let hold = pattern.hold;
  let anchor = pattern.anchor;
  if (impl === "cable" && !anchor && pattern.cableAnchor) {
    anchor = pattern.cableAnchor;
    hold = "handle";
  } else if (impl === "dumbbell" && hold === "barbell") hold = "dumbbell";
  else if (impl === "barbell" && hold === "dumbbell") hold = "barbell";
  else if (impl === "machine" && (hold === "barbell" || hold === "dumbbell")) hold = "handle";

  return (
    <svg viewBox="0 -18 400 218" role="img" aria-label={name} className={cn("block h-auto w-full", className)}>
      {[0, 1].map((f) => {
        const j = solve(pattern.frames[f]);
        return (
          <g key={f} transform={`translate(${f * 200} 0)`}>
            <line x1={10} y1={fx(FLOOR + 1)} x2={190} y2={fx(FLOOR + 1)} stroke={C.floor} strokeWidth={2} />
            {j.view === "side" ? (
              <SideFrame j={j} pattern={pattern} hold={hold} anchor={anchor} muscles={muscles} />
            ) : (
              <FrontFrame j={j} hold={hold} muscles={muscles} />
            )}
          </g>
        );
      })}
      <line x1={200} y1={24} x2={200} y2={176} stroke={C.floor} strokeWidth={1.5} strokeDasharray="3 4" />
    </svg>
  );
}
