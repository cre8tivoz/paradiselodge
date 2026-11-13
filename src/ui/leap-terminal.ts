import { emit } from '../core/events.ts'
import type { CaseFile } from '../case/casefile.ts'

/**
 * 1994 Victoria Police LEAP (Law Enforcement Assistance Program) CRT Terminal UI.
 *
 * Full-screen green-phosphor mainframe terminal displaying Victor Rakov's
 * criminal dossier.
 */

export class LeapTerminal {
  private readonly root: HTMLElement
  private readonly el: HTMLDivElement
  private readonly caseFile: CaseFile
  private readonly closeBtn: HTMLButtonElement | null
  private readonly cmdForm: HTMLFormElement | null
  private readonly cmdInput: HTMLInputElement | null
  private readonly cmdOutput: HTMLDivElement | null
  private isOpen = false
  private previousFocus: HTMLElement | null = null

  private readonly onOverlayClick = (event: MouseEvent): void => {
    if (event.target === this.el) {
      this.close()
    }
  }

  private readonly onCloseClick = (): void => {
    this.close()
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.isOpen && event.code === 'Escape') {
      event.preventDefault()
      this.close()
    }
  }

  private readonly onCommandSubmit = (event: SubmitEvent): void => {
    event.preventDefault()
    if (this.cmdInput === null || this.cmdOutput === null) return
    const raw = this.cmdInput.value.trim()
    this.cmdInput.value = ''
    if (raw.length === 0) return

    const cmd = raw.toLowerCase()
    if (cmd === 'exit' || cmd === 'close' || cmd === 'quit' || cmd === 'q') {
      this.close()
      return
    }
    if (cmd === 'clear' || cmd === 'cls') {
      this.cmdOutput.textContent = ''
      return
    }
    if (cmd === 'help' || cmd === '?') {
      this.cmdOutput.textContent =
        'COMMANDS: QUERY RAKOV | PRIORS | ADDRESS | CLEAR | EXIT'
      return
    }
    if (cmd.includes('rakov') || cmd.includes('query')) {
      this.cmdOutput.textContent =
        'RECORD #VR-19680314 ACTIVE - PAROLE OFFICER: ST KILDA CORR. SERVICES.'
      return
    }
    if (cmd.includes('prior') || cmd.includes('offence')) {
      this.cmdOutput.textContent =
        '3 LISTED OFFENCES (1989 GBH, 1991 ARMED ROBBERY, 1993 ASSAULT).'
      return
    }
    if (cmd.includes('addr') || cmd.includes('prahran') || cmd.includes('regent')) {
      this.cmdOutput.textContent =
        'LAST KNOWN: 14 REGENT ST, PRAHRAN VIC 3181 (BLUE/WEATHERBOARD COTTAGE).'
      return
    }
    this.cmdOutput.textContent = `UNKNOWN COMMAND "${raw.toUpperCase()}". TYPE HELP.`
  }

  constructor(root: HTMLElement, caseFile: CaseFile) {
    this.root = root
    this.caseFile = caseFile

    this.el = document.createElement('div')
    this.el.className = 'leap-terminal'
    this.el.style.display = 'none'
    this.el.setAttribute('role', 'dialog')
    this.el.setAttribute('aria-modal', 'true')
    this.el.setAttribute('aria-label', 'Victoria Police LEAP terminal')
    this.el.setAttribute('aria-hidden', 'true')
    this.el.tabIndex = -1

    this.el.innerHTML = `
      <div class="leap-crt-bezel">
        <div class="leap-crt-screen">
          <div class="leap-scanlines"></div>
          <div class="leap-content">
            <div class="leap-topbar">
              <span>TERMINAL ID: STK-042 &middot; VAX/VMS 5.5</span>
              <button type="button" class="leap-close-btn" aria-label="Close LEAP terminal">[X] CLOSE</button>
            </div>
            <header class="leap-header">
              ================================================================================<br>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;VICTORIA POLICE - L.E.A.P. MAINFRAME<br>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[LAW ENFORCEMENT ASSISTANCE PROGRAM]<br>
              ================================================================================
            </header>
            <div class="leap-query">
              &gt; QUERY: RAKOV, VICTOR<br>
              &gt; MATCHING VICPOL CENTRAL ARCHIVE INDEX... 1 RECORD FOUND.
            </div>
            <div class="leap-divider">--------------------------------------------------------------------------------</div>
            <div class="leap-dossier">
              <div class="leap-dossier-top">
                <div class="leap-dossier-bio">
                  <strong>NAME:</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;RAKOV, VICTOR MIKHAIL<br>
                  <strong>DOB:</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;14/03/1968 (AGE 25)<br>
                  <strong>ALIASES:</strong>&nbsp;&nbsp;&nbsp;"THE BRICKLAYER", "VIC"<br>
                  <strong>STATUS:</strong>&nbsp;&nbsp;&nbsp;&nbsp;PAROLE / ACTIVE OFFENDER<br>
                  <strong>HEIGHT:</strong>&nbsp;&nbsp;&nbsp;&nbsp;182 CM &nbsp; <strong>WEIGHT:</strong> 86 KG<br>
                  <strong>BUILD:</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;STOCKY, BROAD SHOULDERS<br>
                  <strong>MARKS:</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;TATTOO L. FOREARM (DAGGER),<br>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;SCAR ACROSS R. EYEBROW
                </div>
                <div class="leap-mugshot-frame">
                  <img class="leap-mugshot" src="/textures/victor-record.jpg" alt="Victoria Police mugshot card: Victor Rakov">
                  <span class="leap-mugshot-caption">VICPOL MUGSHOT ARCHIVE // 1993</span>
                </div>
              </div>
              <br>
              <span class="leap-section">PRIOR CONVICTIONS:</span><br>
              &nbsp;&nbsp;1989 - GRIEVOUS BODILY HARM (ST KILDA MAGISTRATES) - 18 MTHS<br>
              &nbsp;&nbsp;1991 - ARMED ROBBERY (COUNTY COURT OF VIC) - 3 YRS (PAROLED NOV 1993)<br>
              &nbsp;&nbsp;1993 - ASSAULT WITH WEAPON (ST KILDA) - CHARGES WITHDRAWN<br>
              <br>
              <span class="leap-section">INTELLIGENCE &amp; ASSOCIATIONS:</span><br>
              &nbsp;&nbsp;KNOWN STAND-OVER ENFORCER AND DEBT COLLECTOR IN ST KILDA PRECINCT.<br>
              &nbsp;&nbsp;FREQUENTS: MAHONEY'S BAR (FITZROY ST), GREY ST BOARDING HOUSES.<br>
              &nbsp;&nbsp;PRIMARY ASSOCIATE: STERLING, KENNETH (PUBLICAN, MAHONEY'S BAR).<br>
              &nbsp;&nbsp;MODUS OPERANDI: HEAVY BLUNT WEAPONS (BRICKLAYER'S CLAW HAMMER).<br>
              <br>
              <span class="leap-section">LAST RECORDED RESIDENCE:</span><br>
              &nbsp;&nbsp;<strong>14 REGENT STREET, PRAHRAN VIC 3181</strong><br>
              &nbsp;&nbsp;(WEATHERBOARD WORKER COTTAGE, REAR ACCESS VIA BLUESTONE LANEWAY)<br>
              <br>
              <span class="leap-section">VEHICLE OF INTEREST:</span><br>
              &nbsp;&nbsp;1984 FORD FALCON XF SEDAN (RUST RED / PRIMER) - REG: OYT-892<br>
            </div>
            <div class="leap-divider">================================================================================</div>
            <form class="leap-cmd-row" autocomplete="off">
              <label for="leap-cmd-input" class="leap-cmd-prompt">LEAP&gt;</label>
              <input id="leap-cmd-input" class="leap-cmd-input" type="text" placeholder="TYPE HELP OR EXIT..." spellcheck="false">
            </form>
            <div class="leap-cmd-output" aria-live="polite"></div>
            <footer class="leap-footer">
              [PRESS ESC OR CLICK [X] TO CLOSE TERMINAL]
            </footer>
          </div>
        </div>
      </div>
    `

    this.root.appendChild(this.el)
    this.closeBtn = this.el.querySelector<HTMLButtonElement>('.leap-close-btn')
    this.cmdForm = this.el.querySelector<HTMLFormElement>('.leap-cmd-row')
    this.cmdInput = this.el.querySelector<HTMLInputElement>('.leap-cmd-input')
    this.cmdOutput = this.el.querySelector<HTMLDivElement>('.leap-cmd-output')

    this.el.addEventListener('click', this.onOverlayClick)
    this.closeBtn?.addEventListener('click', this.onCloseClick)
    this.cmdForm?.addEventListener('submit', this.onCommandSubmit)
    window.addEventListener('keydown', this.onKeyDown)
  }

  get visible(): boolean {
    return this.isOpen
  }

  open(): void {
    if (this.isOpen) return
    this.isOpen = true
    const active = document.activeElement
    this.previousFocus = active instanceof HTMLElement ? active : null
    if (document.pointerLockElement !== null) {
      document.exitPointerLock()
    }
    this.el.style.display = 'flex'
    this.el.setAttribute('aria-hidden', 'false')
    if (this.cmdInput !== null) {
      this.cmdInput.value = ''
      this.cmdInput.focus()
    } else {
      this.el.focus()
    }
    if (this.cmdOutput !== null) {
      this.cmdOutput.textContent = 'READY. TYPE HELP FOR COMMANDS.'
    }
    this.caseFile.file('rakov_profile', 'station.leap')
    emit('leap:opened', {})
  }

  close(): void {
    if (!this.isOpen) return
    this.isOpen = false
    this.el.style.display = 'none'
    this.el.setAttribute('aria-hidden', 'true')
    this.previousFocus?.focus()
    this.previousFocus = null
    emit('leap:closed', {})
  }

  dispose(): void {
    this.el.removeEventListener('click', this.onOverlayClick)
    this.closeBtn?.removeEventListener('click', this.onCloseClick)
    this.cmdForm?.removeEventListener('submit', this.onCommandSubmit)
    window.removeEventListener('keydown', this.onKeyDown)
    this.el.remove()
  }
}
