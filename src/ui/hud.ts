import { on } from '../core/events.ts'

/**
 * The description line. DOM and CSS over the canvas, no framework.
 *
 * There is no reticle and no highlight on the looked-at object. Look "never
 * signals importance", so the line appearing is the only feedback there is.
 * Everything in the room reads the same until Miller examines it.
 *
 * Tier two replaces the look line after a completed examine. It is the same
 * quiet typography. The text is longer. That is the only difference.
 */
export type DescribeFn = (objectId: string) => string | undefined

export class Hud {
  private readonly line: HTMLParagraphElement
  private readonly describe: DescribeFn
  private readonly unsubscribes: Array<() => void> = []
  private examineText: string | undefined = undefined
  private currentLookId: string | undefined = undefined

  constructor(root: HTMLElement, describe: DescribeFn) {
    this.describe = describe

    this.line = document.createElement('p')
    this.line.className = 'look-line'
    root.appendChild(this.line)

    this.unsubscribes.push(
      on('look:enter', ({ objectId }) => {
        this.currentLookId = objectId
        if (this.examineText !== undefined) {
          return
        }
        this.showLook(objectId)
      }),
    )

    this.unsubscribes.push(
      on('look:exit', () => {
        this.currentLookId = undefined
        if (this.examineText !== undefined) {
          return
        }
        this.line.classList.remove('is-visible')
      }),
    )
  }

  /** Tier two. Stays until the player looks away from this object. */
  showExamine(objectId: string, text: string): void {
    this.examineText = text
    this.currentLookId = objectId
    this.line.textContent = text
    this.line.classList.add('is-visible', 'is-examine')
  }

  clearExamine(): void {
    if (this.examineText === undefined) {
      return
    }
    this.examineText = undefined
    this.line.classList.remove('is-examine')
    if (this.currentLookId === undefined) {
      this.line.classList.remove('is-visible')
      return
    }
    this.showLook(this.currentLookId)
  }

  private showLook(objectId: string): void {
    const text = this.describe(objectId)
    if (text === undefined) {
      this.line.classList.remove('is-visible')
      return
    }
    this.line.textContent = text
    this.line.classList.add('is-visible')
  }

  dispose(): void {
    for (const off of this.unsubscribes) {
      off()
    }
    this.unsubscribes.length = 0
    this.line.remove()
  }
}
