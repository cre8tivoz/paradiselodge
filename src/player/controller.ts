import { Euler, PerspectiveCamera, Vector3 } from 'three'
import { CAMERA, PLAYER } from '../core/config.ts'
import { approach } from '../core/loop.ts'
import { emit } from '../core/events.ts'
import type { Stance, Surface } from '../core/events.ts'
import type { Input } from '../core/input.ts'
import type { CollisionSolver } from '../world/collision.ts'

/**
 * First person player controller. Walk, crouch, lean, mouse look.
 *
 * No body, no hands. There is no gravity and no jump: Miller walks on flat
 * authored floors and the design never asks him to leave one.
 */
export class PlayerController {
  /** Feet. The floor Miller is standing on is y = position.y. */
  readonly position = new Vector3()

  private readonly camera: PerspectiveCamera
  private readonly input: Input
  private readonly solver: CollisionSolver

  private yaw = 0
  private pitch = 0

  private readonly velocity = new Vector3()

  private stance: Stance = 'stand'
  private crouchToggled = false
  /** Annotated because PLAYER is `as const` and would infer the literal 1.7. */
  private eyeHeight: number = PLAYER.eyeHeightStand

  /** -1 fully left, 1 fully right. */
  private lean = 0

  private stridePhase = 0
  private surface: Surface = 'floorboard'

  private readonly scratchMove = new Vector3()
  private readonly scratchTarget = new Vector3()
  private readonly scratchCameraPos = new Vector3()
  private readonly scratchRight = new Vector3()
  private readonly euler = new Euler(0, 0, 0, 'YXZ')

  constructor(
    camera: PerspectiveCamera,
    input: Input,
    solver: CollisionSolver,
    spawn: Vector3,
  ) {
    this.camera = camera
    this.input = input
    this.solver = solver
    this.position.copy(spawn)
    this.eyeHeight = PLAYER.eyeHeightStand
    this.syncCamera(0)
  }

  /** The world tells the controller what it is walking on. */
  setSurface(surface: Surface): void {
    this.surface = surface
  }

  get currentStance(): Stance {
    return this.stance
  }

  get speed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z)
  }

  update(delta: number): void {
    this.updateLook(delta)
    this.updateStance(delta)
    this.updateMovement(delta)
    this.updateLean(delta)
    this.syncCamera(delta)
  }

  private updateLook(_delta: number): void {
    if (!this.input.isLocked) {
      return
    }
    const look = this.input.lookDelta
    this.yaw -= look.x * CAMERA.sensitivity
    this.pitch -= look.y * CAMERA.sensitivity
    this.pitch = Math.min(Math.max(this.pitch, -CAMERA.pitchClamp), CAMERA.pitchClamp)
  }

  private updateStance(delta: number): void {
    if (PLAYER.crouchIsToggle) {
      if (this.input.wasPressed('crouch')) {
        this.crouchToggled = !this.crouchToggled
      }
    } else {
      this.crouchToggled = this.input.isHeld('crouch')
    }

    const next: Stance = this.crouchToggled ? 'crouch' : 'stand'
    if (next !== this.stance) {
      this.stance = next
      emit('player:state', { stance: next })
    }

    const targetHeight = this.stance === 'crouch' ? PLAYER.eyeHeightCrouch : PLAYER.eyeHeightStand
    this.eyeHeight = approach(this.eyeHeight, targetHeight, PLAYER.stanceResponse, delta)
  }

  private updateMovement(delta: number): void {
    let forward = 0
    let strafe = 0

    if (this.input.isHeld('forward')) {
      forward += 1
    }
    if (this.input.isHeld('back')) {
      forward -= 1
    }
    if (this.input.isHeld('right')) {
      strafe += 1
    }
    if (this.input.isHeld('left')) {
      strafe -= 1
    }

    // Normalise so diagonals are not faster than the straights.
    const magnitude = Math.hypot(forward, strafe)
    if (magnitude > 1) {
      forward /= magnitude
      strafe /= magnitude
    }

    const maxSpeed = this.stance === 'crouch' ? PLAYER.crouchSpeed : PLAYER.walkSpeed
    const sin = Math.sin(this.yaw)
    const cos = Math.cos(this.yaw)

    // Yaw 0 looks down -Z, which is the three.js convention.
    this.scratchTarget.set(
      (strafe * cos - forward * sin) * maxSpeed,
      0,
      (-strafe * sin - forward * cos) * maxSpeed,
    )

    this.velocity.x = approach(this.velocity.x, this.scratchTarget.x, PLAYER.groundResponse, delta)
    this.velocity.z = approach(this.velocity.z, this.scratchTarget.z, PLAYER.groundResponse, delta)

    this.scratchMove.copy(this.position).addScaledVector(this.velocity, delta)

    const resolved = this.solver.resolve(this.position, this.scratchMove, PLAYER.radius)
    const travelled = Math.hypot(resolved.x - this.position.x, resolved.z - this.position.z)
    this.position.copy(resolved)

    // Bleed off velocity that collision ate, so Miller does not keep building
    // speed into a wall and then shoot sideways the moment it ends.
    if (travelled < 1e-6) {
      this.velocity.set(0, 0, 0)
    }

    this.advanceStride(travelled)
  }

  private advanceStride(travelled: number): void {
    if (travelled <= 0) {
      return
    }
    const before = this.stridePhase
    this.stridePhase += travelled / PLAYER.strideLength

    if (Math.floor(this.stridePhase) > Math.floor(before)) {
      emit('player:footstep', {
        position: this.position.clone(),
        surface: this.surface,
        speed: this.speed,
      })
    }
  }

  private updateLean(delta: number): void {
    let target = 0
    if (this.input.isHeld('leanLeft')) {
      target -= 1
    }
    if (this.input.isHeld('leanRight')) {
      target += 1
    }

    if (target !== 0) {
      // Do not lean through a wall. Test where the head would end up.
      this.scratchRight.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw))
      this.scratchCameraPos
        .copy(this.position)
        .addScaledVector(this.scratchRight, target * PLAYER.leanOffset)
      this.scratchCameraPos.y = this.position.y + this.eyeHeight

      if (!this.solver.isClear(this.scratchCameraPos, PLAYER.radius * 0.6)) {
        target = 0
      }
    }

    this.lean = approach(this.lean, target, PLAYER.leanResponse, delta)
  }

  private syncCamera(_delta: number): void {
    this.scratchRight.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw))

    let bob = 0
    if (PLAYER.headBobEnabled) {
      bob = Math.sin(this.stridePhase * Math.PI * 2) * PLAYER.headBobAmplitude
    }

    this.scratchCameraPos
      .copy(this.position)
      .addScaledVector(this.scratchRight, this.lean * PLAYER.leanOffset)
    this.scratchCameraPos.y = this.position.y + this.eyeHeight + bob

    this.camera.position.copy(this.scratchCameraPos)
    this.euler.set(this.pitch, this.yaw, -this.lean * PLAYER.leanAngle)
    this.camera.quaternion.setFromEuler(this.euler)
  }
}
