import { AnimationMixer, Box3, Euler, Group, MathUtils, Quaternion, SkinnedMesh, Vector3 } from 'three'
import type { Mesh, Object3D } from 'three'
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
 * So she is one figure with two stations, not two figures. Relocating rather
 * than duplicating is what makes the parlour beat land: the player was told
 * where she would be, and she is there.
 *
 * Geometry comes from public/models/rosie-rigged.glb. She is the image-to-3D
 * figure: one Mixamo skeleton, `idle` and `walk` clips, WebP textures.
 * docs/MOVING-FORWARD.md owns how she, and the rest of the cast, are made.
 * This file is the only one that knows about the glTF.
 *
 * ## The clip is the body. The head is the only thing left to drive
 *
 * MOVING-FORWARD.md: "Put rigged Rosie at reception. Idle while she stands."
 *
 * The idle clip owns everything below the neck: breath, weight, the small sway
 * of a person standing still. None of that is written here any more, because
 * the clip does it properly and writing over it would only fight it.
 *
 * What a clip cannot do is react. She still turns her head to whoever is
 * talking to her, and that is the one transform this file writes. It goes on
 * after the mixer, as an offset in the head bone's own frame, so the next
 * update overwrites it and nothing accumulates.
 *
 * ## The cigarette is the one thing the clip does not cover
 *
 * The drag-to-mouth was procedural on the old mesh and is retired here: a
 * generic idle does not smoke, so her hand stays where the clip puts it and
 * the ember holds a constant glow. Worth knowing at reception, because the
 * counter is at 1.06 and a resting hand sits at 0.82, which is why the old
 * build held the arm up at 0.62 and kept the one prop she has in view. That
 * staging is currently lost behind the desk. Getting it back means animating
 * the arm over the clip, which is its own job and not this one.
 *
 * ## She does not walk
 *
 * BRIEF.md has her rooted at both stations, so the `walk` clip is not used.
 * MOVING-FORWARD.md flags it: the walk carries root motion and is not in
 * place. She relocates between beats, off screen, the way she always has.
 */

const MODEL_URL = '/models/rosie-rigged.glb'
const IDLE_CLIP = 'idle'

/*
 * The head is found by pattern, never by a literal name.
 *
 * The export tooling is documented to emit qualified bone names
 * (`mixamorig\d*:?Head`), and a re-export can shift the prefix. A literal name
 * would not fail loudly at the join: it would fail the whole build, because
 * main.ts awaits this before the scene exists. The lookdev harness resolves it
 * the same way, with the same fallback. See tools/lookdev/src/character_rigged.js.
 */
const HEAD_BONE = /mixamorig\d*:?Head$/i
const HEAD_BONE_FALLBACK = /head$/i

/** Alpha-masked hair cards. Shadow-casting cards read as spikes. */
const HAIR_MESH = 'hair_cards'

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
 * Two reasons, and neither is taste: there is no seated pose, and an armchair
 * would put her below Miller's eyeline for a conversation the player is meant
 * to take seriously. The window also backlights her, which is the only
 * interesting light in that room.
 */
export const STATIONS: Readonly<Record<StationId, Station>> = {
  reception: {
    position: new Vector3(3.5, 0, 3.15),
    yaw: 0,
    dialogueId: 'rosie.reception',
    description: 'Rosie in her infamous cardigan, glasses pushed up.',
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

/** She turns her head this far and no further. Past it she turns nothing. */
const HEAD_YAW_LIMIT = 0.75
const HEAD_PITCH_DOWN = -0.34
const HEAD_PITCH_UP = 0.4
/** Beyond this she is not being spoken to and stops tracking. */
const HEAD_GIVE_UP = 1.4
const HEAD_RANGE = 4.5
const HEAD_RESPONSE = 4.5

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
  root.add(gltf.scene)

  gltf.scene.traverse((object) => {
    const mesh = object as Mesh
    if (mesh.isMesh !== true) {
      return
    }
    mesh.receiveShadow = true
    mesh.castShadow = object.name !== HAIR_MESH
    if (object instanceof SkinnedMesh) {
      /*
       * A skinned mesh keeps its bind-pose bounds, so three culls her against a
       * box that does not follow the clip. Half a stride off camera and she
       * blinks out of the room.
       */
      object.frustumCulled = false
    }
  })

  /*
   * Feet on the floor, whatever the export left behind.
   *
   * The old mesh was authored to stand on its origin. This one comes out of
   * the Mixamo export, and 1.65 m tall is the only thing promised about it, so
   * the floor is measured rather than assumed. A model already sitting at zero
   * moves by nothing.
   */
  root.updateMatrixWorld(true)
  const bounds = new Box3().setFromObject(gltf.scene)
  gltf.scene.position.y -= bounds.min.y

  const head = matchNode(gltf.scene, HEAD_BONE) ?? matchNode(gltf.scene, HEAD_BONE_FALLBACK)
  if (head === undefined) {
    throw new Error('Rosie glTF has no head bone')
  }

  root.updateMatrixWorld(true)
  /*
   * Head bone height above the floor. The look-at pitch is measured from here,
   * so it is read off the mesh rather than carried over from the old one.
   */
  const headY = head.getWorldPosition(new Vector3()).y

  const clip = gltf.animations.find((candidate) => candidate.name === IDLE_CLIP)
  if (clip === undefined) {
    throw new Error(`Rosie glTF has no "${IDLE_CLIP}" clip`)
  }

  /*
   * Does the clip drive the head itself?
   *
   * If it does, the mixer has written the head this frame and the offset below
   * goes on top. If it does not, the bone still holds whatever this file wrote
   * last frame, so it has to be put back first or the yaw would ratchet.
   */
  const headTracked = clip.tracks.some((track) => track.name.startsWith(`${head.name}.`))
  const headRest = head.quaternion.clone()

  const mixer = new AnimationMixer(gltf.scene)
  mixer.clipAction(clip).play()

  const scratch = new Vector3()
  const headOffset = new Quaternion()
  const headEuler = new Euler(0, 0, 0, 'YXZ')

  const solids: Box3[] = [new Box3()]

  let stationId: StationId = 'reception'
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
      mixer.update(delta)

      if (!headTracked) {
        head.quaternion.copy(headRest)
      }

      scratch.copy(playerFeet)
      scratch.y += PLAYER.eyeHeightStand
      root.worldToLocal(scratch)

      const flat = Math.hypot(scratch.x, scratch.z)
      const raw = Math.atan2(-scratch.x, -scratch.z)

      let wantYaw = 0
      let wantPitch = 0
      if (flat < HEAD_RANGE && Math.abs(raw) < HEAD_GIVE_UP) {
        wantYaw = MathUtils.clamp(raw, -HEAD_YAW_LIMIT, HEAD_YAW_LIMIT)
        wantPitch = MathUtils.clamp(
          Math.atan2(scratch.y - headY, flat),
          HEAD_PITCH_DOWN,
          HEAD_PITCH_UP,
        )
      }

      const catchUp = 1 - Math.exp(-HEAD_RESPONSE * delta)
      headYaw += (wantYaw - headYaw) * catchUp
      headPitch += (wantPitch - headPitch) * catchUp

      // Yaw about the bone's own Y, then pitch about the new local X. Written
      // after the mixer, so it is an offset on the clip rather than a fight.
      headEuler.set(headPitch, headYaw, 0, 'YXZ')
      headOffset.setFromEuler(headEuler)
      head.quaternion.multiply(headOffset)
    },
  }
}

/**
 * First node whose name matches, in traversal order.
 *
 * A pattern rather than a literal name, because the export tooling is
 * documented to emit qualified Mixamo bone names and a re-export can shift the
 * prefix. The lookdev harness resolves the head the same way, with the same
 * fallback: tools/lookdev/src/character_rigged.js.
 */
function matchNode(root: Object3D, pattern: RegExp): Object3D | undefined {
  const matches: Object3D[] = []
  root.traverse((object) => {
    if (matches.length === 0 && pattern.test(object.name) === true) {
      matches.push(object)
    }
  })
  return matches.length > 0 ? matches[0] : undefined
}
