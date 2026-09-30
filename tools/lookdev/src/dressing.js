// Cheap set dressing built in code: papers, cigarettes in the ashtray, keys with brass fobs in the
// pigeonholes, a small CRT with a flickering glow, curtains (heavy drapes + nets), a front door.
import * as THREE from 'three';
import { tex } from './materials.js';

const std = (o) => new THREE.MeshStandardMaterial(o);

export function papers(origin, count = 7, seed = 1) {
  const g = new THREE.Group(); g.name = 'ld_papers';
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const mats = [0xe9dcc0, 0xd8c8a0, 0xf0e6cc, 0xc9b58c].map((c) => std({ color: c, roughness: 0.95 }));
  for (let i = 0; i < count; i++) {
    const w = 0.21 * (0.9 + rnd() * 0.2), h = 0.297 * (0.85 + rnd() * 0.2);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.0015 + rnd() * 0.004, h), mats[i % mats.length]);
    m.position.set(origin.x + (rnd() - 0.5) * 0.35, origin.y + 0.002 + i * 0.0025, origin.z + (rnd() - 0.5) * 0.2);
    m.rotation.y = (rnd() - 0.5) * 1.2; m.castShadow = m.receiveShadow = true; g.add(m);
  }
  return g;
}

export function cigarettes(center, n = 4) {
  const g = new THREE.Group(); g.name = 'ld_butts';
  const paper = std({ color: 0xeee8dc, roughness: 0.9 }), filter = std({ color: 0xc08a4a, roughness: 0.8 }), ash = std({ color: 0x5a5550, roughness: 1 });
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.4;
    const b = new THREE.Group();
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.035, 8), paper); p.position.y = 0.0175;
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.02, 8), filter); f.position.y = 0.045;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.005, 8), ash); t.position.y = -0.002;
    b.add(p, f, t); b.rotation.z = Math.PI / 2 - 0.25; b.rotation.y = a;
    b.position.set(center.x + Math.cos(a) * 0.05, center.y + 0.02, center.z + Math.sin(a) * 0.05);
    g.add(b);
  }
  return g;
}

/** Keys with brass fobs hanging in a subset of pigeonholes; also a few envelopes in slots. */
export function keysInRack(bounds, cols = 8, rows = 4) {
  const g = new THREE.Group(); g.name = 'ld_keys';
  const brass = std({ color: 0xa07a3a, metalness: 0.9, roughness: 0.35 });
  const fob = std({ color: 0x7a1e14, roughness: 0.5 });
  const env = std({ color: 0x5e5038, roughness: 0.95 });
  const cw = (bounds.max.x - bounds.min.x) / cols, rh = (bounds.max.y - bounds.min.y) / rows;
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const x = bounds.min.x + (c + 0.5) * cw, y = bounds.min.y + (r + 0.5) * rh, z = bounds.min.z - 0.005;
    const v = rnd();
    if (v < 0.45) {
      const k = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.002, 6, 16), brass);
      const shank = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.05, 0.003), brass); shank.position.y = -0.035;
      const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.006, 16), rnd() < 0.5 ? fob : brass); tag.rotation.x = Math.PI / 2; tag.position.y = -0.08;
      k.add(ring, shank, tag); k.position.set(x, y + rh * 0.25, z); k.rotation.z = (rnd() - 0.5) * 0.3;
      k.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      g.add(k);
    } else if (v < 0.62) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(cw * 0.7, rh * 0.5, 0.004), env);
      e.position.set(x, bounds.min.y + r * rh + rh * 0.3, z + 0.08); e.rotation.x = -0.25; e.castShadow = true; g.add(e);
    }
  }
  return g;
}

/** Small portable CRT with animated screen glow + a cool flickering point light. */
export function crt(pos, rotY = 0, { glow = 2.2 } = {}) {
  const g = new THREE.Group(); g.position.copy(pos); g.rotation.y = rotY; g.name = 'ld_crt';
  const shell = std({ color: 0x2a2622, roughness: 0.5 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.32), shell); box.position.y = 0.15; box.castShadow = true; g.add(box);
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(0.55, 0.75, 1.0), emissiveIntensity: glow, toneMapped: false, roughness: 0.2 });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.2), screenMat); scr.position.set(-0.02, 0.16, 0.161); g.add(scr);
  const light = new THREE.PointLight(new THREE.Color(0.55, 0.72, 1.0), 0.8, 3.5, 2); light.position.set(0, 0.16, 0.4); g.add(light);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.35, 4), std({ color: 0x999999, metalness: 1, roughness: 0.3 }));
  ant.position.set(0.08, 0.45, -0.05); ant.rotation.z = -0.5; g.add(ant);
  g.userData.update = (t) => {
    const f = 0.75 + 0.25 * Math.sin(t * 9.1) * Math.sin(t * 3.7 + 1.3) + 0.1 * Math.sin(t * 31.0);
    screenMat.emissiveIntensity = glow * f; light.intensity = 0.8 * f;
    screenMat.emissive.setRGB(0.5 + 0.1 * Math.sin(t * 0.7), 0.72, 1.0);
  };
  return g;
}

/** Pleated curtain panel (sin-folded plane). sheer = net curtain (translucent, no shadow). */
export function curtain({ width, height, folds = 9, depth = 0.05, color = 0x5a1a14, sheer = false }) {
  const geo = new THREE.PlaneGeometry(width, height, folds * 8, 8);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const t = (x / width + 0.5) * folds * Math.PI * 2;
    p.setZ(i, Math.sin(t) * depth * (1.0 + 0.3 * (0.5 - y / height)));
  }
  geo.computeVertexNormals(); geo.translate(0, height / 2, 0);
  const mat = sheer
    ? new THREE.MeshStandardMaterial({ color: 0xf2e6cc, roughness: 1, transparent: true, opacity: 0.55, side: THREE.DoubleSide, emissive: 0xffe2b0, emissiveIntensity: 0.45, depthWrite: false })
    : new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat); m.castShadow = !sheer; m.receiveShadow = true; m.name = sheer ? 'ld_net' : 'ld_drape';
  return m;
}

/** Hall front wall with an open four-panel door + fanlight (unit-a has no street wall on the hall). */
export function frontDoorWall(darkWood) {
  const g = new THREE.Group(); g.name = 'ld_front_wall';
  const wallMat = darkWood.wall;
  const z = -0.12, t = 0.14;
  const add = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), wallMat); m.position.set(x, y, z - t / 2 + 0.02); m.castShadow = m.receiveShadow = true; g.add(m); };
  add(1.03, 3.2, -1.115, 1.6); add(1.03, 3.2, 1.115, 1.6); add(1.2, 0.55, 0, 2.925);
  const frame = darkWood.wood;
  const jamb = (x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.65, 0.2), frame); m.position.set(x, 1.325, z); m.castShadow = true; g.add(m); };
  jamb(-0.62); jamb(0.62);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.1, 0.2), frame); head.position.set(0, 2.2, z); g.add(head);
  const head2 = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.06, 0.2), frame); head2.position.set(0, 2.65, z); g.add(head2);
  // fanlight glass (glowing daylight)
  const fan = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.85, 0.6).multiplyScalar(2.2), toneMapped: false }));
  fan.position.set(0, 2.43, z - 0.02); g.add(fan);
  // door leaf swung open ~100 degrees against the hall wall
  const door = new THREE.Group(); door.position.set(-0.6, 0, z + 0.05);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.16, 2.14, 0.05), frame); leaf.position.set(0.58, 1.07, 0); leaf.castShadow = true; door.add(leaf);
  for (let i = 0; i < 4; i++) { const pnl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.07), darkWood.panel); pnl.position.set(0.3 + (i % 2) * 0.55, 0.55 + Math.floor(i / 2) * 1.0, 0); door.add(pnl); }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshStandardMaterial({ color: 0xb08a40, metalness: 1, roughness: 0.3 })); knob.position.set(1.05, 1.0, 0.05); door.add(knob);
  door.rotation.y = -Math.PI * 0.55; g.add(door);
  // daylight plate outside the door
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(4, 3.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.9, 0.75).multiplyScalar(2.6), toneMapped: false, fog: false }));
  plate.position.set(0, 1.5, -2.0); g.add(plate);
  return g;
}

/** Frosted sash window applied to a wall face: glowing glass, timber frame, sky RectAreaLight. */
export function frostedWindow(center, w, h, facing, wood, { glow = 2.4, light = 3.0 } = {}) {
  const g = new THREE.Group(); g.position.copy(center); g.lookAt(center.clone().add(facing)); g.name = 'ld_frosted_window';
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128; const c = cv.getContext('2d');
  const gr = c.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#fff6e6'); gr.addColorStop(1, '#cfd8e0'); c.fillStyle = gr; c.fillRect(0, 0, 64, 128);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), color: new THREE.Color(glow, glow, glow), toneMapped: false }));
  glass.material.map.colorSpace = THREE.SRGBColorSpace; glass.position.z = 0.01; g.add(glass);
  const bar = (bw, bh, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.06), wood); m.position.set(x, y, 0.03); m.castShadow = true; g.add(m); };
  bar(w + 0.12, 0.07, 0, h / 2 + 0.03); bar(w + 0.12, 0.09, 0, -h / 2 - 0.04); bar(0.07, h, -w / 2 - 0.03, 0); bar(0.07, h, w / 2 + 0.03, 0);
  bar(w, 0.05, 0, 0.05); bar(0.035, h, 0, 0);
  const ra = new THREE.RectAreaLight(new THREE.Color(0.85, 0.9, 1.0), light, w, h); ra.position.z = 0.02; ra.rotation.y = 0; g.add(ra);
  // RectAreaLight emits along its local -Z; flip to face into the room
  ra.lookAt(g.localToWorld(new THREE.Vector3(0, 0, 1)));
  g.userData.lights = [ra];
  return g;
}
