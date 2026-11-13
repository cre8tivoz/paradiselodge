import { AnimationMixer, Box3, Group, MathUtils, Mesh, MeshStandardMaterial, SkinnedMesh, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { PLAYER } from '../core/config.ts'

/**
 * Rosie Lodge. The lodging house manager, and the only person in scene 1 who
 * talks back.
 *
 * BRIEF.md: "Rosie appears twice. Once at reception on the way in, brief and
 * directive. Once in the parlour on the way back down, for the 2am
 * conversation. She relocates between beats."
 *
 * Sourced rigged period 3D character (Mixamo idle + cigarette).
 */

const MODEL_URL = '/models/rosie-rigged.glb'

export type StationId = 'reception' | 'parlour'

export interface Station {
  /** Feet, world space. */
  readonly position: Vector3
  /** Yaw 0 faces -Z, which is the street. */
  readonly yaw: number
  readonly dialogueId: string
  /** Tier one look line. Writing rules apply: surface only, no signalling. */
  readonly description: string
}

/**
 * Where she stands, and what she is saying when she is there.
 *
 * Reception is behind the desk between it and the key rack, facing out over the
 * counter. Miller comes in from the hall at the side of her, which is what the
 * head tracking is for.
 *
 * The parlour has her at the street window rather than in one of the armchairs.
 */
export const STATIONS: Readonly<Record<StationId, Station>> = {
  reception: {
    position: new Vector3(3.5, 0, 3.15),
    yaw: 0,
    dialogueId: 'rosie.reception',
    description: 'Rosie in her cardigan, glasses pushed up.',
  },
  parlour: {
    position: new Vector3(-3.05, 0, 0.75),
    yaw: Math.PI,
    dialogueId: 'rosie.parlour',
    description: "She's at the window now. Cigarette going.",
  },
}

/** Standing figure, near enough. Half a metre through the shoulders. */
const GIRTH = 0.25
const STAND_HEIGHT = 1.7

/** Local Y of the head joint, from the build script's HEIGHT_HEAD. */
const HEAD_Y = 1.5

/** She turns her head this far and no further. Past it she turns nothing. */
const HEAD_YAW_LIMIT = 0.75
const HEAD_PITCH_DOWN = -0.34
const HEAD_PITCH_UP = 0.4
/** Beyond this she is not being spoken to and stops tracking. */
const HEAD_GIVE_UP = 1.4
const HEAD_RANGE = 4.5
const HEAD_RESPONSE = 4.5

/*
 * The smoking cycle. One drag every fourteen seconds or so, which is about
 * right for a cigarette that has to last a conversation.
 */
const DRAG_PERIOD = 14.0
const DRAG_RAISE = 1.05
const DRAG_HOLD = 1.5
/** Ember at rest, and on the draw. */
const EMBER_IDLE = 1.0
const EMBER_DRAW = 3.4

export interface Rosie {
  readonly root: Group
  /** One box. Rewritten in place when she relocates, so the solver follows. */
  readonly solids: Box3[]
  readonly station: StationId
  readonly current: Station
  setStation(id: StationId): void
  /** @param playerFeet Miller's feet, world space. */
  update(delta: number, playerFeet: Vector3): void
}

export async function buildRosie(): Promise<Rosie> {
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL)

  const root = new Group()
  root.name = 'rosie'
  // Model faces +Z in local space; rotate by PI so it faces -Z (toward reception counter / player approach)
  gltf.scene.rotation.y = Math.PI
  root.add(gltf.scene)

  gltf.scene.traverse((object) => {
    const mesh = object as Mesh
    if (mesh.isMesh === true) {
      mesh.receiveShadow = true
      mesh.castShadow = object.name !== 'hair_cards'
      if (object instanceof SkinnedMesh) {
        object.frustumCulled = false
      }
    }
  })

  // Mixamo bones and accessories
  const head = gltf.scene.getObjectByName('mixamorigHead')
  const ember = gltf.scene.getObjectByName('cigarette_ember') as Mesh | undefined

  let emberMaterial: MeshStandardMaterial | undefined
  if (ember && ember.material instanceof MeshStandardMaterial) {
    emberMaterial = ember.material
  } else {
    gltf.scene.traverse((obj) => {
      if (obj instanceof Mesh && obj.name.includes('ember') && obj.material instanceof MeshStandardMaterial) {
        emberMaterial = obj.material
      }
    })
  }

  // Animation mixer for idle breathing, subtle weight shifts and natural posture
  const mixer = new AnimationMixer(gltf.scene)
  const idleClip = gltf.animations.find((c) => c.name === 'idle')
  if (idleClip) {
    const action = mixer.clipAction(idleClip)
    action.play()
  }

  const scratch = new Vector3()
  const solids: Box3[] = [new Box3()]

  let stationId: StationId = 'reception'
  let elapsed = 0
  let headYaw = 0
  let headPitch = 0

  function place(id: StationId): void {
    const station = STATIONS[id]
    stationId = id
    root.position.copy(station.position)
    root.rotation.y = station.yaw
    solids[0].min.set(
      station.position.x - GIRTH,
      station.position.y,
      station.position.z - GIRTH,
    )
    solids[0].max.set(
      station.position.x + GIRTH,
      station.position.y + STAND_HEIGHT,
      station.position.z + GIRTH,
    )
  }

  place('reception')

  return {
    root,
    solids,
    get station(): StationId {
      return stationId
    },
    get current(): Station {
      return STATIONS[stationId]
    },

    setStation(id: StationId): void {
      if (id === stationId) {
        return
      }
      place(id)
    },

    update(delta: number, playerFeet: Vector3): void {
      elapsed += delta
      mixer.update(delta)

      // --- Head tracking ---
      scratch.copy(playerFeet)
      scratch.y += PLAYER.eyeHeightStand
      root.worldToLocal(scratch)

      const dx = scratch.x
      const dz = scratch.z
      const flat = Math.hypot(dx, dz)
      const raw = Math.atan2(-dx, -dz)

      let wantYaw = 0
      let wantPitch = 0
      if (flat < HEAD_RANGE && Math.abs(raw) < HEAD_GIVE_UP) {
        wantYaw = MathUtils.clamp(raw, -HEAD_YAW_LIMIT, HEAD_YAW_LIMIT)
        wantPitch = MathUtils.clamp(
          Math.atan2(scratch.y - HEAD_Y, flat),
          HEAD_PITCH_DOWN,
          HEAD_PITCH_UP,
        )
      }

      const catchUp = 1 - Math.exp(-HEAD_RESPONSE * delta)
      headYaw += (wantYaw - headYaw) * catchUp
      headPitch += (wantPitch - headPitch) * catchUp

      if (head) {
        head.rotation.y = headYaw * 0.75
        head.rotation.x = -headPitch * 0.65
      }

      // --- Cigarette draw glow ---
      const phase = elapsed % DRAG_PERIOD
      let draw = 0
      if (phase >= DRAG_RAISE && phase < DRAG_RAISE + DRAG_HOLD) {
        draw = Math.sin(((phase - DRAG_RAISE) / DRAG_HOLD) * Math.PI)
      }

      if (emberMaterial) {
        emberMaterial.emissiveIntensity = EMBER_IDLE + draw * (EMBER_DRAW - EMBER_IDLE)
      }
    },
  }
}
