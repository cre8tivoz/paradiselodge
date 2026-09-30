import {
  Box3,
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from 'three'
import type { BufferGeometry, Material } from 'three'
import { darkWoodMaterial } from '../materials/look.ts'

/**
 * Code dressing that sits on the sourced rooms: papers, butts, keys,
 * a reception CRT, and curtains. Nothing here is a solid. The look ray
 * only tests the world group, and these live outside it.
 */

const std = (color: number, roughness = 0.9): MeshStandardMaterial =>
  new MeshStandardMaterial({ color, roughness })

function rnd(seed: { v: number }): number {
  seed.v = (seed.v * 16807) % 2147483647
  return seed.v / 2147483647
}

export function papers(origin: Vector3, count = 5, seedN = 1): Group {
  const g = new Group()
  g.name = 'ld_papers'
  const seed = { v: seedN }
  const mats = [0xe9dcc0, 0xd8c8a0, 0xf0e6cc, 0xc9b58c].map((c) => std(c, 0.95))
  for (let i = 0; i < count; i += 1) {
    const mat = mats[i % mats.length]
    if (mat === undefined) continue
    const w = 0.21 * (0.9 + rnd(seed) * 0.2)
    const h = 0.297 * (0.85 + rnd(seed) * 0.2)
    const m = new Mesh(new BoxGeometry(w, 0.002 + rnd(seed) * 0.003, h), mat)
    m.position.set(origin.x + (rnd(seed) - 0.5) * 0.28, origin.y + i * 0.0025, origin.z + (rnd(seed) - 0.5) * 0.16)
    m.rotation.y = (rnd(seed) - 0.5) * 1.1
    m.castShadow = true
    m.receiveShadow = true
    g.add(m)
  }
  return g
}

export function cigarettes(center: Vector3, n = 4): Group {
  const g = new Group()
  g.name = 'ld_butts'
  const paper = std(0xeee8dc, 0.9)
  const filter = std(0xc08a4a, 0.8)
  const ash = std(0x5a5550, 1)
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 + 0.4
    const b = new Group()
    const p = new Mesh(new CylinderGeometry(0.004, 0.004, 0.035, 6), paper)
    p.position.y = 0.0175
    const f = new Mesh(new CylinderGeometry(0.0042, 0.0042, 0.02, 6), filter)
    f.position.y = 0.045
    const t = new Mesh(new CylinderGeometry(0.004, 0.004, 0.005, 6), ash)
    t.position.y = -0.002
    b.add(p, f, t)
    b.rotation.z = Math.PI / 2 - 0.25
    b.rotation.y = a
    b.position.set(center.x + Math.cos(a) * 0.045, center.y, center.z + Math.sin(a) * 0.045)
    g.add(b)
  }
  return g
}

export function keysInRack(bounds: Box3, cols = 8, rows = 4): Group {
  const g = new Group()
  g.name = 'ld_keys'
  const brass = std(0xa07a3a, 0.35)
  brass.metalness = 0.9
  const fob = std(0x7a1e14, 0.5)
  const env = std(0x5e5038, 0.95)
  const cw = (bounds.max.x - bounds.min.x) / cols
  const rh = (bounds.max.y - bounds.min.y) / rows
  const seed = { v: 7 }
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      const x = bounds.min.x + (c + 0.5) * cw
      const y = bounds.min.y + (r + 0.5) * rh
      const z = bounds.min.z - 0.01
      const v = rnd(seed)
      if (v < 0.45) {
        const k = new Group()
        const ring = new Mesh(new TorusGeometry(0.012, 0.002, 6, 12), brass)
        const shank = new Mesh(new BoxGeometry(0.008, 0.05, 0.003), brass)
        shank.position.y = -0.035
        const tagMat = rnd(seed) < 0.5 ? fob : brass
        const tag = new Mesh(new CylinderGeometry(0.018, 0.018, 0.006, 10), tagMat)
        tag.rotation.x = Math.PI / 2
        tag.position.y = -0.08
        k.add(ring, shank, tag)
        k.position.set(x, y + rh * 0.2, z)
        k.rotation.z = (rnd(seed) - 0.5) * 0.3
        g.add(k)
      } else if (v < 0.62) {
        const e = new Mesh(new BoxGeometry(cw * 0.7, rh * 0.45, 0.004), env)
        e.position.set(x, bounds.min.y + r * rh + rh * 0.28, z + 0.06)
        e.rotation.x = -0.25
        g.add(e)
      }
    }
  }
  return g
}

export interface Crt {
  readonly root: Group
  update(time: number): void
}

export function crt(pos: Vector3, rotY = 0): Crt {
  const g = new Group()
  g.position.copy(pos)
  g.rotation.y = rotY
  g.name = 'ld_crt'
  const box = new Mesh(new BoxGeometry(0.36, 0.3, 0.32), std(0x2a2622, 0.5))
  box.position.y = 0.15
  box.castShadow = true
  g.add(box)
  const screenMat = new MeshStandardMaterial({
    color: 0x000000,
    emissive: 0x8cbfff,
    emissiveIntensity: 2.2,
    toneMapped: false,
    roughness: 0.2,
  })
  screenMat.emissive.setRGB(0.55, 0.75, 1)
  const scr = new Mesh(new PlaneGeometry(0.27, 0.2), screenMat)
  scr.position.set(0, 0.16, 0.161)
  g.add(scr)
  const light = new PointLight(0x8cb8ff, 0.8, 3.5, 2)
  light.position.set(0, 0.16, 0.4)
  g.add(light)
  return {
    root: g,
    update(time: number): void {
      const f = 0.75 + 0.25 * Math.sin(time * 9.1) * Math.sin(time * 3.7 + 1.3)
      screenMat.emissiveIntensity = 2.2 * f
      light.intensity = 0.8 * f
    },
  }
}

export function curtain(width: number, height: number, folds: number, depth: number, color: number, sheer: boolean): Mesh {
  const geo: BufferGeometry = new PlaneGeometry(width, height, folds * 6, 6)
  const p = geo.attributes.position
  if (p === undefined) throw new Error('curtain geometry has no position')
  for (let i = 0; i < p.count; i += 1) {
    const x = p.getX(i)
    const y = p.getY(i)
    const t = (x / width + 0.5) * folds * Math.PI * 2
    p.setZ(i, Math.sin(t) * depth * (1 + 0.25 * (0.5 - y / height)))
  }
  geo.computeVertexNormals()
  geo.translate(0, height / 2, 0)
  const mat: Material = sheer
    ? new MeshStandardMaterial({
        color: 0xf2e6cc,
        roughness: 1,
        transparent: true,
        opacity: 0.45,
        side: DoubleSide,
        emissive: 0xffe2b0,
        emissiveIntensity: 0.35,
        depthWrite: false,
      })
    : new MeshStandardMaterial({ color, roughness: 0.85, side: DoubleSide })
  const m = new Mesh(geo, mat)
  m.castShadow = !sheer
  m.receiveShadow = true
  m.name = sheer ? 'ld_net' : 'ld_drape'
  return m
}

/** Glowing sash on a solid wall. Glass only, no extra collision. */
export function frostedWindow(center: Vector3, w: number, h: number, facing: Vector3): Group {
  const g = new Group()
  g.position.copy(center)
  g.lookAt(center.clone().add(facing))
  g.name = 'ld_frosted_window'
  const cv = document.createElement('canvas')
  cv.width = 32
  cv.height = 64
  const ctx = cv.getContext('2d')
  if (ctx !== null) {
    const gr = ctx.createLinearGradient(0, 0, 0, 64)
    gr.addColorStop(0, '#fff6e6')
    gr.addColorStop(1, '#cfd8e0')
    ctx.fillStyle = gr
    ctx.fillRect(0, 0, 32, 64)
  }
  const map = new CanvasTexture(cv)
  map.colorSpace = SRGBColorSpace
  const glassMat = new MeshBasicMaterial({ map, color: 0xffffff, toneMapped: false })
  glassMat.color.setScalar(1.6)
  g.add(new Mesh(new PlaneGeometry(w, h), glassMat))
  const wood = darkWoodMaterial(0.5)
  const bar = (bw: number, bh: number, x: number, y: number): void => {
    const m = new Mesh(new BoxGeometry(bw, bh, 0.04), wood)
    m.position.set(x, y, 0.02)
    g.add(m)
  }
  bar(w + 0.1, 0.06, 0, h / 2)
  bar(w + 0.1, 0.08, 0, -h / 2)
  bar(0.06, h, -w / 2, 0)
  bar(0.06, h, w / 2, 0)
  bar(w, 0.04, 0, 0)
  return g
}
