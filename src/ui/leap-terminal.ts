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
  private isOpen = false

  constructor(root: HTMLElement, caseFile: CaseFile) {
    this.root = root
    this.caseFile = caseFile

    this.el = document.createElement('div')
    this.el.className = 'leap-terminal'
    this.el.style.display = 'none'

    this.el.innerHTML = `
      <div class="leap-crt-bezel">
        <div class="leap-crt-screen">
          <div class="leap-scanlines"></div>
          <div class="leap-content">
            <header class="leap-header">
              ================================================================================<br>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;VICTORIA POLICE - L.E.A.P. MAINFRAME<br>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[LAW ENFORCEMENT ASSISTANCE PROGRAM]<br>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;TERMINAL ID: STK-042 &nbsp; SYS: VAX/VMS 5.5<br>
              ================================================================================
            </header>
            <div class="leap-query">
              &gt; QUERY: RAKOV, VICTOR<br>
              &gt; MATCHING VICPOL CENTRAL ARCHIVE INDEX... 1 RECORD FOUND.
            </div>
            <div class="leap-divider">--------------------------------------------------------------------------------</div>
            <div class="leap-dossier">
              <strong>NAME:</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;RAKOV, VICTOR MIKHAIL&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>DOB:</strong> 14/03/1968 (AGE 25)<br>
              <strong>ALIASES:</strong>&nbsp;&nbsp;&nbsp;"THE BRICKLAYER", "VIC"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>STATUS:</strong> PAROLE / ACTIVE OFFENDER<br>
              <strong>HEIGHT:</strong>&nbsp;&nbsp;&nbsp;&nbsp;182 CM&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>WEIGHT:</strong> 86 KG&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>BUILD:</strong> STOCKY, BROAD SHOULDERS<br>
              <strong>MARKS:</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;TATTOO L. FOREARM (DAGGER), SCAR ACROSS R. EYEBROW<br>
              <br>
              <span class="leap-section">PRIOR CONVICTIONS:</span><br>
              &nbsp;&nbsp;1989 - GRIEVOUS BODILY HARM (ST KILDA MAGISTRATES) - 18 MTHS<br>
              &nbsp;&nbsp;1991 - ARMED ROBBERY (COUNTY COURT OF VIC) - 3 YRS (PAROLED NOV 1993)<br>
              &nbsp;&nbsp;1993 - ASSAULT WITH WEAPON (ST KILDA) - CHARGES WITHDRAWN<br>
              <br>
              <span class="leap-section">INTELLIGENCE &amp; ASSOCIATIONS:</span><br>
              &nbsp;&nbsp;KNOWN STAND-OVER ENFORCER AND DEBT COLLECTOR IN ST KILDA PRECINCT.<br>
              &nbsp;&nbsp;FREQUENTS: MAHONEY'S BAR (FITZROY ST), GREY ST BOARDING HOUSES.<br>
              &nbsp;&nbsp;PRIMARY ASSOCIATE: STERLING, ARTHUR (PUBLICAN, MAHONEY'S BAR).<br>
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
            <footer class="leap-footer">
              [PRESS ESC OR CLICK ANYWHERE TO CLOSE TERMINAL]
            </footer>
          </div>
        </div>
      </div>
    `

    this.root.appendChild(this.el)

    this.el.addEventListener('click', () => {
      this.close()
    })

    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.code === 'Escape') {
        this.close()
      }
    })
  }

  get visible(): boolean {
    return this.isOpen
  }

  open(): void {
    if (this.isOpen) return
    this.isOpen = true
    this.el.style.display = 'flex'
    this.caseFile.file('rakov_profile', 'station.leap')
    emit('leap:opened', {})
  }

  close(): void {
    if (!this.isOpen) return
    this.isOpen = false
    this.el.style.display = 'none'
    emit('leap:closed', {})
  }

  dispose(): void {
    this.el.remove()
  }
}
