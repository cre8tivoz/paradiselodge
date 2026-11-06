/**
 * Save data written on a scene boundary.
 *
 * Only what the next boot needs: which scenes are finished, which evidence is
 * filed, and which scene would load if more than one existed. Scene 2 is not
 * built yet, so a completed scene 1 still boots into scene 1's world — the
 * save is the boundary record, not a teleporter.
 */

export type SceneId = 'scene1' | 'scene2' | 'scene3' | 'scene4' | 'scene5'

export const SCENE_ORDER: readonly SceneId[] = [
  'scene1',
  'scene2',
  'scene3',
  'scene4',
  'scene5',
]

export function getNextScene(current: SceneId): SceneId | undefined {
  const index = SCENE_ORDER.indexOf(current)
  if (index === -1 || index >= SCENE_ORDER.length - 1) {
    return undefined
  }
  return SCENE_ORDER[index + 1]
}

export function isSceneId(value: unknown): value is SceneId {
  return typeof value === 'string' && SCENE_ORDER.includes(value as SceneId)
}

export interface SaveData {
  readonly version: 1
  readonly current: SceneId
  readonly completed: readonly SceneId[]
  readonly evidence: readonly string[]
}

const KEY = 'paradise-lodge.save'
const VERSION = 1 as const

export class Save {
  read(): SaveData | undefined {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw === null) {
        return undefined
      }
      const parsed: unknown = JSON.parse(raw)
      if (!isSaveData(parsed)) {
        return undefined
      }
      return parsed
    } catch {
      return undefined
    }
  }

  write(data: SaveData): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      // Quota or private-mode failures must not crash the scene boundary.
    }
  }

  /** Mark a scene finished and advance the current scene pointer. */
  completeScene(id: SceneId, evidenceIds: readonly string[]): SaveData {
    const existing = this.read()
    const completed = new Set<SceneId>(existing?.completed ?? [])
    completed.add(id)
    const next = getNextScene(id) ?? id
    const data: SaveData = {
      version: VERSION,
      current: next,
      completed: [...completed],
      evidence: [...evidenceIds],
    }
    this.write(data)
    return data
  }

  clear(): void {
    localStorage.removeItem(KEY)
  }
}

function isSaveData(value: unknown): value is SaveData {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const v = value as Record<string, unknown>
  if (v.version !== 1 || !isSceneId(v.current)) {
    return false
  }
  if (!Array.isArray(v.completed) || !Array.isArray(v.evidence)) {
    return false
  }
  return v.completed.every(isSceneId) && v.evidence.every((id) => typeof id === 'string')
}
