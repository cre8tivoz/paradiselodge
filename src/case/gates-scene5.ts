import { emit, on } from '../core/events.ts'
import type { CaseFile } from './casefile.ts'

/**
 * Objective gates for Scene 5 (Mahoney's Bar & Cell Slam Ending), following BRIEF.md.
 *
 * 1. Confront Kenneth Sterling behind the mahogany bar at Mahoney's.
 * 2. Bar brawl breaks out; Moretti intervenes to contain punters, isolating Sterling.
 * 3. Collar grab: Miller corners Sterling, extracts the brass cellar key.
 * 4. Cellar safe: descend into cellar keg room, crack safe, seize extortion ledger.
 * 5. Cell slam ending: arrest Sterling, book at watchhouse, cell door slams shut.
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

export const SCENE5_GATES: readonly GateDef[] = [
  {
    id: 'confront_sterling',
    n: 0,
    space: 'Public Bar',
    beat: 'Confront publican Kenneth Sterling behind the bar counter',
    isMet: (f) =>
      f.heard('sterling_intro') ||
      f.heard('sterling_hub') ||
      f.chosen('sterling_talk') ||
      f.seen('mahoneys.sterling'),
  },
  {
    id: 'brawl_distraction',
    n: 1,
    space: 'Pool Table',
    beat: 'Bar brawl erupts; Moretti moves in to contain punters, isolating Sterling',
    isMet: (f) =>
      f.heard('brawl_erupts') ||
      f.chosen('trigger_brawl') ||
      f.seen('mahoneys.brawl') ||
      f.heard('moretti_covers'),
  },
  {
    id: 'collar_grab',
    n: 2,
    space: 'Behind Bar',
    beat: "Corner Sterling against the optics and seize the brass cellar key",
    isMet: (f) =>
      f.filed('cellar_key') ||
      f.heard('collar_cornered') ||
      f.chosen('collar_grab') ||
      f.heard('key_taken'),
  },
  {
    id: 'cellar_safe',
    n: 3,
    space: 'Keg Cellar',
    beat: 'Unlock cellar grille, search keg racks, and seize the extortion ledger from the safe',
    isMet: (f) =>
      f.filed('sterling_ledger') ||
      f.heard('safe_cracked') ||
      f.chosen('open_safe') ||
      f.seen('cellar.safe'),
  },
  {
    id: 'cell_slam_ending',
    n: 4,
    space: 'St Kilda Watchhouse',
    beat: 'Arrest Sterling, lodge formal charge sheet, and slam the watchhouse cell door',
    isMet: (f) =>
      f.filed('cell_arrest') ||
      f.heard('final_arrest') ||
      f.chosen('cell_slam') ||
      f.heard('credits_roll'),
  },
]

export class Scene5GateTracker {
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

  evaluate(): void {
    const facts: GateFacts = {
      filed: (id) => this.caseFile.has(id),
      seen: (id) => this.seenIds.has(id),
      heard: (id) => this.heardIds.has(id),
      chosen: (id) => this.chosenOptions.has(id),
    }

    for (const gate of SCENE5_GATES) {
      if (!this.unlockedIds.has(gate.id) && gate.isMet(facts)) {
        this.unlockedIds.add(gate.id)
        emit('gate:unlocked', { gateId: gate.id })
        this.onUnlocked?.(gate.id)
      }
    }
  }

  isUnlocked(gateId: string): boolean {
    return this.unlockedIds.has(gateId)
  }

  get allUnlocked(): boolean {
    return SCENE5_GATES.every((g) => this.unlockedIds.has(g.id))
  }

  unlockedCount(): number {
    return this.unlockedIds.size
  }

  recordHeard(nodeId: string): void {
    this.heardIds.add(nodeId)
    this.evaluate()
  }

  recordChosen(optionId: string): void {
    this.chosenOptions.add(optionId)
    this.evaluate()
  }

  recordSeen(objectId: string): void {
    this.seenIds.add(objectId)
    this.evaluate()
  }

  dispose(): void {
    for (const off of this.unsubscribes) {
      off()
    }
    this.unsubscribes.length = 0
  }
}
