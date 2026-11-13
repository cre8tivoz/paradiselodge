import { on } from '../core/events.ts'
import type { DialogueRunner } from './runner.ts'
import type { DialogueNode } from './graph.ts'

const PORTRAITS: ReadonlyArray<readonly [string, string]> = [
  ['rosie', '/portraits/rosie.png'],
  ['moretti', '/portraits/moretti.png'],
  ['mark', '/portraits/mark.png'],
  ['victor', '/portraits/victor.png'],
  ['sterling', '/portraits/sterling.png'],
]

function resolvePortrait(speaker: string): string | undefined {
  const normalized = speaker.trim().toLowerCase()
  for (const [key, url] of PORTRAITS) {
    if (
      normalized === key ||
      normalized.startsWith(`${key} `) ||
      normalized.includes(` ${key}`)
    ) {
      return url
    }
  }
  return undefined
}

/**
 * Dialogue panel. DOM over the canvas. Camera stays first person underneath.
 *
 * Linear lines advance with Space or F. Choices are 1..9. Esc cancels.
 * Pointer is freed while open so the player can click a choice.
 */
export class DialoguePanel {
  private readonly panel: HTMLDivElement
  private readonly portraitContainer: HTMLDivElement
  private readonly portraitImg: HTMLImageElement
  private readonly bodyEl: HTMLDivElement
  private readonly speakerEl: HTMLParagraphElement
  private readonly lineEl: HTMLParagraphElement
  private readonly choicesEl: HTMLUListElement
  private readonly hintEl: HTMLParagraphElement
  private readonly runner: DialogueRunner
  private readonly unsubscribes: Array<() => void> = []

  private open = false

  constructor(hudRoot: HTMLElement, runner: DialogueRunner) {
    this.runner = runner

    this.panel = document.createElement('div')
    this.panel.className = 'dialogue'
    this.panel.setAttribute('aria-hidden', 'true')

    this.portraitContainer = document.createElement('div')
    this.portraitContainer.className = 'dialogue-portrait'
    this.portraitImg = document.createElement('img')
    this.portraitImg.className = 'dialogue-portrait-img'
    this.portraitContainer.appendChild(this.portraitImg)

    this.speakerEl = document.createElement('p')
    this.speakerEl.className = 'dialogue-speaker'

    this.lineEl = document.createElement('p')
    this.lineEl.className = 'dialogue-line'

    this.choicesEl = document.createElement('ul')
    this.choicesEl.className = 'dialogue-choices'

    this.hintEl = document.createElement('p')
    this.hintEl.className = 'dialogue-hint'

    this.bodyEl = document.createElement('div')
    this.bodyEl.className = 'dialogue-body'
    this.bodyEl.append(this.speakerEl, this.lineEl, this.choicesEl, this.hintEl)

    this.panel.append(this.portraitContainer, this.bodyEl)
    hudRoot.appendChild(this.panel)

    runner.onNode = (node) => {
      if (node === undefined) {
        this.hide()
        return
      }
      this.render(node)
    }

    this.unsubscribes.push(
      on('dialogue:end', () => {
        this.hide()
      }),
    )

    window.addEventListener('keydown', this.onKeyDown)
  }

  get isOpen(): boolean {
    return this.open
  }

  dispose(): void {
    for (const off of this.unsubscribes) {
      off()
    }
    this.unsubscribes.length = 0
    this.runner.onNode = undefined
    window.removeEventListener('keydown', this.onKeyDown)
    this.panel.remove()
  }

  private render(node: DialogueNode): void {
    this.open = true
    this.panel.classList.add('is-open')
    this.panel.setAttribute('aria-hidden', 'false')
    if (document.pointerLockElement !== null) {
      document.exitPointerLock()
    }

    this.speakerEl.textContent = node.speaker
    this.lineEl.textContent = node.line
    this.choicesEl.replaceChildren()

    const portraitUrl = resolvePortrait(node.speaker)
    if (portraitUrl !== undefined) {
      this.portraitImg.src = portraitUrl
      this.portraitImg.alt = node.speaker
      this.portraitContainer.style.display = 'block'
    } else {
      this.portraitContainer.style.display = 'none'
    }

    const choices = (node.choices ?? []).filter((choice) => choice.when?.() ?? true)
    if (choices.length > 0) {
      for (let i = 0; i < choices.length; i += 1) {
        const choice = choices[i]
        const item = document.createElement('li')
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = `${i + 1}. ${choice.label}`
        button.addEventListener('click', () => {
          this.runner.choose(choice.id)
        })
        item.appendChild(button)
        this.choicesEl.appendChild(item)
      }
      this.hintEl.textContent = '1-9 choose · Esc leave'
      this.focusFirstControl()
      return
    }

    if (node.next !== undefined) {
      this.hintEl.textContent = 'Space or F continue · Esc leave'
      this.focusPanel()
      return
    }

    this.hintEl.textContent = 'Space or F close · Esc leave'
    this.focusPanel()
  }

  private hide(): void {
    this.open = false
    this.panel.classList.remove('is-open')
    this.panel.setAttribute('aria-hidden', 'true')
    this.choicesEl.replaceChildren()
    restoreGameFocus()
  }

  /** Move keyboard focus onto the first choice button when choices are up. */
  private focusFirstControl(): void {
    const first = this.choicesEl.querySelector('button')
    if (first instanceof HTMLButtonElement) {
      first.focus()
      return
    }
    this.focusPanel()
  }

  private focusPanel(): void {
    this.panel.tabIndex = -1
    this.panel.focus()
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.open) {
      return
    }
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return
    }
    if (event.code === 'Escape') {
      event.preventDefault()
      this.runner.cancel()
      return
    }

    const node = this.runner.current
    if (node === undefined) {
      return
    }

    const choices = (node.choices ?? []).filter((entry) => entry.when?.() ?? true)
    if (choices.length > 0) {
      const index = choiceIndex(event.code)
      if (index === undefined || index >= choices.length) {
        return
      }
      event.preventDefault()
      this.runner.choose(choices[index].id)
      return
    }

    if (event.code === 'Space' || event.code === 'KeyF') {
      event.preventDefault()
      this.runner.advance()
    }
  }
}

function choiceIndex(code: string): number | undefined {
  switch (code) {
    case 'Digit1':
    case 'Numpad1':
      return 0
    case 'Digit2':
    case 'Numpad2':
      return 1
    case 'Digit3':
    case 'Numpad3':
      return 2
    case 'Digit4':
    case 'Numpad4':
      return 3
    case 'Digit5':
    case 'Numpad5':
      return 4
    case 'Digit6':
    case 'Numpad6':
      return 5
    case 'Digit7':
    case 'Numpad7':
      return 6
    case 'Digit8':
    case 'Numpad8':
      return 7
    case 'Digit9':
    case 'Numpad9':
      return 8
    default:
      return undefined
  }
}

function restoreGameFocus(): void {
  const canvas = document.getElementById('game')
  if (canvas instanceof HTMLElement) {
    canvas.focus()
  }
}

