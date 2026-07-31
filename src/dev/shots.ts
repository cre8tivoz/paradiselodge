import { Vector3 } from 'three'
import type { PlayerController } from '../player/controller.ts'
import type { Hands } from '../player/hands/hands.ts'
import type { Hud } from '../ui/hud.ts'

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
}

type ShotFn = (ctx: ShotContext) => void

const SHOTS: Record<string, ShotFn> = {
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
