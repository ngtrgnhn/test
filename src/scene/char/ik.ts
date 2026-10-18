import * as THREE from "three";

/**
 * Two-bone arm IK (allocation-free).
 *
 * The arm hangs along local −Y when every angle is zero; its palm faces local −X ("left-arm convention":
 * the right arm is solved as a mirror image, see `mirrorSolution`).
 * Everything is expressed in the parent (torso) space of the shoulder joint.
 *
 *   shoulder joint :  position S,  quaternion `q`
 *   elbow joint    :  at (0, −L1, 0), rotation.x = `elbow`
 *   wrist joint    :  at (0, −L2, 0), rotation.y = `roll`   (spins the hand around the forearm so the palm faces D)
 */
export interface ArmSolution {
  q: THREE.Quaternion;
  elbow: number;
  roll: number;
  /** distance shoulder → hand that was actually reached (≤ L1+L2) */
  reach: number;
}

export const makeArmSolution = (): ArmSolution => ({ q: new THREE.Quaternion(), elbow: 0, roll: 0, reach: 0 });

const u = new THREE.Vector3();
const h = new THREE.Vector3();
const ua = new THREE.Vector3();
const fa = new THREE.Vector3();
const nx = new THREE.Vector3();
const ny = new THREE.Vector3();
const nz = new THREE.Vector3();
const np = new THREE.Vector3();
const dp = new THREE.Vector3();
const cr = new THREE.Vector3();
const basis = new THREE.Matrix4();

export function solveArm(
  S: THREE.Vector3,
  T: THREE.Vector3,
  P: THREE.Vector3,
  D: THREE.Vector3 | null,
  L1: number,
  L2: number,
  out: ArmSolution
): ArmSolution {
  u.subVectors(T, S);
  let d = u.length();
  if (d < 1e-5) {
    u.set(0, -1, 0);
    d = 1e-5;
  } else u.multiplyScalar(1 / d);
  d = THREE.MathUtils.clamp(d, Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-4);
  out.reach = d;

  // angle between the upper arm and the shoulder→hand line (law of cosines)
  const cosA = THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
  const a = Math.acos(cosA);

  // the elbow points towards the pole, perpendicular to the shoulder→hand line
  h.copy(P).addScaledVector(u, -P.dot(u));
  if (h.lengthSq() < 1e-8) {
    h.set(0, 0, -1).addScaledVector(u, u.z);
    if (h.lengthSq() < 1e-8) h.set(1, 0, 0);
  }
  h.normalize();

  ua.copy(u).multiplyScalar(cosA).addScaledVector(h, Math.sin(a)); // upper-arm direction
  fa.copy(u).multiplyScalar(d).addScaledVector(ua, -L1).multiplyScalar(1 / L2); // forearm direction
  const e = Math.acos(THREE.MathUtils.clamp(ua.dot(fa), -1, 1));

  // shoulder frame:  X = hinge axis of the elbow, Y = −upper arm, Z = X × Y
  nx.crossVectors(h, u).normalize();
  ny.copy(ua).negate();
  nz.crossVectors(nx, ny);
  basis.makeBasis(nx, ny, nz);
  out.q.setFromRotationMatrix(basis);
  out.elbow = e;

  // wrist roll: turn the palm (−X of the unrolled hand = −hinge axis) towards the wanted palm direction D
  out.roll = 0;
  if (D) {
    np.copy(nx).negate();
    np.addScaledVector(fa, -np.dot(fa));
    dp.copy(D).addScaledVector(fa, -D.dot(fa));
    if (np.lengthSq() > 1e-8 && dp.lengthSq() > 1e-8) {
      np.normalize();
      dp.normalize();
      cr.crossVectors(np, dp);
      const ang = Math.atan2(fa.dot(cr), np.dot(dp)); // signed angle about +fa
      out.roll = -ang; // +fa is local −Y of the elbow frame
    }
  }
  return out;
}

/** reflect a solved left arm into the matching right arm (x → −x) */
export function mirrorSolution(s: ArmSolution): ArmSolution {
  s.q.y = -s.q.y;
  s.q.z = -s.q.z;
  s.roll = -s.roll;
  return s;
}
