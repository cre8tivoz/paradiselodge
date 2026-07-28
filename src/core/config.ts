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
  /**
   * Run. Only forward, only standing. There is no stamina and no fail state,
   * so this is a speed change and nothing else. Scene 3's chase is scripted
   * and designed to be lost, so run never has to be balanced against AI.
   */
  runSpeed: 4.6,

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
  /** A runner covers more ground per step, so footsteps must not machine-gun. */
  runStrideLength: 1.15,
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
  /**
   * Delta is clamped to this so a tabbed-out frame cannot teleport Miller.
   *
   * It is also the tunnelling guard. Collision is a pushout, not a swept test,
   * so a single frame must never carry Miller past the midplane of a wall.
   * That budget is `radius` + half the wall thickness, or 0.32 + 0.15 = 0.47.
   * At runSpeed 4.6 this clamp allows 4.6 * 0.05 = 0.23, which is half of it.
   *
   * Raise runSpeed or this number and check that sum again, or Miller will go
   * through a wall on a stalled frame.
   */
  maxDelta: 0.05,
} as const

export const RENDER = {
  maxPixelRatio: 2,
} as const

export const INTERACT = {
  /**
   * How far Miller can look at something. Arm's reach and a bit. Short enough
   * that he has to walk up to a thing, which is most of the pacing.
   */
  lookRange: 3,
  /** Seconds for the description line to fade in and out. */
  descriptionFade: 0.18,
} as const
