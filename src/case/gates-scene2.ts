import { emit, on } from '../core/events.ts'
import type { CaseFile } from './casefile.ts'

/**
 * Objective gates for Scene 2 (The Station), following BRIEF.md.
 *
 * 1. Walk the hammer to Forensics intake.
 * 2. Pour a cup of black instant coffee at the urn. Wait.
 * 3. Forensics returns prints: Victor Rakov. Read the report on Miller's desk.
 * 4. Query the green-phosphor LEAP CRT terminal for Rakov's priors and Prahran address.
 * 5. Interview Mark in Room 2 (he clears his name with a door alibi and puts Crystal at Mahoney's).
 * 6. Theorise with Moretti and roll out to Prahran.
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
  bagged(objectId: string): boolean
  seen(objectId: string): boolean
  heard(nodeId: string): boolean
  hadCoffee: boolean
  droppedHammer: boolean
}

export const SCENE2_GATES: readonly GateDef[] = [
  {
    id: 'drop_hammer',
    n: 0,
    space: 'Forensics Counter',
    beat: 'Deliver the tagged hammer to the forensics tech hatch',
    isMet: (f) => f.droppedHammer || f.heard('forensics.dropped'),
  },
  {
    id: 'coffee_urn',
    n: 1,
    space: 'Break Station',
    beat: 'Pour a cup of instant coffee at the electric urn while waiting',
    isMet: (f) => f.hadCoffee || f.seen('station.coffee_mug'),
  },
  {
    id: 'hammer_report',
    n: 2,
    space: "Miller's Desk",
    beat: 'Forensics report arrives. Examine latents matching Victor Rakov',
    isMet: (f) => f.filed('hammer_report'),
  },
  {
    id: 'leap_terminal',
    n: 3,
    space: "Miller's Desk",
    beat: 'Query LEAP mainframe for Victor Rakov priors and Prahran address',
    isMet: (f) => f.filed('rakov_profile'),
  },
  {
    id: 'mark_interview',
    n: 4,
    space: 'Interview Room 2',
    beat: "Interview Mark. Alibi clears him; puts Crystal inside Mahoney's Bar",
    isMet: (f) => f.filed('mark_statement') || f.heard('mark.end'),
  },
]

export class Scene2GateTracker {
  private readonly caseFile: CaseFile
  private readonly unlockedIds = new Set<string>()
  private readonly seenIds = new Set<string>()
  private readonly heardIds = new Set<string>()
  private readonly unsubscribes: Array<() => void> = []
  private droppedHammer = false
  private hadCoffee = false

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
      on('tag:bagged', () => {
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
    return SCENE2_GATES.every((gate) => this.unlockedIds.has(gate.id))
  }

  get outstanding(): GateDef[] {
    return SCENE2_GATES.filter((gate) => !this.unlockedIds.has(gate.id))
  }

  recordHammerDrop(): void {
    if (this.droppedHammer) return
    this.droppedHammer = true
    this.evaluate()
  }

  recordCoffee(): void {
    if (this.hadCoffee) return
    this.hadCoffee = true
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
      bagged: () => false,
      seen: (id) => this.seenIds.has(id),
      heard: (id) => this.heardIds.has(id),
      hadCoffee: this.hadCoffee,
      droppedHammer: this.droppedHammer,
    }

    for (const gate of SCENE2_GATES) {
      if (this.unlockedIds.has(gate.id) || !gate.isMet(facts)) {
        continue
      }
      this.unlockedIds.add(gate.id)
      emit('gate:unlocked', { gateId: gate.id })
      this.onUnlocked?.(gate.id)
    }
  }
}
