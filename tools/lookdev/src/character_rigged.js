// Phase 2: Mixamo-rigged Rosie (?rosie=rigged). FBXLoader + AnimationMixer, driven deterministically by update(t).
// Keeps baked textures, alpha-tested hair cards and props; if Mixamo dropped a prop, it is re-attached to the
// head / right-hand bone from the unrigged v2 GLB (same A-pose bind, so the transforms line up).
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const rel = (f) => new URL(`../phase2/v2/${f}`, import.meta.url).href;   // module-relative, works from any page
const TEX = { body: rel('rosie-v2-body.png'), face: rel('rosie-v2-face.png'), hair: rel('rosie-v2-hair.png') };
const texCache = {};
function tex(key) {
  if (!texCache[key]) { const t = new THREE.TextureLoader().load(TEX[key]); t.colorSpace = THREE.SRGBColorSpace; t.flipY = true; t.anisotropy = 8; texCache[key] = t; }
  return texCache[key];
}
const kindOf = (o, m) => {
  const n = `${o.name} ${m?.name || ''} ${m?.map?.name || ''} ${m?.map?.image?.src || ''}`.toLowerCase();
  if (n.includes('hair')) return 'hair';
  if (n.includes('glass')) return 'glasses';
  if (n.includes('ember')) return 'ember';
  if (n.includes('cig')) return 'cigarette';
  if (n.includes('face')) return 'face';
  return 'body';
};

function rimify(m, rim, rimStrength) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRim = { value: rim }; sh.uniforms.uRimStrength = { value: rimStrength };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim; uniform float uRimStrength;')
      .replace('#include <opaque_fragment>', `
        float ldFres = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
        outgoingLight += uRim * ldFres * uRimStrength * diffuseColor.rgb;
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'ld_rig' + (m.alphaTest > 0 ? '_a' : '');
}

// Build a MeshStandardMaterial from whatever FBXLoader produced (Phong/Lambert), filling missing maps from the v2 PNGs.
function fixMaterial(o, src, rim, rimStrength) {
  const kind = kindOf(o, src);
  const m = new THREE.MeshStandardMaterial({ name: src?.name || kind, roughness: 0.82, metalness: 0, envMapIntensity: 0.6 });
  if (kind === 'glasses') { m.color.set(0x2a1a12); m.roughness = 0.4; m.metalness = 0.3; return { m, kind }; }
  if (kind === 'cigarette') { m.color.set(0xe8e2d6); m.roughness = 0.7; return { m, kind }; }
  if (kind === 'ember') { m.color.set(0x331100); m.emissive.set(0xff5a1a); m.emissiveIntensity = 2.0; return { m, kind }; }
  // hair always uses the known-good v2 PNG (FBX round-trips can drop/flatten its alpha); body/face keep an embedded map if present
  m.map = kind !== 'hair' && src?.map && src.map.image ? src.map : tex(kind === 'hair' ? 'hair' : kind);
  console.log('rig mat', o.name, kind, src?.type, 'embedded map:', src?.map?.name || (src?.map ? 'yes' : 'none'));
  m.map.colorSpace = THREE.SRGBColorSpace;
  m.color = new THREE.Color(0.86, 0.83, 0.8);   // same albedo trim as the billboard / static 3D Rosie
  if (kind === 'hair') { m.alphaTest = 0.5; m.side = THREE.DoubleSide; m.transparent = false; }
  const dbg = new URLSearchParams(location.search).get('hairdbg');
  if (kind === 'hair' && dbg === 'basic') return { m: new THREE.MeshBasicMaterial({ map: m.map, alphaTest: 0.5, side: THREE.DoubleSide }), kind };
  if (kind === 'hair' && dbg === 'flip') { const t = m.map.clone(); t.flipY = !t.flipY; t.needsUpdate = true; m.map = t; }
  rimify(m, rim, rimStrength);
  return { m, kind };
}

export async function characterRigged({ url = './mixamo/rosie-idle.fbx', extraClips = [], position, yaw = Math.PI, height = 1.65,
  propsGlb = rel('rosie3d-v2.glb'), rim = new THREE.Color(1.0, 0.7, 0.4), rimStrength = 0.35 } = {}) {
  const fbx = await new FBXLoader().loadAsync(url);
  const root = new THREE.Group(); root.name = 'ld_character_rigged'; root.position.copy(position); root.rotation.y = yaw;
  const fxMeshes = []; const kinds = new Set(); const skinned = []; const hairMeshes = [];
  fbx.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const fixed = mats.map((s) => fixMaterial(o, s, rim, rimStrength));
    o.material = Array.isArray(o.material) ? fixed.map((f) => f.m) : fixed[0].m;
    fixed.forEach((f) => kinds.add(f.kind));
    if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();   // props come out of Mixamo without normals
    if (!o.name) o.name = `rosie_${fixed[0].kind}`;
    o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;   // skinned bounds lag the animation
    if (fixed.some((f) => f.kind === 'hair')) { o.castShadow = false; o.receiveShadow = false; o.userData.fx = true; fxMeshes.push(o); }
    if (o.isSkinnedMesh) skinned.push(o);
    if (fixed.some((f) => f.kind === 'hair')) hairMeshes.push(o);
  });
  // hair-card normals come out of the FBX round trip unusable (cards shade near-black); rebuild them radiating from
  // the head centre (bind space), the usual soft hair-card shading trick. Skinning then carries them with the head.
  for (const h of hairMeshes) {
    const g = h.geometry; g.computeBoundingBox(); const bb = g.boundingBox; const P = g.attributes.position;
    const w = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
    const c = new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y - w * 0.55, (bb.min.z + bb.max.z) / 2);
    const n = new Float32Array(P.count * 3); const v = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).sub(c); if (v.y < 0) v.y *= 0.3; v.normalize(); n.set([v.x, v.y, v.z], i * 3); }
    g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  }

  // FBXLoader builds one bone per skin cluster on Mixamo multi-mesh rigs, so Neck/Head/etc. exist several times, nested.
  // Collapse onto one canonical bone per name: newInverse = canonWorld^-1 * dupWorld * oldInverse keeps the deformation
  // identical, then drop the duplicates. Needed for a valid single-skeleton glTF export (and cheaper in-scene).
  fbx.updateMatrixWorld(true);
  const canon = {}; const dups = [];
  fbx.traverse((o) => { if (!o.isBone) return; if (!canon[o.name]) canon[o.name] = o; else dups.push(o); });
  let collisions = 0;
  for (const sm of skinned) {
    const old = sm.skeleton; const bones = [], inv = [], remap = [];
    old.bones.forEach((b, i) => {
      const c = canon[b.name]; const M = c === b ? old.boneInverses[i].clone() : c.matrixWorld.clone().invert().multiply(b.matrixWorld).multiply(old.boneInverses[i]);
      const j = bones.indexOf(c);
      if (j >= 0) { collisions++; if (!inv[j].equals(M)) { const e = inv[j].elements.reduce((a, v, k) => a + Math.abs(v - M.elements[k]), 0); if (e > 1e-3) console.warn('rig: joint merge mismatch', sm.name, b.name, e.toFixed(4)); } remap[i] = j; }
      else { remap[i] = bones.length; bones.push(c); inv.push(M); }
    });
    const si = sm.geometry.attributes.skinIndex; for (let k = 0; k < si.array.length; k++) si.array[k] = remap[si.array[k]] ?? 0; si.needsUpdate = true;
    sm.bind(new THREE.Skeleton(bones, inv), sm.bindMatrix);
  }
  const canonSet = new Set(Object.values(canon));
  for (const d of dups) { for (const ch of [...d.children]) if (canonSet.has(ch) || !ch.isBone) canon[d.name].attach(ch); }
  for (const d of dups) d.parent?.remove(d);
  let nb = 0; fbx.traverse((o) => { if (o.isBone) nb++; });
  console.log('rig: collapsed', dups.length, 'duplicate bones ->', nb, 'bones; joint collisions', collisions);

  // bind-pose height -> scale to `height` metres, feet on the floor, centred on x/z
  fbx.updateMatrixWorld(true);
  const box = new THREE.Box3();
  fbx.traverse((o) => { if (o.isMesh) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); box.union(b); } });
  const s = height / (box.max.y - box.min.y);
  fbx.scale.multiplyScalar(s);
  fbx.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, -(box.min.z + box.max.z) / 2 * s);
  root.add(fbx); root.updateMatrixWorld(true);

  const bone = (re) => { let b = null; fbx.traverse((o) => { if (!b && o.isBone && re.test(o.name)) b = o; }); return b; };
  const head = bone(/mixamorig\d*:?Head$/i) || bone(/head$/i); const rhand = bone(/mixamorig\d*:?RightHand$/i) || bone(/righthand$/i);

  // re-attach props Mixamo dropped (it keeps only skinned meshes it could weight)
  const missing = ['hair', 'glasses', 'cigarette', 'ember'].filter((k) => !kinds.has(k));
  const reattached = [];
  if (missing.length && propsGlb) {
    const g = await new GLTFLoader().loadAsync(propsGlb);
    // align the unrigged A-pose GLB to the rig's bind pose using the same bbox normalisation
    const gb = new THREE.Box3().setFromObject(g.scene); const gs = height / (gb.max.y - gb.min.y);
    g.scene.scale.setScalar(gs); g.scene.position.set(-(gb.min.x + gb.max.x) / 2 * gs, -gb.min.y * gs, -(gb.min.z + gb.max.z) / 2 * gs);
    root.add(g.scene); root.updateMatrixWorld(true);
    const take = []; g.scene.traverse((o) => { if (o.isMesh && missing.includes(kindOf(o, o.material))) take.push(o); });
    // the bones must be in bind pose when attaching: skeleton.pose() resets them
    skinned.forEach((sm) => sm.skeleton.pose()); root.updateMatrixWorld(true);
    for (const o of take) {
      const kind = kindOf(o, o.material); const target = kind === 'hair' || kind === 'glasses' ? head : rhand;
      if (!target) continue;
      const { m } = fixMaterial(o, o.material, rim, rimStrength);
      if (kind === 'hair') { m.map = o.material.map || m.map; }
      o.material = m; o.castShadow = kind !== 'hair'; o.receiveShadow = kind !== 'hair';
      if (kind === 'hair') { o.userData.fx = true; fxMeshes.push(o); }
      target.attach(o); reattached.push(`${kind}->${target.name}`);
    }
    root.remove(g.scene);
  }

  // animation: the idle clip plus any extra clips (same Mixamo skeleton)
  const mixer = new THREE.AnimationMixer(fbx);
  const clips = [...fbx.animations, ...extraClips];
  clips.forEach((c, i) => { if (!c.name || c.name === 'mixamo.com') c.name = i === 0 ? 'idle' : `clip${i}`; });
  const action = clips[0] ? mixer.clipAction(clips[0]) : null; action?.play();

  // contact shadow blob (same as the static model)
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.55).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.MultiplyBlending, premultipliedAlpha: true }));
  blob.position.y = 0.004; blob.renderOrder = 1; root.add(blob);

  let tris = 0; fbx.traverse((o) => { if (o.isMesh) tris += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; });
  root.userData = { tris, fx: fxMeshes, mixer, clips, fbx, head, rhand, reattached, kinds: [...kinds], scale: s,
    update(t) { if (action) mixer.setTime(t); } };
  return root;
}
