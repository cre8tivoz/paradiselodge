/**
 * Tunables. Everything a designer would want to feel out lives here, not
 * buried in the controller.
 *
 * Units are metres, seconds, radians.
 */

const DEG = Math.PI / 180

export const PLAYER = {
  /** Purposeful walk. Miller is working, not strolling and not jogging. */
  walkSpeed: 2.2,
  crouchSpeed: 1.1,

  /** Exponential approach rate toward target velocity. Higher is snappier. */
  groundResponse: 14,

  eyeHeightStand: 1.7,
  eyeHeightCrouch: 1.05,
  /** Exponential approach rate for the stance change. */
  stanceResponse: 11,

  /** Collision radius of the vertical cylinder Miller occupies. */
  radius: 0.32,

  leanAngle: 14 * DEG,
  leanOffset: 0.42,
  leanResponse: 12,

  /** Distance walked between footstep events. */
  strideLength: 0.78,
  /** Vertical head travel across a stride. Deliberately small. */
  headBobAmplitude: 0.018,
  headBobEnabled: true,

  /** Hold to crouch. Set true to toggle instead. */
  crouchIsToggle: false,
} as const

export const CAMERA = {
  fov: 70,
  near: 0.05,
  far: 100,
  /** Radians of yaw or pitch per pixel of mouse travel. */
  sensitivity: 0.0022,
  pitchClamp: 88 * DEG,
} as const

export const LOOP = {
  /** Delta is clamped to this so a tabbed-out frame cannot teleport Miller. */
  maxDelta: 0.1,
} as const

export const RENDER = {
  maxPixelRatio: 2,
} as const
