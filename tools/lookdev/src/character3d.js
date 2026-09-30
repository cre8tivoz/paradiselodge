// Loads a baked 3D character GLB (phase 2 Rosie) and makes it sit in the interior light rig like the billboard does:
// shadows on, faint warm rim, matched env response, soft contact shadow under the feet.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function character3d({ url = './assets/rosie3d.glb', position, yaw = Math.PI, rim = new THREE.Color(1.0, 0.7, 0.4), rimStrength = 0.35 } = {}) {
  const g = await new GLTFLoader().loadAsync(url);
  const fxMeshes = [];
  const root = new THREE.Group(); root.name = 'ld_character3d'; root.position.copy(position); root.rotation.y = yaw;
  g.scene.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    if (o.material.alphaTest > 0 || o.material.transparent) {   // hair cards: no self-shadow acne, and kept out of GTAO like the billboard
      o.castShadow = false; o.receiveShadow = false; o.userData.fx = true; fxMeshes.push(o);
    }
    const m = o.material; if (!m.map) return;   // props (glasses, cigarette) keep their own material
    m.roughness = 0.82; m.metalness = 0; m.envMapIntensity = 0.6;
    m.color = new THREE.Color(0.86, 0.83, 0.8);   // same albedo trim as the billboard (sheet photo is lit + bright)
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uRim = { value: rim }; sh.uniforms.uRimStrength = { value: rimStrength };
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uRim; uniform float uRimStrength;')
        .replace('#include <opaque_fragment>', `
          float ldFres = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
          outgoingLight += uRim * ldFres * uRimStrength * diffuseColor.rgb;
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'ld_char3d' + (m.alphaTest > 0 ? '_a' : '');
  });
  root.add(g.scene);
  // contact shadow: radial blob, multiplied onto the floor
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.55).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.MultiplyBlending, premultipliedAlpha: true }));
  blob.position.y = 0.004; blob.renderOrder = 1; root.add(blob);
  let tris = 0; g.scene.traverse((o) => { if (o.isMesh) tris += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; });
  root.userData.tris = tris; root.userData.fx = fxMeshes;
  return root;
}
