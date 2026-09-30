// Camera setups for the matched stills + the walkthrough path.
import * as THREE from 'three';
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const SHOTS = {
  'reception-rosie': { pos: V(5.05, 1.62, 0.55), target: V(3.95, 1.4, 3.1), fov: 42, probe: V(4.0, 1.6, 1.4), dof: { focus: 2.75, aperture: 0.0009, maxblur: 0.003 } },
  'hall-stairs': { pos: V(0.9, 1.5, 0.6), target: V(-0.8, 2.0, 7.8), fov: 50, dof: { focus: 5.5, aperture: 0.0005, maxblur: 0.002 }, probe: V(0.0, 1.6, 3.5) },
  'parlour': { pos: V(-3.5, 1.42, 4.95), target: V(-5.1, 0.95, 1.0), fov: 56, dof: { focus: 3.6, aperture: 0.0007, maxblur: 0.003 }, probe: V(-4.0, 1.4, 2.6) },
  'exterior-dusk': { pos: V(-13.5, 0.8, -9.5), target: V(2.0, 2.9, -2.0), fov: 50 },
};

// Walkthrough: front door -> hall -> reception past Rosie -> back to the hall, toward the stairs.
const K = [
  [0.0, V(0.05, 1.62, -0.75), V(0.1, 1.5, 3.5)],
  [2.5, V(0.2, 1.62, 1.3), V(3.0, 1.45, 2.6)],
  [4.5, V(1.3, 1.62, 2.45), V(4.0, 1.45, 3.0)],
  [6.5, V(2.5, 1.62, 2.25), V(4.1, 1.42, 3.2)],
  [9.0, V(3.6, 1.62, 1.45), V(4.1, 1.42, 3.25)],
  [11.0, V(2.8, 1.62, 2.1), V(1.0, 1.55, 2.5)],
  [12.8, V(1.2, 1.62, 2.5), V(-0.3, 1.7, 5.0)],
  [15.0, V(0.5, 1.62, 3.3), V(-0.8, 2.2, 7.5)],
  [18.0, V(0.15, 1.62, 4.4), V(-0.9, 2.6, 8.8)],
];
const posCurve = new THREE.CatmullRomCurve3(K.map((k) => k[1]), false, 'centripetal');
const tgtCurve = new THREE.CatmullRomCurve3(K.map((k) => k[2]), false, 'centripetal');
export const WALK_DURATION = 18.0;
/** piecewise-time mapping so each key lands at its timestamp; ease-in on the first segment, ease-out on the last */
function u(t) {
  const n = K.length - 1;
  for (let i = 0; i < n; i++) if (t <= K[i + 1][0]) {
    let a = (t - K[i][0]) / (K[i + 1][0] - K[i][0]);
    if (i === 0) a = 0.5 * (a * a) + 0.5 * a;
    if (i === n - 1) a = 1 - 0.5 * (1 - a) * (1 - a) - 0.5 * (1 - a);
    return (i + a) / n;
  }
  return 1;
}
export function walkCamera(t, cam) {
  const k = u(Math.min(Math.max(t, 0), WALK_DURATION));
  cam.position.copy(posCurve.getPoint(k));
  cam.position.y += Math.sin(t * 2 * Math.PI * 0.9) * 0.012;   // gentle footstep bob
  cam.lookAt(tgtCurve.getPoint(k));
}
