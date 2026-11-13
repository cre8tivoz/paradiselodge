/**
 * Scene 5 Cinematic Ending Screen & Epilogue.
 *
 * Displays the final watchhouse cell block corridor scene, the deadpan
 * 1994 Melbourne neo-noir conclusion, case resolution summary, and credits.
 */

export interface EndingScreenOptions {
  evidenceCount: number
  onRestart: () => void
}

export class EndingScreen {
  private readonly el: HTMLDivElement

  constructor(parent: HTMLElement, options: EndingScreenOptions) {
    this.el = document.createElement('div')
    this.el.className = 'ending-screen'
    this.el.setAttribute('role', 'dialog')
    this.el.setAttribute('aria-modal', 'true')
    this.el.setAttribute('aria-labelledby', 'ending-title')
    this.el.setAttribute('aria-describedby', 'ending-body')

    this.el.innerHTML = `
      <div class="ending-backdrop">
        <svg class="ending-corridor-svg" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="corridorLight" cx="50%" cy="30%" r="65%">
              <stop offset="0%" stop-color="#fff5db" stop-opacity="0.35"/>
              <stop offset="40%" stop-color="#383226" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="#05070a" stop-opacity="1"/>
            </radialGradient>
            <linearGradient id="cellWallGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#0a0c10"/>
              <stop offset="100%" stop-color="#161820"/>
            </linearGradient>
            <linearGradient id="cellDoorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#1c1f24"/>
              <stop offset="50%" stop-color="#2a2e36"/>
              <stop offset="100%" stop-color="#14161a"/>
            </linearGradient>
          </defs>

          <!-- Deep corridor walls & ceiling -->
          <rect width="1000" height="700" fill="#05070a"/>
          <polygon points="0,0 1000,0 720,280 280,280" fill="#0d0f14"/>
          <polygon points="0,700 1000,700 720,440 280,440" fill="#090a0d"/>
          <polygon points="0,0 280,280 280,440 0,700" fill="url(#cellWallGrad)"/>
          <polygon points="1000,0 720,280 720,440 1000,700" fill="#0c0e14"/>

          <!-- Distant corridor end & cell door -->
          <rect x="280" y="280" width="440" height="160" fill="#07080a"/>
          <rect x="420" y="290" width="160" height="150" fill="url(#cellDoorGrad)" stroke="#3a3f4a" stroke-width="3"/>
          <rect x="460" y="310" width="80" height="30" fill="#050608" stroke="#5a606e" stroke-width="2"/>
          <line x1="480" y1="310" x2="480" y2="340" stroke="#3a3f4a" stroke-width="3"/>
          <line x1="500" y1="310" x2="500" y2="340" stroke="#3a3f4a" stroke-width="3"/>
          <line x1="520" y1="310" x2="520" y2="340" stroke="#3a3f4a" stroke-width="3"/>
          <circle cx="555" cy="380" r="5" fill="#88909e"/>

          <!-- Hanging bare industrial bulb -->
          <line x1="500" y1="0" x2="500" y2="120" stroke="#444" stroke-width="2"/>
          <circle cx="500" cy="125" r="9" fill="#ffecb3" filter="drop-shadow(0px 0px 18px #ffdf7a)"/>
          <rect width="1000" height="700" fill="url(#corridorLight)" style="mix-blend-mode: screen; pointer-events: none;"/>

          <!-- Left cell iron bars -->
          <line x1="120" y1="120" x2="120" y2="600" stroke="#1f242d" stroke-width="12"/>
          <line x1="180" y1="180" x2="180" y2="540" stroke="#1c2028" stroke-width="10"/>
          <line x1="240" y1="240" x2="240" y2="480" stroke="#181c24" stroke-width="8"/>

          <!-- Right cell iron bars -->
          <line x1="880" y1="120" x2="880" y2="600" stroke="#1f242d" stroke-width="12"/>
          <line x1="820" y1="180" x2="820" y2="540" stroke="#1c2028" stroke-width="10"/>
          <line x1="760" y1="240" x2="760" y2="480" stroke="#181c24" stroke-width="8"/>

          <!-- Silhouettes: Detective Graham Miller (left) and Constable Moretti (right) -->
          <!-- Miller: bare head, turned-up trench collar, lit cigarette ember -->
          <g transform="translate(320, 260) scale(0.62)">
            <!-- Trenchcoat body silhouette -->
            <path d="M 60,180 Q 20,260 0,460 L 160,460 Q 140,260 100,180 Z" fill="#040507"/>
            <!-- Collar turned up -->
            <path d="M 40,160 L 60,195 L 80,180 L 100,195 L 120,160 L 95,145 L 65,145 Z" fill="#020304"/>
            <!-- Head & cropped hair -->
            <ellipse cx="80" cy="138" rx="22" ry="26" fill="#040507"/>
            <path d="M 59,130 Q 64,110 82,110 Q 98,110 101,128 Q 92,119 80,119 Q 68,119 59,130 Z" fill="#020304"/>
            <!-- Cigarette red ember glow -->
            <circle cx="82" cy="155" r="2.5" fill="#ff4d15" filter="drop-shadow(0 0 4px #ff3b00)"/>
            <path d="M 83,153 Q 86,140 92,125" stroke="rgba(255,255,255,0.22)" stroke-width="1.5" fill="none"/>
          </g>

          <!-- Moretti: Victoria Police uniform tunic & peaked cap -->
          <g transform="translate(560, 275) scale(0.60)">
            <!-- Uniform tunic silhouette -->
            <path d="M 50,170 Q 25,250 15,440 L 145,440 Q 135,250 110,170 Z" fill="#050608"/>
            <!-- Shoulders & epaulettes -->
            <path d="M 30,175 L 130,175 L 120,210 L 40,210 Z" fill="#030406"/>
            <!-- Head & Victoria Police peaked cap -->
            <ellipse cx="80" cy="138" rx="20" ry="24" fill="#050608"/>
            <path d="M 40,122 L 120,122 L 115,105 L 45,105 Z" fill="#030406"/>
            <path d="M 35,124 Q 80,129 125,124 L 115,120 Q 80,123 45,120 Z" fill="#0a0c10"/>
            <!-- Chrome cap badge glint -->
            <circle cx="80" cy="114" r="2" fill="#c0c8d8"/>
          </g>
        </svg>
      </div>

      <div class="ending-content">
        <div class="ending-header">
          <div class="ending-badge">VICTORIA POLICE • CRIMINAL INVESTIGATION BRANCH</div>
          <h1 class="ending-title" id="ending-title">THE PARADISE LODGE</h1>
          <div class="ending-subtitle">FITZROY STREET, ST KILDA • 27 FEBRUARY 1994</div>
        </div>

        <div class="ending-body" id="ending-body">
          <p class="ending-p ep-1">Kenneth Sterling remanded in custody without bail to HM Prison Pentridge.</p>
          <p class="ending-p ep-2">Victor Rakov entered a plea of manslaughter and housebreaking at Melbourne Magistrates' Court.</p>
          <p class="ending-p ep-3">Crystal Vance was twenty-two years old.</p>
          <p class="ending-p ep-4">The rain over Fitzroy Street didn't wash anything clean. It never does.</p>
        </div>

        <div class="ending-stats">
          <div class="ending-stat-box">
            <span class="stat-label">INVESTIGATION STATUS</span>
            <span class="stat-value highlight">SOLVED • CASE CLOSED</span>
          </div>
          <div class="ending-stat-box">
            <span class="stat-label">EVIDENCE FILED</span>
            <span class="stat-value">${options.evidenceCount} EXHIBITS LOGGED</span>
          </div>
          <div class="ending-stat-box">
            <span class="stat-label">INVESTIGATORS</span>
            <span class="stat-value">DET. G. MILLER • CONST. MORETTI</span>
          </div>
        </div>

        <div class="ending-actions">
          <button class="ending-btn" id="ending-restart-btn">NEW INVESTIGATION</button>
        </div>
      </div>
    `

    parent.appendChild(this.el)

    const restartBtn = this.el.querySelector<HTMLButtonElement>('#ending-restart-btn')
    restartBtn?.addEventListener('click', () => {
      options.onRestart()
    })

    // Fade in, then put keyboard focus on the only control
    requestAnimationFrame(() => {
      this.el.classList.add('is-visible')
      restartBtn?.focus()
    })
  }

  dispose(): void {
    this.el.remove()
  }
}
