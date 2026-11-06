import { emit, on } from './events.ts'
import { Save, isSceneId } from './save.ts'
import type { SceneId } from './save.ts'

/**
 * Scene manager. Owns the fade, scene progression, and the save written on a scene boundary.
 */

export interface SceneEvidenceSource {
  /** Evidence IDs currently filed, catalogue order. */
  listIds(): readonly string[]
}

export class SceneManager {
  private readonly save = new Save()
  private readonly fade: HTMLDivElement
  private readonly evidence: SceneEvidenceSource
  private current: SceneId = 'scene1'
  private completed = false
  private readonly unsub: () => void

  constructor(hudRoot: HTMLElement, evidence: SceneEvidenceSource) {
    this.evidence = evidence

    this.fade = document.createElement('div')
    this.fade.className = 'scene-fade'
    hudRoot.appendChild(this.fade)

    const stored = this.save.read()
    if (stored !== undefined) {
      this.current = stored.current
    }

    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('scene')
      if (isSceneId(param)) {
        this.current = param
      }
    }

    this.unsub = on('scene:complete', ({ id }) => {
      this.onComplete(id)
    })
  }

  get currentId(): SceneId {
    return this.current
  }

  get isComplete(): boolean {
    return this.completed
  }

  /** Prior save, if any. */
  get stored(): ReturnType<Save['read']> {
    return this.save.read()
  }

  /** Emit load for the active scene. Call once the world is up. */
  start(): void {
    emit('scene:load', { id: this.current })
  }

  fadeIn(): void {
    this.fade.classList.remove('is-out')
  }

  fadeOut(): void {
    this.fade.classList.add('is-out')
  }

  private onComplete(id: string): void {
    if (this.completed || id !== this.current) {
      return
    }
    this.completed = true
    const saved = this.save.completeScene(this.current, this.evidence.listIds())
    this.fade.classList.add('is-out')
    emit('scene:transition', { from: this.current, to: saved.current })
  }

  dispose(): void {
    this.unsub()
    this.fade.remove()
  }
}
