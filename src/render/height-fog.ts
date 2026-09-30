import { ShaderChunk } from 'three'

/**
 * Exponential height fog. Denser at street level, thinning upstairs.
 * Patches three's fog chunks in place. Call once, before the first render,
 * and only for the dusk look. The falloff is compiled into the chunk.
 */
export function installHeightFog(baseY = -0.85, falloff = 0.28): void {
  const b = falloff.toFixed(4)
  const y = baseY.toFixed(3)
  ShaderChunk.fog_pars_vertex =
    '#ifdef USE_FOG\n varying float vFogDepth; varying vec3 vFogWorld;\n#endif'
  ShaderChunk.fog_vertex =
    '#ifdef USE_FOG\n vFogDepth = -mvPosition.z; vFogWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#endif'
  ShaderChunk.fog_pars_fragment =
    '#ifdef USE_FOG\n uniform vec3 fogColor; varying float vFogDepth; varying vec3 vFogWorld;\n uniform float fogDensity; uniform float fogNear; uniform float fogFar;\n#endif'
  ShaderChunk.fog_fragment = `#ifdef USE_FOG
    vec3 ldRay = vFogWorld - cameraPosition; float ldDist = length(ldRay);
    float ldB = ${b};
    float ldH0 = cameraPosition.y - (${y});
    float ldDy = ldRay.y; float ldK = abs(ldDy) > 1e-3 ? (1.0 - exp(-ldB*ldDy)) / (ldB*ldDy) : 1.0;
    float ldAmt = fogDensity * exp(-ldB*ldH0) * ldK * ldDist;
    float fogFactor = 1.0 - exp(-max(ldAmt, 0.0));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
  #endif`
}
