import type { Vector3 } from 'three'
import type { SceneId } from '../core/save.ts'
import { Ambience } from './ambience.ts'
import { Footsteps } from './footsteps.ts'
import { Foley } from './foley.ts'
import { Mixer } from './mixer.ts'

/**
 * The audio subsystem, as one thing for `main.ts` to hold.
 *
 * Everything under `src/audio/` is synthesised through Web Audio and no sound
 * file ships (except the 5 score tracks handled by SoundtrackPlayer).
 *
 * Footsteps and foley subscribe to the bus themselves. Ambience is the only part
 * that needs telling anything, because where Miller is standing is not an event.
 */
export class Audio {
  /**
   * Public so the dev handle can tap a bus and measure it. `main.ts` never
   * touches it: it calls `unlock`, `setScene`, and `update`.
   */
  readonly mixer: Mixer
  private readonly ambience: Ambience
  private readonly footsteps: Footsteps
  readonly foley: Foley

  constructor(initialScene: SceneId = 'scene1') {
    this.mixer = new Mixer()
    this.ambience = new Ambience(this.mixer, initialScene)
    this.footsteps = new Footsteps(this.mixer)
    this.foley = new Foley(this.mixer)
  }

  /** Switch environmental ambience beds when transitioning scenes. */
  setScene(id: SceneId): void {
    this.ambience.setScene(id)
  }

  /**
   * Wire this to the same click that asks for pointer lock.
   *
   * A browser will not run an AudioContext until the user has interacted, and it
   * fails quietly: the context is `suspended`, everything scheduled is
   * discarded, and there is no error anywhere. Starting the beds only after the
   * context is actually running is what makes that a non-issue rather than an
   * intermittent silence.
   */
  unlock(): void {
    this.mixer.resume()
    // resume() is a promise, so the context is usually not running yet on this
    // line. Ambience.start is a no-op until it is, and update() retries.
    this.ambience.start()
  }

  update(playerFeet: Vector3): void {
    this.ambience.start()
    this.ambience.update(playerFeet)
  }

  dispose(): void {
    this.ambience.dispose()
    this.footsteps.dispose()
    this.foley.dispose()
    this.mixer.dispose()
  }
}
