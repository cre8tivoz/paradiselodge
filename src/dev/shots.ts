import { Vector3 } from 'three'
import type { PlayerController } from '../player/controller.ts'
import type { Hands } from '../player/hands/hands.ts'
import type { Hud } from '../ui/hud.ts'
import type { Rosie } from '../npc/rosie.ts'
import type { StationWorld } from '../world/scene2-station.ts'
import type { LanewayWorld } from '../world/scene3-laneway.ts'
import type { InterviewWorld } from '../world/scene4-interview.ts'
import type { PubWorld } from '../world/scene5-pub.ts'

/**
 * Named camera poses for `tools/shot.mjs`. Capture mode only.
 *
 * Room 1A sits at (4.0, 3.45, 2.6) turned π/2. Local −Z is the hall door, so
 * the doorway is world x ≈ 1.7, z ≈ 2.6. Looking into the room is +X (yaw −π/2).
 */

export interface ShotContext {
  readonly player: PlayerController
  readonly hands: Hands
  readonly hud: Hud
  readonly hudRoot: HTMLElement
  readonly rosie?: Rosie
  readonly station?: StationWorld
  readonly laneway?: LanewayWorld
  readonly interview?: InterviewWorld
  readonly pub?: PubWorld
}

type ShotFn = (ctx: ShotContext) => void

const SHOTS: Record<string, ShotFn> = {
  /** Street approach toward the complete front elevation. */
  'scene1-exterior': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    player.place(new Vector3(-5.8, -0.85, -8.2), -2.5, 0.18)
  },

  'scene1-commodore-front': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    player.place(new Vector3(-7.6, -0.85, -7.6), -2.13, 0.05)
  },

  'scene1-commodore-rear': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    player.place(new Vector3(-0.15, -0.85, -7.75), 2.19, 0.05)
  },

  'scene1-verandah': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    player.place(new Vector3(7.05, 3.45, 0.1), Math.PI, -0.04)
  },

  'scene1-verandah-junction': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    player.place(new Vector3(4.9, 3.45, -1.25), -Math.PI / 2, -0.05)
  },

  'scene1-yard': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    player.place(new Vector3(-2.0, -0.15, 17.5), -1.1, 0.08)
  },

  /**
   * Doorway into 1A. Matches images/mood/1a-target.png's wide framing:
   * standing just inside the threshold, door jamb on one side, bed and sash
   * filling the room.
   */
  '1a': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    // Standing near the front window / dresser, looking at the bed so the
    // sash beam, Crystal, iron frame and wardrobe match the target's subject.
    // Yaw 0 = −Z; π + a bit looks past +Z toward the bed wall.
    player.place(new Vector3(3.55, 3.45, 1.05), Math.PI + 0.55, -0.1)
  },

  /**
   * Close on the bed, because Crystal resting on the spread is a centimetre
   * question and the doorway camera is three metres away. Not a shot the game
   * ever takes.
   */
  '1a-bed': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    player.place(new Vector3(2.35, 3.45, 1.85), Math.PI + 1.05, -0.34)
  },

  'unit-a-reception': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    player.place(new Vector3(2.05, 0, 1.18), -2.35, -0.12)
  },

  'unit-a-parlour': ({ player, hands, hudRoot, rosie }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    rosie?.setStation('parlour')
    player.place(new Vector3(-2.15, 0, 4.55), 0.5, -0.06)
  },

  'scene1-parlour-rosie': ({ player, hands, hudRoot, rosie }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    rosie?.setStation('parlour')
    const aim = lookAim(new Vector3(-2.2, 1.7, 3.2), new Vector3(-3.05, 1.45, 0.75))
    player.place(new Vector3(-2.2, 0, 3.2), aim.yaw, aim.pitch)
  },

  'unit-a-staircase': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    player.place(new Vector3(1.3, 0, 4.15), 2.61, 0.07)
  },

  'unit-a-hallway': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    player.place(new Vector3(0.92, 3.45, 9.62), 0.03, -0.03)
  },

  /** Dusk look stills. Feet on the floor under the look-test cameras. */
  'look-reception': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    const aim = lookAim(new Vector3(5.05, 1.7, 0.55), new Vector3(3.95, 1.4, 3.1))
    player.place(new Vector3(5.05, 0, 0.55), aim.yaw, aim.pitch)
  },

  'look-hall': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    const aim = lookAim(new Vector3(0.9, 1.7, 0.6), new Vector3(-0.8, 2.0, 7.8))
    player.place(new Vector3(0.9, 0, 0.6), aim.yaw, aim.pitch)
  },

  'look-parlour': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    const aim = lookAim(new Vector3(-3.5, 1.7, 4.95), new Vector3(-5.1, 0.95, 1.0))
    player.place(new Vector3(-3.5, 0, 4.95), aim.yaw, aim.pitch)
  },

  'look-exterior': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    const aim = lookAim(new Vector3(-13.5, 0.85, -9.5), new Vector3(2.0, 2.9, -2.0))
    player.place(new Vector3(-13.5, -0.85, -9.5), aim.yaw, aim.pitch)
  },

  /* --- Scene 2 Station Shots --- */
  'station-bullpen': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    const aim = lookAim(new Vector3(-1.5, 1.7, 3.6), new Vector3(0.5, 1.2, -1.0))
    player.place(new Vector3(-1.5, 0, 3.6), aim.yaw, aim.pitch)
  },

  'station-desk': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    const aim = lookAim(new Vector3(-1.85, 1.7, -0.1), new Vector3(-1.85, 0.95, 1.05))
    player.place(new Vector3(-1.85, 0, -0.1), aim.yaw, aim.pitch)
  },

  'station-forensics': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    const aim = lookAim(new Vector3(-2.5, 1.7, -2.8), new Vector3(-2.5, 1.2, -4.3))
    player.place(new Vector3(-2.5, 0, -2.8), aim.yaw, aim.pitch)
  },

  'station-urn': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    const aim = lookAim(new Vector3(-4.8, 1.7, 1.5), new Vector3(-6.15, 1.25, 1.5))
    player.place(new Vector3(-4.8, 0, 1.5), aim.yaw, aim.pitch)
  },

  'station-interview': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    const aim = lookAim(new Vector3(5.35, 1.7, -2.4), new Vector3(5.35, 1.0, -3.98))
    player.place(new Vector3(5.35, 0, -2.4), aim.yaw, aim.pitch)
  },

  'laneway-street': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    const aim = lookAim(new Vector3(-2.2, 1.7, 12.0), new Vector3(-1.8, 1.2, 4.0))
    player.place(new Vector3(-2.2, 0, 12.0), aim.yaw, aim.pitch)
  },

  'laneway-chase': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    const aim = lookAim(new Vector3(0.5, 1.7, 1.5), new Vector3(0.5, 1.3, -12.0))
    player.place(new Vector3(0.5, 0, 1.5), aim.yaw, aim.pitch)
  },

  'laneway-fence': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    const aim = lookAim(new Vector3(0.6, 1.7, -17.5), new Vector3(0.6, 0.1, -19.6))
    player.place(new Vector3(0.6, 0, -17.5), aim.yaw, aim.pitch)
  },

  'interview-room': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    const aim = lookAim(new Vector3(-1.8, 1.6, -1.8), new Vector3(0.2, 0.9, 0.4))
    player.place(new Vector3(-1.8, 0, -1.8), aim.yaw, aim.pitch)
  },

  'interview-victor': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    const aim = lookAim(new Vector3(0, 1.4, -0.9), new Vector3(0, 1.15, 0.82))
    player.place(new Vector3(0, 0, -0.9), aim.yaw, aim.pitch)
  },

  'interview-recorder': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    const aim = lookAim(new Vector3(-0.3, 1.4, -0.6), new Vector3(-0.3, 0.8, 0.0))
    player.place(new Vector3(-0.3, 0, -0.6), aim.yaw, aim.pitch)
  },

  'mahoneys-bar': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    player.place(new Vector3(0.0, 0, 3.5), 0.55, -0.06)
  },

  'mahoneys-pool': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    player.place(new Vector3(0.0, 0, 3.5), -0.55, -0.06)
  },

  'mahoneys-cellar': ({ player, hands, hudRoot }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    const aim = lookAim(new Vector3(-3.5, -0.6, -10.0), new Vector3(-3.5, -1.9, -13.0))
    player.place(new Vector3(-3.5, -2.0, -10.0), aim.yaw, aim.pitch)
  },

  'mahoneys-exit': ({ player, hands, hudRoot, pub }) => {
    hudRoot.style.display = 'none'
    hands.setVisible(false)
    pub?.setSterlingFleeing(true)
    const aim = lookAim(new Vector3(3.0, 1.7, -2.5), new Vector3(4.8, 1.3, -4.3))
    player.place(new Vector3(3.0, 0, -2.5), aim.yaw, aim.pitch)
  },
}

function lookAim(eye: Vector3, target: Vector3): { yaw: number; pitch: number } {
  const dx = target.x - eye.x
  const dy = target.y - eye.y
  const dz = target.z - eye.z
  return {
    yaw: Math.atan2(-dx, -dz),
    pitch: Math.atan2(dy, Math.hypot(dx, dz)),
  }
}

export function listShots(): string[] {
  return Object.keys(SHOTS)
}

export function applyShot(name: string, ctx: ShotContext): string {
  const shot = SHOTS[name]
  if (shot === undefined) {
    return `unknown:${name}`
  }
  shot(ctx)
  return name
}
