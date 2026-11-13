import {
  CanvasTexture,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SkinnedMesh,
  SRGBColorSpace,
} from 'three'
import type { Material, Object3D } from 'three'

/**
 * Shared lookdev pass for photo-mapped characters (Moretti, Crystal, Mark,
 * Victor, Sterling). Keeps authored photographic UV maps intact while
 * calibrating studio-sheet highlights, anisotropic roughness, hair-card alpha
 * transparency, dusk Fresnel rim separation, and floor contact shadows.
 */

export interface CharacterLookOptions {
  /** Place a radial soft shadow disc at the character's feet (`y = 0.008`). */
  readonly contactShadow?: boolean
  /** Floor roughness for matte skin and fabric (metals/glass keep theirs). */
  readonly roughness?: number
  /** Grazing Fresnel dusk rim strength. Set `0` to disable rim injection. */
  readonly rimStrength?: number
}

const DEFAULT_ROUGHNESS = 0.78
const DEFAULT_RIM = 0.22
const ACCESSORY_MAT = /gold|steel|glass|sling|metal|ember/i

let contactShadowTex: CanvasTexture | undefined

function getContactShadowTexture(): CanvasTexture {
  if (contactShadowTex !== undefined) return contactShadowTex
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx !== null) {
    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62)
    grad.addColorStop(0.0, 'rgba(6, 4, 3, 0.58)')
    grad.addColorStop(0.55, 'rgba(8, 5, 4, 0.26)')
    grad.addColorStop(1.0, 'rgba(8, 5, 4, 0.0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 128, 128)
  }
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  contactShadowTex = tex
  return tex
}

function tuneCharacterMaterial(
  mat: Material,
  roughFloor: number,
  rimStrength: number,
  isHairCard: boolean,
): void {
  if (!(mat instanceof MeshStandardMaterial)) return

  const matName = mat.name ?? ''
  const isAccessory = ACCESSORY_MAT.test(matName)

  if (isHairCard || matName.toLowerCase().includes('hair_card')) {
    mat.alphaTest = 0.45
    mat.transparent = false
    mat.side = DoubleSide
    mat.depthWrite = true
  }

  if (mat.map !== null) {
    mat.map.colorSpace = SRGBColorSpace
    mat.map.anisotropy = 8
    // Studio turnaround sheets are neutral high-key; calibrate gently toward
    // warm 1994 film exposure so faces hold detail under practicals and sky.
    mat.color.copy(new Color(0.86, 0.83, 0.80))
    mat.map.needsUpdate = true
  }

  if (!isAccessory) {
    mat.roughness = Math.max(mat.roughness, roughFloor)
    mat.metalness = Math.min(mat.metalness, 0.04)
  }
  mat.envMapIntensity = isAccessory ? 0.85 : 0.55

  if (!isAccessory && rimStrength > 0 && mat.userData.ldCharLookApplied !== true) {
    mat.userData.ldCharLookApplied = true
    const key = `ld_char_rim_${rimStrength.toFixed(3)}`
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uLdCharRim = { value: rimStrength }
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uLdCharRim;')
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          vec3 ldCharV = normalize(vViewPosition);
          float ldCharFres = pow(1.0 - max(dot(normal, ldCharV), 0.0), 3.0);
          vec3 ldCharRimTint = mix(vec3(0.46, 0.56, 0.72), vec3(0.95, 0.74, 0.48), smoothstep(-0.25, 0.75, normal.y));
          totalEmissiveRadiance += diffuseColor.rgb * ldCharRimTint * (ldCharFres * uLdCharRim);`,
        )
    }
    mat.customProgramCacheKey = () => key
  }

  mat.needsUpdate = true
}

export function prepareCharacterLook(
  root: Object3D,
  options: CharacterLookOptions = {},
): void {
  const roughFloor = options.roughness ?? DEFAULT_ROUGHNESS
  const rimStrength = options.rimStrength ?? DEFAULT_RIM

  root.traverse((obj) => {
    if (obj instanceof SkinnedMesh) {
      obj.frustumCulled = false
    }
    if (!(obj instanceof Mesh)) return
    const isHairCard = obj.name === 'hair_cards' || obj.name.includes('hair_card')
    obj.castShadow = !isHairCard
    obj.receiveShadow = true

    const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
    for (const mat of mats) {
      tuneCharacterMaterial(mat, roughFloor, rimStrength, isHairCard)
    }
  })

  if (options.contactShadow === true && root.getObjectByName('character.contactShadow') === undefined) {
    const disc = new Mesh(
      new PlaneGeometry(0.68, 0.68),
      new MeshBasicMaterial({
        map: getContactShadowTexture(),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    )
    disc.name = 'character.contactShadow'
    disc.rotation.x = -Math.PI / 2
    disc.position.y = 0.008
    disc.castShadow = false
    disc.receiveShadow = false
    root.add(disc)
  }
}
