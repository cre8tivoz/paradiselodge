/**
 * Keyboard and mouse. Pointer lock lives here.
 *
 * Keys are read by `KeyboardEvent.code`, so the layout is positional and WASD
 * still sits under the left hand on AZERTY.
 */

export type Action = 'forward' | 'back' | 'left' | 'right' | 'crouch' | 'leanLeft' | 'leanRight'

const BINDINGS: ReadonlyMap<string, Action> = new Map([
  ['KeyW', 'forward'],
  ['ArrowUp', 'forward'],
  ['KeyS', 'back'],
  ['ArrowDown', 'back'],
  ['KeyA', 'left'],
  ['ArrowLeft', 'left'],
  ['KeyD', 'right'],
  ['ArrowRight', 'right'],
  ['KeyC', 'crouch'],
  ['ControlLeft', 'crouch'],
  ['KeyQ', 'leanLeft'],
  ['KeyE', 'leanRight'],
])

export class Input {
  private readonly held = new Set<Action>()
  private readonly pressedThisFrame = new Set<Action>()
  private readonly canvas: HTMLCanvasElement

  private mouseDeltaX = 0
  private mouseDeltaY = 0
  private locked = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
    document.addEventListener('pointerlockchange', this.onPointerLockChange)
    document.addEventListener('mousemove', this.onMouseMove)
    canvas.addEventListener('click', this.requestLock)
  }

  isHeld(action: Action): boolean {
    return this.held.has(action)
  }

  /** True only on the frame the key went down. Cleared by `endFrame`. */
  wasPressed(action: Action): boolean {
    return this.pressedThisFrame.has(action)
  }

  get isLocked(): boolean {
    return this.locked
  }

  /** Accumulated mouse travel in pixels since the last `endFrame`. */
  get lookDelta(): { x: number; y: number } {
    return { x: this.mouseDeltaX, y: this.mouseDeltaY }
  }

  /** Call once at the end of every frame. */
  endFrame(): void {
    this.mouseDeltaX = 0
    this.mouseDeltaY = 0
    this.pressedThisFrame.clear()
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
    document.removeEventListener('pointerlockchange', this.onPointerLockChange)
    document.removeEventListener('mousemove', this.onMouseMove)
    this.canvas.removeEventListener('click', this.requestLock)
  }

  private readonly requestLock = (): void => {
    if (!this.locked) {
      void this.canvas.requestPointerLock()
    }
  }

  private readonly onPointerLockChange = (): void => {
    this.locked = document.pointerLockElement === this.canvas
    if (!this.locked) {
      this.held.clear()
    }
  }

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (!this.locked) {
      return
    }
    this.mouseDeltaX += event.movementX
    this.mouseDeltaY += event.movementY
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const action = BINDINGS.get(event.code)
    if (action === undefined) {
      return
    }
    event.preventDefault()
    if (!this.held.has(action)) {
      this.pressedThisFrame.add(action)
    }
    this.held.add(action)
  }

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const action = BINDINGS.get(event.code)
    if (action === undefined) {
      return
    }
    event.preventDefault()
    this.held.delete(action)
  }

  /** Alt-tabbing away must not leave Miller walking into a wall forever. */
  private readonly onBlur = (): void => {
    this.held.clear()
    this.pressedThisFrame.clear()
  }
}
