/**
 * Keyboard and mouse. Pointer lock lives here.
 *
 * Keys are read by `KeyboardEvent.code`, so the layout is positional and WASD
 * still sits under the left hand on AZERTY.
 */

export type Action =
  | 'forward'
  | 'back'
  | 'left'
  | 'right'
  | 'run'
  | 'crouch'
  | 'leanLeft'
  | 'leanRight'
  | 'examine'
  | 'notebook'

const BINDINGS: ReadonlyMap<string, Action> = new Map([
  ['KeyW', 'forward'],
  ['ArrowUp', 'forward'],
  ['KeyS', 'back'],
  ['ArrowDown', 'back'],
  ['KeyA', 'left'],
  ['ArrowLeft', 'left'],
  ['KeyD', 'right'],
  ['ArrowRight', 'right'],
  ['ShiftLeft', 'run'],
  ['ShiftRight', 'run'],
  ['KeyC', 'crouch'],
  ['ControlLeft', 'crouch'],
  ['KeyQ', 'leanLeft'],
  ['KeyE', 'leanRight'],
  ['KeyF', 'examine'],
  ['KeyN', 'notebook'],
])

export class Input {
  private readonly held = new Set<Action>()
  private readonly pressedThisFrame = new Set<Action>()
  private readonly canvas: HTMLCanvasElement

  private mouseDeltaX = 0
  private mouseDeltaY = 0
  private locked = false
  private dragging = false
  private lockRefused = false

  /**
   * Called if the browser refuses pointer lock, so the UI can say so instead
   * of leaving the player clicking a dead canvas. Some embedded and sandboxed
   * documents reject it outright with WrongDocumentError.
   */
  onLockRefused: (() => void) | undefined = undefined

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
    document.addEventListener('pointerlockchange', this.onPointerLockChange)
    document.addEventListener('mousemove', this.onMouseMove)
    window.addEventListener('mouseup', this.onMouseUp)
    canvas.addEventListener('mousedown', this.onMouseDown)
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

  /** True once the browser has refused pointer lock in this document. */
  get isLockRefused(): boolean {
    return this.lockRefused
  }

  /**
   * Whether mouse movement should turn the view. Pointer lock when it is
   * granted, held left button when it is not, so looking around still works in
   * documents that refuse the lock.
   */
  get isLooking(): boolean {
    return this.locked || this.dragging
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
    window.removeEventListener('mouseup', this.onMouseUp)
    this.canvas.removeEventListener('mousedown', this.onMouseDown)
    this.canvas.removeEventListener('click', this.requestLock)
  }

  private readonly requestLock = (): void => {
    if (this.locked) {
      return
    }
    // Browsers reject this when the document is not focused, and embedded
    // frames need allow="pointer-lock". Swallowing it silently makes mouse
    // look look broken for no stated reason, so say why.
    const refuse = (error: unknown): void => {
      this.lockRefused = true
      console.warn('Pointer lock refused. Falling back to drag to look.', error)
      this.onLockRefused?.()
    }

    try {
      const request: unknown = this.canvas.requestPointerLock()
      if (request instanceof Promise) {
        request.catch(refuse)
      }
    } catch (error) {
      refuse(error)
    }
  }

  private readonly onMouseDown = (event: MouseEvent): void => {
    if (event.button === 0) {
      this.dragging = true
    }
  }

  private readonly onMouseUp = (): void => {
    this.dragging = false
  }

  private readonly onPointerLockChange = (): void => {
    this.locked = document.pointerLockElement === this.canvas
    if (!this.locked) {
      this.held.clear()
    }
  }

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (!this.locked && !this.dragging) {
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
    // A mouseup delivered to another window never reaches us.
    this.dragging = false
  }
}
