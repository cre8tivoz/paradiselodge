// Film post stack: GTAO -> bloom -> (optional) DoF -> one "film" pass doing chromatic aberration,
// exposure, filmic tone curve, hand-built grade (lift/gamma/gain + split tone matched to concept 03),
// vignette, grain and sRGB encode. Port target: src/render/post.ts in the game repo.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';

/** Hides "fx" objects (billboards, beams, particles) from depth/normal-only passes. */
class VisibilityPass extends Pass {
  constructor(getObjects, visible) { super(); this.getObjects = getObjects; this.visible = visible; this.needsSwap = false; }
  render() { this.getObjects().forEach((o) => { if (this.visible) { if (o.userData._wasVisible) o.visible = true; } else { o.userData._wasVisible = o.visible; o.visible = false; } }); }
}

export const GRADES = {
  // tungsten amber, tobacco shadows (concept 03 / 05)
  interior: {
    exposure: 0.72, contrast: 1.18, saturation: 0.9,
    lift: [0.016, 0.009, 0.003], gamma: [1.0, 1.02, 1.10], gain: [1.06, 0.97, 0.80],
    shadowTint: [0.52, 0.38, 0.22], highlightTint: [1.0, 0.86, 0.62], splitAmt: 0.22,
    vignette: 0.45, grain: 0.045, ca: 0.0016, bloomStrength: 0.35, bloomRadius: 0.55, bloomThreshold: 1.4,
  },
  // dusk: teal-violet ambience, sodium + neon highlights (concepts 01 / 02)
  exterior: {
    exposure: 1.2, contrast: 1.12, saturation: 1.02,
    lift: [0.012, 0.012, 0.028], gamma: [1.0, 1.0, 0.97], gain: [1.05, 0.97, 0.90],
    shadowTint: [0.30, 0.34, 0.50], highlightTint: [1.0, 0.80, 0.58], splitAmt: 0.25,
    vignette: 0.5, grain: 0.05, ca: 0.002, bloomStrength: 0.55, bloomRadius: 0.5, bloomThreshold: 2.2,
  },
};

const FilmShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1920, 1080) },
    uExposure: { value: 1 }, uContrast: { value: 1 }, uSat: { value: 1 },
    uLift: { value: new THREE.Vector3() }, uGamma: { value: new THREE.Vector3(1, 1, 1) }, uGain: { value: new THREE.Vector3(1, 1, 1) },
    uShadowTint: { value: new THREE.Vector3(1, 1, 1) }, uHighTint: { value: new THREE.Vector3(1, 1, 1) }, uSplit: { value: 0 },
    uVignette: { value: 0.4 }, uGrain: { value: 0.04 }, uCA: { value: 0.0015 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uExposure, uContrast, uSat, uSplit, uVignette, uGrain, uCA; uniform vec2 uRes;
    uniform vec3 uLift, uGamma, uGain, uShadowTint, uHighTint; varying vec2 vUv;
    // AgX-like filmic curve (log2 encode + sigmoid), soft shoulder, gentle toe
    vec3 filmic(vec3 x){
      x = max(x, 0.0);
      vec3 l = clamp((log2(x + 1e-5) + 10.0) / 16.5, 0.0, 1.0);        // -10..+6.5 EV
      vec3 l2 = l*l, l4 = l2*l2;
      return clamp(15.5*l4*l2 - 40.14*l4*l + 31.96*l4 - 6.868*l2*l + 0.4298*l2 + 0.1191*l - 0.00232, 0.0, 1.0);
    }
    float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x+p3.y)*p3.z); }
    void main(){
      vec2 d = vUv - 0.5; float r2 = dot(d, d);
      // radial chromatic aberration (lens), stronger toward the corners
      vec2 off = d * uCA * (0.5 + 3.0*r2);
      vec3 hdr = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      vec3 c = filmic(hdr * uExposure);               // display-referred 0..1 (already perceptual)
      // lift / gamma / gain (ASC-CDL flavoured)
      c = pow(max(c*uGain + uLift*(1.0 - c), 0.0), 1.0/uGamma);
      // split tone by luma
      float Y = dot(c, vec3(0.2126, 0.7152, 0.0722));
      vec3 tint = mix(uShadowTint, uHighTint, smoothstep(0.05, 0.75, Y));
      c = mix(c, c * tint / max(dot(tint, vec3(0.2126,0.7152,0.0722)), 1e-3), uSplit);
      // saturation + S-curve contrast around mid grey
      Y = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(Y), c, uSat);
      c = clamp((c - 0.42) * uContrast + 0.42, 0.0, 1.0);
      c = c*c*(3.0 - 2.0*c)*0.25 + c*0.75;
      // vignette (optical falloff, slightly warm)
      float v = 1.0 - uVignette * smoothstep(0.08, 0.75, r2*1.9);
      c *= vec3(v, v*0.985, v*0.96);
      // film grain: luma-weighted, per-frame seed, applied in display space
      float g = h12(gl_FragCoord.xy + fract(uTime*7.13)*vec2(1733.0, 911.0)) + h12(gl_FragCoord.xy*1.7 + uTime*3.1) - 1.0;
      c += g * uGrain * (0.35 + 0.65*(1.0 - abs(Y*2.0 - 1.0)));
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);   // curve output is already display-encoded
    }`,
};

export function buildPost(renderer, scene, camera, { width, height, grade = GRADES.interior, ao = true, bloom = true, dof = null, getFx = () => [] } = {}) {
  const rt = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1); composer.setSize(width, height);
  const passes = {};
  passes.render = new RenderPass(scene, camera); composer.addPass(passes.render);
  if (ao) {
    composer.addPass(new VisibilityPass(getFx, false));
    passes.gtao = new GTAOPass(scene, camera, width, height);
    passes.gtao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.4, thickness: 1.2, scale: 1.25, samples: 12 });
    passes.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    passes.gtao.blendIntensity = 1.0;
    composer.addPass(passes.gtao);
    composer.addPass(new VisibilityPass(getFx, true));
  }
  // guard: GTAO can emit NaN/inf at far-plane pixels, which bloom would smear across the frame
  passes.sanitize = new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv);
      if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0, 0.0, 0.0, 1.0); gl_FragColor = vec4(min(c.rgb, vec3(200.0)), 1.0); }`,
  });
  composer.addPass(passes.sanitize);
  if (bloom) {
    passes.bloom = new UnrealBloomPass(new THREE.Vector2(width, height), grade.bloomStrength, grade.bloomRadius, grade.bloomThreshold);
    composer.addPass(passes.bloom);
  }
  if (dof) {
    const dofFx = () => getFx().filter((o) => !o.userData.view);   // keep billboards in the DoF depth
    composer.addPass(new VisibilityPass(dofFx, false));
    passes.dof = new BokehPass(scene, camera, { focus: dof.focus, aperture: dof.aperture, maxblur: dof.maxblur ?? 0.006 });
    composer.addPass(passes.dof);
    composer.addPass(new VisibilityPass(dofFx, true));
  }
  passes.film = new ShaderPass(FilmShader);
  const u = passes.film.uniforms;
  u.uRes.value.set(width, height);
  const applyGrade = (g) => {
    u.uExposure.value = g.exposure; u.uContrast.value = g.contrast; u.uSat.value = g.saturation;
    u.uLift.value.set(...g.lift); u.uGamma.value.set(...g.gamma); u.uGain.value.set(...g.gain);
    u.uShadowTint.value.set(...g.shadowTint); u.uHighTint.value.set(...g.highlightTint); u.uSplit.value = g.splitAmt;
    u.uVignette.value = g.vignette; u.uGrain.value = g.grain; u.uCA.value = g.ca;
    if (passes.bloom) { passes.bloom.strength = g.bloomStrength; passes.bloom.radius = g.bloomRadius; passes.bloom.threshold = g.bloomThreshold; }
  };
  applyGrade(grade);
  composer.addPass(passes.film);
  return { composer, passes, applyGrade, setTime: (t) => (u.uTime.value = t) };
}
