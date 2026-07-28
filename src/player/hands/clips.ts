import type { HandClip } from './clip.ts'

/**
 * The bespoke examine animations. One per object, authored by hand.
 *
 * ASSETS.md budgets roughly a dozen of these for scene 1 and lists what each
 * one does. This file holds them.
 *
 * Note how the anchoring moves through a clip. Reaching and setting down are
 * anchored, so they happen at the object that is really there. The lift and
 * the turn are in camera space, because by then Miller has the thing in his
 * hand and has brought it up to his face to look at it. Anchoring those beats
 * too would leave him studying something at arm's length down on the dresser.
 */

/**
 * "Pick up, turn, set down exactly as found." The photo frame in room 1A.
 *
 * The beat that matters is the turn. He lifts it, rolls it over, and puts it
 * back the way it was. He does not pocket it, because he never pockets
 * anything.
 */
export const TURN_OVER: HandClip = {
  id: 'turnOver',
  duration: 3.8,
  right: [
    // Below frame.
    {
      t: 0,
      position: [0.22, -0.42, -0.30],
      rotation: [-0.20, 0.60, 0],
      curl: [0.25, 0.3, 0.3, 0.3, 0.35],
      ease: 'out',
    },
    // Coming in over the object, open.
    {
      t: 0.6,
      position: [0.12, 0.06, 0.10],
      rotation: [-0.32, 0.80, -0.12],
      curl: [0.12, 0.10, 0.10, 0.10, 0.14],
      anchored: true,
      ease: 'out',
    },
    // Down onto it, still open.
    {
      t: 1.0,
      position: [0.055, 0.010, 0.045],
      rotation: [-0.30, 0.78, -0.15],
      curl: [0.14, 0.12, 0.12, 0.12, 0.16],
      anchored: true,
      ease: 'inOut',
    },
    // Closed on it.
    {
      t: 1.35,
      position: [0.055, -0.015, 0.045],
      rotation: [-0.30, 0.78, -0.15],
      curl: [0.60, 0.64, 0.66, 0.64, 0.58],
      anchored: true,
      ease: 'inOut',
    },
    // Lifted and brought up to the face. Camera space from here.
    {
      t: 1.85,
      position: [0.11, -0.12, -0.44],
      rotation: [-0.10, 0.75, -0.60],
      curl: [0.62, 0.66, 0.68, 0.66, 0.60],
      ease: 'inOut',
    },
    /*
     * Turned over. This is the beat the whole animation exists for, so it is a
     * real turn, near enough to 180 degrees, and the wrist ends palm up.
     */
    {
      t: 2.35,
      position: [0.06, -0.10, -0.38],
      rotation: [0.40, 0.45, -3.00],
      curl: [0.52, 0.55, 0.57, 0.55, 0.50],
      ease: 'inOut',
    },
    // Rolled back the way it was.
    {
      t: 2.85,
      position: [0.11, -0.13, -0.45],
      rotation: [-0.12, 0.76, -0.45],
      curl: [0.62, 0.66, 0.68, 0.66, 0.60],
      ease: 'inOut',
    },
    // Set down, exactly where it was.
    {
      t: 3.15,
      position: [0.055, -0.012, 0.045],
      rotation: [-0.30, 0.78, -0.15],
      curl: [0.60, 0.64, 0.66, 0.64, 0.58],
      anchored: true,
      ease: 'inOut',
    },
    // Released.
    {
      t: 3.4,
      position: [0.06, 0.025, 0.05],
      rotation: [-0.30, 0.78, -0.15],
      curl: [0.16, 0.13, 0.13, 0.13, 0.17],
      anchored: true,
      ease: 'inOut',
    },
    // Withdrawn.
    {
      t: 3.8,
      position: [0.22, -0.42, -0.30],
      rotation: [-0.20, 0.60, 0],
      curl: [0.25, 0.3, 0.3, 0.3, 0.35],
      ease: 'in',
    },
  ],
}
