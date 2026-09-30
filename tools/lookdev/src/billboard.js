// Photo-billboard character: picks front / three-quarter / profile cut-outs by camera angle,
// lit by scene lights through an "inflated" normal map, with a warm rim and a contact shadow.
// Port target: src/render/billboard-character.ts in the game repo.
import * as THREE from 'three';
import { tex } from './materials.js';

// nose direction in each source photo: +1 = image right, -1 = image left, 0 = facing camera
const VIEWS = {
  front: { file: 'rosie-front', w: 392, h: 958, feet: 950, nose: 0 },
  threequarter: { file: 'rosie-threequarter', w: 365, h: 983, feet: 975, nose: -1 },
  profile: { file: 'rosie-profile', w: 269, h: 970, feet: 962, nose: 1 },
};

export function photoCharacter({ name = 'rosie', height = 1.64, position, facing = 0, rim = new THREE.Color(1.0, 0.7, 0.4), rimStrength = 0.6, views = VIEWS } = {}) {
  const root = new THREE.Group(); root.name = `ld_${name}`; root.position.copy(position);
  const facingVec = new THREE.Vector3(-Math.sin(facing), 0, -Math.cos(facing)); // yaw 0 faces -Z (game convention)
  const planes = {};
  const uniforms = { uRim: { value: rim }, uRimStrength: { value: rimStrength } };
  for (const [key, v] of Object.entries(views)) {
    const map = tex(`./assets/${v.file}.png`, { repeat: false });
    const nrm = tex(`./assets/${v.file}-normal.png`, { srgb: false, repeat: false });
    const pxToM = height / v.feet;
    const w = v.w * pxToM, h = v.h * pxToM;
    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(0, h / 2 - (v.h - v.feet) * pxToM, 0);
    const mat = new THREE.MeshStandardMaterial({ map, normalMap: nrm, normalScale: new THREE.Vector2(1, 1), roughness: 0.78, metalness: 0, color: new THREE.Color(0.82, 0.8, 0.78),
      transparent: true, alphaTest: 0.04, side: THREE.DoubleSide, envMapIntensity: 0.6 });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uRim; uniform float uRimStrength;')
        // slight rim: brighten silhouette edges where the inflated normal turns away from camera
        .replace('#include <opaque_fragment>', `
          float ldFres = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 4.0);
          outgoingLight += uRim * ldFres * uRimStrength * diffuseColor.rgb * 2.0;
          #include <opaque_fragment>`);
    };
    mat.customProgramCacheKey = () => 'ld_billboard';
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.receiveShadow = false; // flat card: self-shadowing reads as stripes
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5 });
    mesh.visible = false; mesh.userData.fx = true; mesh.userData.view = v;
    root.add(mesh); planes[key] = mesh;
  }
  // contact shadow: soft dark ellipse on the floor
  const cs = document.createElement('canvas'); cs.width = cs.height = 128;
  const c2 = cs.getContext('2d'); const gr = c2.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  c2.fillStyle = gr; c2.fillRect(0, 0, 128, 128);
  const shadowTex = new THREE.CanvasTexture(cs);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.5), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, color: 0x000000, opacity: 1, blending: THREE.MultiplyBlending, premultipliedAlpha: true }));
  contact.material.map = shadowTex; contact.material.color.set(0xffffff);
  contact.material.blending = THREE.NormalBlending; contact.material.opacity = 0.9;
  contact.rotation.x = -Math.PI / 2; contact.position.y = 0.004; contact.userData.fx = true;
  root.add(contact);

  const tmp = new THREE.Vector3();
  /** Choose the view + orient the plane toward the camera (cylindrical billboard). */
  function update(camera) {
    tmp.copy(camera.position).sub(root.position); tmp.y = 0; tmp.normalize();
    const cosA = THREE.MathUtils.clamp(tmp.dot(facingVec), -1, 1);
    const ang = THREE.MathUtils.radToDeg(Math.acos(cosA));
    const right = new THREE.Vector3(-facingVec.z, 0, facingVec.x); // her right-hand side
    const camOnRight = tmp.dot(right) > 0;
    const key = ang < 20 ? 'front' : ang < 62 ? 'threequarter' : 'profile';
    for (const [k, m] of Object.entries(planes)) m.visible = k === key;
    const m = planes[key];
    // camera on her right -> her nose should point image-right
    const want = key === 'front' ? 0 : camOnRight ? 1 : -1;
    m.scale.x = want !== 0 && want !== m.userData.view.nose ? -1 : 1;
    m.rotation.y = Math.atan2(tmp.x, tmp.z);
    return key;
  }
  root.userData.update = update;
  root.userData.planes = planes;
  return root;
}
