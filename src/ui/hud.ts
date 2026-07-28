import { on } from '../core/events.ts'

/**
 * The description line. DOM and CSS over the canvas, no framework.
 *
 * There is no reticle and no highlight on the looked-at object. Look "never
 * signals importance", so the line appearing is the only feedback there is.
 * Everything in the room reads the same until Miller examines it.
 */
export type DescribeFn = (objectId: string) => string | undefined

export class Hud {
  private readonly line: HTMLParagraphElement
  private readonly describe: DescribeFn
  private readonly unsubscribes: Array<() => void> = []

  constructor(root: HTMLElement, describe: DescribeFn) {
    this.describe = describe

    this.line = document.createElement('p')
    this.line.className = 'look-line'
    root.appendChild(this.line)

    this.unsubscribes.push(
      on('look:enter', ({ objectId }) => {
        const text = this.describe(objectId)
        if (text === undefined) {
          return
        }
        this.line.textContent = text
        this.line.classList.add('is-visible')
      }),
    )

    this.unsubscribes.push(
      on('look:exit', () => {
        this.line.classList.remove('is-visible')
      }),
    )
  }

  dispose(): void {
    for (const off of this.unsubscribes) {
      off()
    }
    this.unsubscribes.length = 0
    this.line.remove()
  }
}
