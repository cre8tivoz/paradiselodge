import { emit, on } from '../core/events.ts'
import type { CaseFile } from './casefile.ts'
import type { Vector3 } from 'three'

/**
 * Objective gates for Scene 3 (Victor's Laneway Chase), following BRIEF.md.
 *
 * 1. Approach 14 Regent Street worker cottage.
 * 2. Victor spots Miller and bolts down the bluestone alley.
 * 3. Pursue Victor down the narrow laneway past bins and crates.
 * 4. Victor vaults over the corrugated iron perimeter fence out of reach.
 * 5. Moretti radios confirming Victor cornered and arrested on Commercial Road.
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
  approachedCottage: boolean
  spottedVictor: boolean
  chasedAlley: boolean
  reachedFence: boolean
}

export const SCENE3_GATES: readonly GateDef[] = [
  {
    id: 'approach_cottage',
    n: 0,
    space: 'Regent Street',
    beat: 'Approach 14 Regent Street worker cottage',
    isMet: (f) => f.approachedCottage || f.filed('cottage_slip') || f.spottedVictor || f.reachedFence,
  },
  {
    id: 'victor_spotted',
    n: 1,
    space: 'Cottage Side Gate',
    beat: 'Victor spots Miller and bolts down the bluestone laneway',
    isMet: (f) => f.spottedVictor || f.reachedFence,
  },
  {
    id: 'laneway_chase',
    n: 2,
    space: 'Bluestone Laneway',
    beat: 'Pursue Victor down the narrow laneway past obstacles',
    isMet: (f) => f.chasedAlley || f.reachedFence,
  },
  {
    id: 'fence_vault',
    n: 3,
    space: 'Alley Terminus',
    beat: 'Victor scrambles over the corrugated iron perimeter fence',
    isMet: (f) => f.reachedFence || f.filed('victor_bootprint'),
  },
  {
    id: 'radio_arrest',
    n: 4,
    space: 'Alley Fence',
    beat: 'Moretti radios confirming Victor Rakov in custody on Commercial Road',
    isMet: (f) => f.filed('radio_arrest') || f.heard('sir'),
  },
]

export class Scene3GateTracker {
  private readonly caseFile: CaseFile
  private readonly unlockedIds = new Set<string>()
  private readonly seenIds = new Set<string>()
  private readonly heardIds = new Set<string>()
  private readonly unsubscribes: Array<() => void> = []
  private approachedCottage = false
  private spottedVictor = false
  private chasedAlley = false
  private reachedFence = false

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
    )
  }

  get unlocked(): ReadonlySet<string> {
    return this.unlockedIds
  }

  has(gateId: string): boolean {
    return this.unlockedIds.has(gateId)
  }

  get allUnlocked(): boolean {
    return SCENE3_GATES.every((gate) => this.unlockedIds.has(gate.id))
  }

  get outstanding(): GateDef[] {
    return SCENE3_GATES.filter((gate) => !this.unlockedIds.has(gate.id))
  }

  recordVictorSpotted(): void {
    if (this.spottedVictor) return
    this.spottedVictor = true
    this.evaluate()
  }

  recordFenceReached(): void {
    if (this.reachedFence) return
    this.reachedFence = true
    this.evaluate()
  }

  update(playerPos: Vector3): void {
    // Gate 0 trigger: stepping off Regent St onto the cottage path (Z < 9.2)
    if (playerPos.z < 9.2 && !this.approachedCottage) {
      this.approachedCottage = true
      this.evaluate()
    }

    // Gate 1 trigger: approaching cottage side gate (Z < 8.5)
    if (playerPos.z < 8.5 && !this.spottedVictor) {
      this.recordVictorSpotted()
    }

    // Gate 2 trigger: actively pursuing down the bluestone laneway (Z < -2.0)
    if (playerPos.z < -2.0 && !this.chasedAlley) {
      this.chasedAlley = true
      this.evaluate()
    }

    // Gate 3 trigger: reaching alley fence (Z < -16.0)
    if (playerPos.z < -16.0 && !this.reachedFence) {
      this.recordFenceReached()
    }
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
      approachedCottage: this.approachedCottage,
      spottedVictor: this.spottedVictor,
      chasedAlley: this.chasedAlley,
      reachedFence: this.reachedFence,
    }

    for (const gate of SCENE3_GATES) {
      if (this.unlockedIds.has(gate.id) || !gate.isMet(facts)) {
        continue
      }
      this.unlockedIds.add(gate.id)
      emit('gate:unlocked', { gateId: gate.id })
      this.onUnlocked?.(gate.id)
    }
  }
}
