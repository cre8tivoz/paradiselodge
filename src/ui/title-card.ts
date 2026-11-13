/**
 * Title card one. ASSETS.md: two only, same typeface, white on black.
 *
 * ```
 * ST KILDA
 * 26 FEBRUARY 1994
 * ```
 *
 * Fades in from black, holds, fades out. The world renders underneath the whole
 * time; the card is an overlay, not a cutscene. BRIEF.md's cold open is walk,
 * look, listen, so the player is already moving when the text clears.
 */

export class TitleCard {
  private readonly el: HTMLDivElement
  private readonly timers: number[] = []
  private readonly rafId: number

  constructor(parent: HTMLElement, line1 = 'ST KILDA', line2 = '26 FEBRUARY 1994') {
    this.el = document.createElement('div')
    this.el.className = 'title-card'
    this.el.innerHTML = `<span>${line1}</span><span>${line2}</span>`
    parent.appendChild(this.el)

    this.rafId = requestAnimationFrame(() => {
      this.el.classList.add('is-visible')
    })

    this.timers.push(
      window.setTimeout(() => {
        this.el.classList.remove('is-visible')
      }, 4000),
      window.setTimeout(() => {
        this.el.remove()
      }, 5800),
    )
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId)
    for (const id of this.timers) {
      window.clearTimeout(id)
    }
    this.timers.length = 0
    this.el.remove()
  }
}
