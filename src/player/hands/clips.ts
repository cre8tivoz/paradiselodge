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

const REST_CURL = [0.25, 0.3, 0.3, 0.3, 0.35] as const
const OPEN_CURL = [0.12, 0.10, 0.10, 0.10, 0.14] as const
const GRIP_CURL = [0.60, 0.64, 0.66, 0.64, 0.58] as const
const PINCH_CURL = [0.55, 0.62, 0.18, 0.18, 0.18] as const
const TWO_FINGER = [0.45, 0.55, 0.55, 0.12, 0.12] as const

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
    {
      t: 0,
      position: [0.22, -0.42, -0.30],
      rotation: [-0.20, 0.60, 0],
      curl: [...REST_CURL],
      ease: 'out',
    },
    {
      t: 0.6,
      position: [0.12, 0.06, 0.10],
      rotation: [-0.32, 0.80, -0.12],
      curl: [...OPEN_CURL],
      anchored: true,
      ease: 'out',
    },
    {
      t: 1.0,
      position: [0.055, 0.010, 0.045],
      rotation: [-0.30, 0.78, -0.15],
      curl: [0.14, 0.12, 0.12, 0.12, 0.16],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 1.35,
      position: [0.055, -0.015, 0.045],
      rotation: [-0.30, 0.78, -0.15],
      curl: [...GRIP_CURL],
      anchored: true,
      ease: 'inOut',
    },
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
    {
      t: 2.85,
      position: [0.11, -0.13, -0.45],
      rotation: [-0.12, 0.76, -0.45],
      curl: [0.62, 0.66, 0.68, 0.66, 0.60],
      ease: 'inOut',
    },
    {
      t: 3.15,
      position: [0.055, -0.012, 0.045],
      rotation: [-0.30, 0.78, -0.15],
      curl: [...GRIP_CURL],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 3.4,
      position: [0.06, 0.025, 0.05],
      rotation: [-0.30, 0.78, -0.15],
      curl: [0.16, 0.13, 0.13, 0.13, 0.17],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 3.8,
      position: [0.22, -0.42, -0.30],
      rotation: [-0.20, 0.60, 0],
      curl: [...REST_CURL],
      ease: 'in',
    },
  ],
}

/** Crystal's head. Crouch in, turn her toward the light. Do not lift her. */
export const TURN_HEAD: HandClip = {
  id: 'turnHead',
  duration: 3.2,
  right: [
    {
      t: 0,
      position: [0.20, -0.48, -0.28],
      rotation: [-0.15, 0.55, 0],
      curl: [...REST_CURL],
      ease: 'out',
    },
    {
      t: 0.55,
      position: [0.08, 0.04, 0.08],
      rotation: [-0.25, 0.70, -0.10],
      curl: [...OPEN_CURL],
      anchored: true,
      ease: 'out',
    },
    {
      t: 1.0,
      position: [0.04, -0.02, 0.02],
      rotation: [-0.20, 0.65, -0.08],
      curl: [0.35, 0.40, 0.38, 0.36, 0.32],
      anchored: true,
      ease: 'inOut',
    },
    // Roll the head toward the sash. Anchored so it stays on her, not in air.
    {
      t: 1.7,
      position: [0.06, -0.01, 0.04],
      rotation: [-0.15, 0.40, -0.55],
      curl: [0.40, 0.45, 0.42, 0.40, 0.35],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 2.4,
      position: [0.04, -0.02, 0.02],
      rotation: [-0.20, 0.65, -0.08],
      curl: [0.35, 0.40, 0.38, 0.36, 0.32],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 2.85,
      position: [0.10, 0.05, 0.10],
      rotation: [-0.25, 0.70, -0.10],
      curl: [...OPEN_CURL],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 3.2,
      position: [0.20, -0.48, -0.28],
      rotation: [-0.15, 0.55, 0],
      curl: [...REST_CURL],
      ease: 'in',
    },
  ],
}

/** Needle. Lean in close. Do not touch. */
export const LEAN_IN: HandClip = {
  id: 'leanIn',
  duration: 2.6,
  right: [
    {
      t: 0,
      position: [0.18, -0.40, -0.32],
      rotation: [-0.25, 0.50, 0],
      curl: [...REST_CURL],
      ease: 'out',
    },
    {
      t: 0.7,
      position: [0.10, 0.08, 0.14],
      rotation: [-0.45, 0.55, -0.20],
      curl: [0.20, 0.18, 0.18, 0.18, 0.22],
      anchored: true,
      ease: 'out',
    },
    // Hold the lean. Fingers stay open. Nothing closes on the barrel.
    {
      t: 1.5,
      position: [0.08, 0.05, 0.10],
      rotation: [-0.50, 0.50, -0.22],
      curl: [0.18, 0.15, 0.15, 0.15, 0.20],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 2.1,
      position: [0.12, 0.10, 0.16],
      rotation: [-0.40, 0.55, -0.15],
      curl: [0.20, 0.18, 0.18, 0.18, 0.22],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 2.6,
      position: [0.18, -0.40, -0.32],
      rotation: [-0.25, 0.50, 0],
      curl: [...REST_CURL],
      ease: 'in',
    },
  ],
}

/** Sling. Two fingers, lift and let it drop. */
export const LIFT_DROP: HandClip = {
  id: 'liftDrop',
  duration: 2.8,
  right: [
    {
      t: 0,
      position: [0.20, -0.42, -0.30],
      rotation: [-0.20, 0.55, 0],
      curl: [...REST_CURL],
      ease: 'out',
    },
    {
      t: 0.5,
      position: [0.06, 0.04, 0.06],
      rotation: [-0.30, 0.70, -0.10],
      curl: [...OPEN_CURL],
      anchored: true,
      ease: 'out',
    },
    {
      t: 0.9,
      position: [0.02, -0.01, 0.02],
      rotation: [-0.25, 0.65, -0.05],
      curl: [...TWO_FINGER],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 1.4,
      position: [0.02, 0.04, 0.02],
      rotation: [-0.20, 0.65, -0.05],
      curl: [...TWO_FINGER],
      anchored: true,
      ease: 'inOut',
    },
    // Release. The tie drops back.
    {
      t: 1.85,
      position: [0.04, 0.02, 0.04],
      rotation: [-0.28, 0.68, -0.08],
      curl: [...OPEN_CURL],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 2.3,
      position: [0.08, 0.06, 0.08],
      rotation: [-0.30, 0.70, -0.10],
      curl: [...OPEN_CURL],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 2.8,
      position: [0.20, -0.42, -0.30],
      rotation: [-0.20, 0.55, 0],
      curl: [...REST_CURL],
      ease: 'in',
    },
  ],
}

/** Windowsill. Crouch, sight along the sill. */
export const SIGHT_SILL: HandClip = {
  id: 'sightSill',
  duration: 2.8,
  right: [
    {
      t: 0,
      position: [0.18, -0.45, -0.28],
      rotation: [-0.10, 0.50, 0],
      curl: [...REST_CURL],
      ease: 'out',
    },
    {
      t: 0.6,
      position: [0.10, 0.02, 0.08],
      rotation: [-0.55, 0.35, -0.30],
      curl: [0.30, 0.28, 0.28, 0.28, 0.32],
      anchored: true,
      ease: 'out',
    },
    // Cheek down to the timber, looking along it.
    {
      t: 1.3,
      position: [0.04, -0.04, 0.02],
      rotation: [-0.70, 0.20, -0.45],
      curl: [0.35, 0.32, 0.32, 0.32, 0.36],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 2.0,
      position: [0.04, -0.04, 0.02],
      rotation: [-0.70, 0.20, -0.45],
      curl: [0.35, 0.32, 0.32, 0.32, 0.36],
      anchored: true,
      ease: 'linear',
    },
    {
      t: 2.4,
      position: [0.10, 0.04, 0.10],
      rotation: [-0.45, 0.40, -0.20],
      curl: [0.25, 0.22, 0.22, 0.22, 0.26],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 2.8,
      position: [0.18, -0.45, -0.28],
      rotation: [-0.10, 0.50, 0],
      curl: [...REST_CURL],
      ease: 'in',
    },
  ],
}

/** Sash. Push it up another inch. */
export const PUSH_SASH: HandClip = {
  id: 'pushSash',
  duration: 2.4,
  right: [
    {
      t: 0,
      position: [0.20, -0.40, -0.30],
      rotation: [-0.15, 0.55, 0],
      curl: [...REST_CURL],
      ease: 'out',
    },
    {
      t: 0.5,
      position: [0.05, 0.02, 0.05],
      rotation: [-0.35, 0.60, -0.10],
      curl: [0.40, 0.45, 0.45, 0.45, 0.42],
      anchored: true,
      ease: 'out',
    },
    {
      t: 0.9,
      position: [0.02, -0.02, 0.02],
      rotation: [-0.40, 0.55, -0.08],
      curl: [...GRIP_CURL],
      anchored: true,
      ease: 'inOut',
    },
    // Shove up.
    {
      t: 1.4,
      position: [0.02, 0.06, 0.02],
      rotation: [-0.35, 0.55, -0.08],
      curl: [...GRIP_CURL],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 1.85,
      position: [0.04, 0.04, 0.04],
      rotation: [-0.30, 0.60, -0.10],
      curl: [0.30, 0.28, 0.28, 0.28, 0.32],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 2.4,
      position: [0.20, -0.40, -0.30],
      rotation: [-0.15, 0.55, 0],
      curl: [...REST_CURL],
      ease: 'in',
    },
  ],
}

/** Lighter. Pick up, turn over, read the base. */
export const TURN_LIGHTER: HandClip = {
  id: 'turnLighter',
  duration: 3.4,
  right: [
    {
      t: 0,
      position: [0.20, -0.40, -0.30],
      rotation: [-0.20, 0.55, 0],
      curl: [...REST_CURL],
      ease: 'out',
    },
    {
      t: 0.5,
      position: [0.06, 0.04, 0.06],
      rotation: [-0.30, 0.75, -0.12],
      curl: [...OPEN_CURL],
      anchored: true,
      ease: 'out',
    },
    {
      t: 0.85,
      position: [0.02, -0.01, 0.02],
      rotation: [-0.25, 0.70, -0.10],
      curl: [...PINCH_CURL],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 1.35,
      position: [0.08, -0.14, -0.40],
      rotation: [-0.05, 0.70, -0.50],
      curl: [...PINCH_CURL],
      ease: 'inOut',
    },
    // Base toward the face.
    {
      t: 1.9,
      position: [0.05, -0.10, -0.36],
      rotation: [0.55, 0.40, -2.6],
      curl: [0.50, 0.58, 0.20, 0.18, 0.18],
      ease: 'inOut',
    },
    {
      t: 2.5,
      position: [0.08, -0.14, -0.40],
      rotation: [-0.05, 0.70, -0.50],
      curl: [...PINCH_CURL],
      ease: 'inOut',
    },
    {
      t: 2.9,
      position: [0.02, -0.01, 0.02],
      rotation: [-0.25, 0.70, -0.10],
      curl: [...PINCH_CURL],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 3.15,
      position: [0.05, 0.04, 0.05],
      rotation: [-0.28, 0.72, -0.10],
      curl: [...OPEN_CURL],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 3.4,
      position: [0.20, -0.40, -0.30],
      rotation: [-0.20, 0.55, 0],
      curl: [...REST_CURL],
      ease: 'in',
    },
  ],
}

/** Travel magazines. Fan the top one open. */
export const FAN_MAGAZINES: HandClip = {
  id: 'fanMagazines',
  duration: 2.6,
  right: [
    {
      t: 0,
      position: [0.20, -0.40, -0.30],
      rotation: [-0.20, 0.55, 0],
      curl: [...REST_CURL],
      ease: 'out',
    },
    {
      t: 0.5,
      position: [0.08, 0.05, 0.08],
      rotation: [-0.35, 0.70, -0.15],
      curl: [...OPEN_CURL],
      anchored: true,
      ease: 'out',
    },
    {
      t: 0.9,
      position: [0.03, 0.01, 0.04],
      rotation: [-0.30, 0.65, -0.10],
      curl: [...PINCH_CURL],
      anchored: true,
      ease: 'inOut',
    },
    // Fan across.
    {
      t: 1.5,
      position: [0.10, 0.03, 0.02],
      rotation: [-0.25, 0.55, -0.35],
      curl: [...PINCH_CURL],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 2.0,
      position: [0.05, 0.04, 0.06],
      rotation: [-0.30, 0.65, -0.12],
      curl: [...OPEN_CURL],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 2.6,
      position: [0.20, -0.40, -0.30],
      rotation: [-0.20, 0.55, 0],
      curl: [...REST_CURL],
      ease: 'in',
    },
  ],
}

/** Map with pins. Lean over it. Do not touch the pins. */
export const LEAN_MAP: HandClip = {
  id: 'leanMap',
  duration: 2.4,
  right: [
    {
      t: 0,
      position: [0.18, -0.40, -0.30],
      rotation: [-0.20, 0.50, 0],
      curl: [...REST_CURL],
      ease: 'out',
    },
    {
      t: 0.6,
      position: [0.12, 0.10, 0.14],
      rotation: [-0.55, 0.45, -0.25],
      curl: [0.22, 0.20, 0.20, 0.20, 0.24],
      anchored: true,
      ease: 'out',
    },
    {
      t: 1.3,
      position: [0.10, 0.06, 0.10],
      rotation: [-0.60, 0.40, -0.28],
      curl: [0.20, 0.18, 0.18, 0.18, 0.22],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 1.9,
      position: [0.12, 0.10, 0.14],
      rotation: [-0.50, 0.45, -0.22],
      curl: [0.22, 0.20, 0.20, 0.20, 0.24],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 2.4,
      position: [0.18, -0.40, -0.30],
      rotation: [-0.20, 0.50, 0],
      curl: [...REST_CURL],
      ease: 'in',
    },
  ],
}

/** The note. Lift the corner. */
export const LIFT_NOTE: HandClip = {
  id: 'liftNote',
  duration: 2.5,
  right: [
    {
      t: 0,
      position: [0.20, -0.40, -0.30],
      rotation: [-0.20, 0.55, 0],
      curl: [...REST_CURL],
      ease: 'out',
    },
    {
      t: 0.5,
      position: [0.06, 0.04, 0.06],
      rotation: [-0.30, 0.70, -0.12],
      curl: [...OPEN_CURL],
      anchored: true,
      ease: 'out',
    },
    {
      t: 0.9,
      position: [0.02, 0.0, 0.02],
      rotation: [-0.25, 0.65, -0.08],
      curl: [...PINCH_CURL],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 1.4,
      position: [0.02, 0.04, 0.02],
      rotation: [-0.20, 0.65, -0.08],
      curl: [...PINCH_CURL],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 1.9,
      position: [0.02, 0.0, 0.02],
      rotation: [-0.25, 0.65, -0.08],
      curl: [...PINCH_CURL],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 2.2,
      position: [0.06, 0.05, 0.06],
      rotation: [-0.28, 0.68, -0.10],
      curl: [...OPEN_CURL],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 2.5,
      position: [0.20, -0.40, -0.30],
      rotation: [-0.20, 0.55, 0],
      curl: [...REST_CURL],
      ease: 'in',
    },
  ],
}

/** Wardrobe or drawer. Open, look, close. */
export const OPEN_LOOK_CLOSE: HandClip = {
  id: 'openLookClose',
  duration: 3.2,
  right: [
    {
      t: 0,
      position: [0.22, -0.42, -0.30],
      rotation: [-0.20, 0.55, 0],
      curl: [...REST_CURL],
      ease: 'out',
    },
    {
      t: 0.5,
      position: [0.08, 0.04, 0.06],
      rotation: [-0.30, 0.70, -0.10],
      curl: [...OPEN_CURL],
      anchored: true,
      ease: 'out',
    },
    {
      t: 0.85,
      position: [0.03, 0.0, 0.02],
      rotation: [-0.25, 0.65, -0.08],
      curl: [...GRIP_CURL],
      anchored: true,
      ease: 'inOut',
    },
    // Pull open.
    {
      t: 1.35,
      position: [0.12, 0.0, 0.08],
      rotation: [-0.20, 0.50, -0.15],
      curl: [...GRIP_CURL],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 1.9,
      position: [0.14, 0.02, 0.10],
      rotation: [-0.30, 0.45, -0.20],
      curl: [0.25, 0.22, 0.22, 0.22, 0.26],
      anchored: true,
      ease: 'inOut',
    },
    // Push shut.
    {
      t: 2.4,
      position: [0.03, 0.0, 0.02],
      rotation: [-0.25, 0.65, -0.08],
      curl: [...GRIP_CURL],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 2.8,
      position: [0.08, 0.05, 0.06],
      rotation: [-0.28, 0.68, -0.10],
      curl: [...OPEN_CURL],
      anchored: true,
      ease: 'inOut',
    },
    {
      t: 3.2,
      position: [0.22, -0.42, -0.30],
      rotation: [-0.20, 0.55, 0],
      curl: [...REST_CURL],
      ease: 'in',
    },
  ],
}

/**
 * Gloves on at the front door. Both hands in frame briefly. No object — the
 * target is just a reach point so the clip has somewhere to aim.
 */
export const GLOVES_ON: HandClip = {
  id: 'glovesOn',
  duration: 1.7,
  right: [
    {
      t: 0,
      position: [0.18, -0.38, -0.28],
      rotation: [-0.4, 0.3, 0.2],
      curl: [...OPEN_CURL],
      ease: 'out',
    },
    {
      t: 0.35,
      position: [0.12, -0.22, -0.35],
      rotation: [-0.8, 0.1, 0.4],
      curl: [...GRIP_CURL],
      ease: 'inOut',
    },
    {
      t: 0.85,
      position: [0.14, -0.18, -0.32],
      rotation: [-0.5, 0.2, 0.15],
      curl: [...GRIP_CURL],
      ease: 'inOut',
    },
    {
      t: 1.5,
      position: [0.22, -0.42, -0.30],
      rotation: [-0.20, 0.55, 0],
      curl: [...REST_CURL],
      ease: 'in',
    },
  ],
  left: [
    {
      t: 0,
      position: [-0.18, -0.40, -0.28],
      rotation: [-0.4, -0.3, -0.2],
      curl: [...OPEN_CURL],
      ease: 'out',
    },
    {
      t: 0.45,
      position: [-0.10, -0.20, -0.34],
      rotation: [-0.75, -0.1, -0.35],
      curl: [...GRIP_CURL],
      ease: 'inOut',
    },
    {
      t: 1.0,
      position: [-0.12, -0.18, -0.30],
      rotation: [-0.45, -0.15, -0.1],
      curl: [...GRIP_CURL],
      ease: 'inOut',
    },
    {
      t: 1.55,
      position: [-0.22, -0.44, -0.30],
      rotation: [-0.20, -0.55, 0],
      curl: [...REST_CURL],
      ease: 'in',
    },
  ],
}

export const CLIPS = {
  turnOver: TURN_OVER,
  turnHead: TURN_HEAD,
  leanIn: LEAN_IN,
  liftDrop: LIFT_DROP,
  sightSill: SIGHT_SILL,
  pushSash: PUSH_SASH,
  turnLighter: TURN_LIGHTER,
  fanMagazines: FAN_MAGAZINES,
  leanMap: LEAN_MAP,
  liftNote: LIFT_NOTE,
  openLookClose: OPEN_LOOK_CLOSE,
  glovesOn: GLOVES_ON,
} as const

export type ClipId = keyof typeof CLIPS

export function getClip(id: ClipId): HandClip {
  return CLIPS[id]
}
