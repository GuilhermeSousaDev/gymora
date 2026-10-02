/**
 * A tiny 2D "mannequin" rig. Poses are joint angles; this file turns them into points.
 *
 * Angles are absolute, in degrees: 0 = pointing down, 90 = forward (to the right, the way the
 * figure faces), 180 = up, -90 = backward. The torso angle is its lean from vertical
 * (positive = leaning forward; -90 = lying on the back with the head to the left).
 */

export type P = [number, number];

export const LEN = { torso: 58, neck: 7, head: 10.5, upper: 30, fore: 27, thigh: 40, shin: 38, foot: 13 };
export const FLOOR = 188;
export const ANKLE_Y = FLOOR - 4;

export type Arm = { upper: number; fore: number };
export type Leg = { thigh: number; shin: number; foot?: number };

export type SidePose = {
  view?: "side";
  /** Place the figure by its hip… */
  hip?: P;
  /** …or by the near ankle (standing exercises keep their feet planted) */
  ankle?: P;
  torso: number;
  arm: Arm;
  farArm?: Arm;
  leg: Leg;
  farLeg?: Leg;
};

export type FrontPose = {
  view: "front";
  hip: P;
  /** Arm abduction: 0 = down by the side, 90 = straight out */
  arms: number;
  /** Leg abduction per side (near/left, far/right) */
  legs: [number, number];
};

export type Pose = SidePose | FrontPose;

const rad = (d: number) => (d * Math.PI) / 180;
export const dir = (a: number, len = 1): P => [Math.sin(rad(a)) * len, Math.cos(rad(a)) * len];
export const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
export const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export type SideJoints = {
  view: "side";
  hip: P;
  shoulder: P;
  head: P;
  neck: P;
  near: { elbow: P; hand: P; knee: P; ankle: P; toe: P; heel: P };
  far: { shoulder: P; hip: P; elbow: P; hand: P; knee: P; ankle: P; toe: P; heel: P };
};

export type FrontJoints = {
  view: "front";
  hip: P;
  neck: P;
  head: P;
  shoulders: [P, P];
  elbows: [P, P];
  hands: [P, P];
  hips: [P, P];
  knees: [P, P];
  ankles: [P, P];
};

export type Joints = SideJoints | FrontJoints;

/** Far-side limbs sit slightly behind and up, which reads as depth. */
const FAR_OFFSET: P = [-5, -1.5];

export function solve(pose: Pose): Joints {
  if (pose.view === "front") return solveFront(pose);

  const { arm, leg } = pose;
  let hip: P;
  if (pose.ankle) {
    const knee = sub(pose.ankle, dir(leg.shin, LEN.shin));
    hip = sub(knee, dir(leg.thigh, LEN.thigh));
  } else {
    hip = pose.hip ?? [100, 106];
  }
  const up = 180 - pose.torso;
  const shoulder = add(hip, dir(up, LEN.torso));
  const neck = add(shoulder, dir(up, LEN.neck));
  const head = add(neck, dir(up, LEN.head));

  const limb = (s: P, h: P, a: Arm, l: Leg) => {
    const elbow = add(s, dir(a.upper, LEN.upper));
    const hand = add(elbow, dir(a.fore, LEN.fore));
    const knee = add(h, dir(l.thigh, LEN.thigh));
    const ankle = add(knee, dir(l.shin, LEN.shin));
    const footA = l.foot ?? l.shin + 90;
    const toe = add(ankle, dir(footA, LEN.foot));
    const heel = add(ankle, dir(footA, -3));
    return { elbow, hand, knee, ankle, toe, heel };
  };

  const near = limb(shoulder, hip, arm, leg);
  const fs = add(shoulder, FAR_OFFSET);
  const fh = add(hip, FAR_OFFSET);
  const far = { shoulder: fs, hip: fh, ...limb(fs, fh, pose.farArm ?? arm, pose.farLeg ?? leg) };
  return { view: "side", hip, shoulder, neck, head, near, far };
}

function solveFront(pose: FrontPose): FrontJoints {
  const hip = pose.hip;
  const shoulderY = hip[1] - LEN.torso;
  const neck: P = [hip[0], shoulderY - LEN.neck];
  const head: P = [hip[0], shoulderY - LEN.neck - LEN.head];
  const shoulders: [P, P] = [
    [hip[0] - 17, shoulderY + 3],
    [hip[0] + 17, shoulderY + 3],
  ];
  // Left limbs go out to the left (negative x), right limbs mirrored
  const outL = (s: P, a: number, len: number): P => add(s, [-Math.sin(rad(a)) * len, Math.cos(rad(a)) * len]);
  const outR = (s: P, a: number, len: number): P => add(s, [Math.sin(rad(a)) * len, Math.cos(rad(a)) * len]);
  const elbows: [P, P] = [outL(shoulders[0], pose.arms, LEN.upper), outR(shoulders[1], pose.arms, LEN.upper)];
  const hands: [P, P] = [outL(elbows[0], pose.arms, LEN.fore), outR(elbows[1], pose.arms, LEN.fore)];
  const hips: [P, P] = [
    [hip[0] - 8, hip[1] + 2],
    [hip[0] + 8, hip[1] + 2],
  ];
  const knees: [P, P] = [outL(hips[0], pose.legs[0], LEN.thigh), outR(hips[1], pose.legs[1], LEN.thigh)];
  const ankles: [P, P] = [outL(knees[0], pose.legs[0], LEN.shin), outR(knees[1], pose.legs[1], LEN.shin)];
  return { view: "front", hip, neck, head, shoulders, elbows, hands, hips, knees, ankles };
}
