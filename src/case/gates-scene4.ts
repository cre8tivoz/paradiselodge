import { emit, on } from '../core/events.ts'
import type { CaseFile } from './casefile.ts'

/**
 * Objective gates for Scene 4 (The Interrogation Room), following BRIEF.md.
 *
 * 1. Read formal police caution & start dual-cassette tape recorder.
 * 2. Confront Victor with hammer forensic report & latent finger marks.
 * 3. Confront Victor with bootprint mud matching the 1A windowsill.
 * 4. Confront Victor with handwritten slip ("grab the book. S.") (Victor breaks & confesses burglary).
 * 5. Extract Sterling's location (Mahoney's Bar cellar) and conclude interview.
 */

export interface GateDef {
  readonly id: string
  readonly n: number
  readonly space: string
  readonly beat: string
  readonly isMet: (facts: GateFacts) => boolean
}

export interface GateFacts {
  filed(evidenceId: string): boolean
  seen(objectId: string): boolean
  heard(nodeId: string): boolean
  chosen(optionId: string): boolean
}

export const SCENE4_GATES: readonly GateDef[] = [
  {
    id: 'caution_tape',
    n: 0,
    space: 'Interview Table',
    beat: 'Read formal Section 464A caution and turn on tape recorder',
    isMet: (f) => f.filed('tape_caution') || f.heard('record_on'),
  },
  {
    id: 'confront_hammer',
    n: 1,
    space: 'Interview Table',
    beat: 'Confront Victor with the murder weapon forensics and latent prints',
    isMet: (f) => f.heard('hammer_ans3'),
  },
  {
    id: 'confront_bootprint',
    n: 2,
    space: 'Interview Table',
    beat: 'Confront Victor with bootprint impressions matching the 1A windowsill',
    isMet: (f) => f.heard('boot_ans3'),
  },
  {
    id: 'confront_slip',
    n: 3,
    space: 'Interview Table',
    beat: "Confront Victor with Sterling's slip; Victor breaks and confesses to the burglary",
    isMet: (f) => f.filed('victor_confession') || f.heard('slip_break4'),
  },
  {
    id: 'sterlings_hideout',
    n: 4,
    space: 'Interview Table',
    beat: "Victor reveals Sterling's operation in Mahoney's cellar; interview concludes",
    isMet: (f) => f.filed('sterlings_orders') || f.chosen('conclude') || f.heard('mahoneys'),
  },
]

export class Scene4GateTracker {
  private readonly caseFile: CaseFile
  private readonly unlockedIds = new Set<string>()
  private readonly seenIds = new Set<string>()
  private readonly heardIds = new Set<string>()
  private readonly chosenOptions = new Set<string>()
  private readonly unsubscribes: Array<() => void> = []

  onUnlocked: ((gateId: string) => void) | undefined = undefined

  constructor(caseFile: CaseFile) {
    this.caseFile = caseFile

    this.unsubscribes.push(
      on('evidence:filed', () => {
        this.evaluate()
      }),
      on('look:enter', ({ objectId }) => {
        this.seenIds.add(objectId)
        this.evaluate()
      }),
      on('dialogue:start', ({ nodeId }) => {
        this.heardIds.add(nodeId)
        this.evaluate()
      }),
      on('dialogue:choice', ({ optionId }) => {
        this.chosenOptions.add(optionId)
        this.evaluate()
      }),
      on('dialogue:end', ({ nodeId }) => {
        this.heardIds.add(nodeId)
        this.evaluate()
      }),
    )
  }

  get unlocked(): ReadonlySet<string> {
    return this.unlockedIds
  }

  has(gateId: string): boolean {
    return this.unlockedIds.has(gateId)
  }

  get allUnlocked(): boolean {
    return SCENE4_GATES.every((gate) => this.unlockedIds.has(gate.id))
  }

  get outstanding(): GateDef[] {
    return SCENE4_GATES.filter((gate) => !this.unlockedIds.has(gate.id))
  }

  recordHeard(nodeId: string): void {
    this.heardIds.add(nodeId)
    this.evaluate()
  }

  dispose(): void {
    for (const off of this.unsubscribes) {
      off()
    }
    this.unsubscribes.length = 0
  }

  private evaluate(): void {
    const facts: GateFacts = {
      filed: (id) => this.caseFile.has(id),
      seen: (id) => this.seenIds.has(id),
      heard: (id) => this.heardIds.has(id),
      chosen: (id) => this.chosenOptions.has(id),
    }

    for (const gate of SCENE4_GATES) {
      if (this.unlockedIds.has(gate.id) || !gate.isMet(facts)) {
        continue
      }
      this.unlockedIds.add(gate.id)
      emit('gate:unlocked', { gateId: gate.id })
      this.onUnlocked?.(gate.id)
    }
  }
}
