/**
 * Scene 1 look. Dusk is the default. `?look=day` (or `?daylight=1`) restores
 * the 3pm HDRI, the single sun and the baked lightmaps, with no post stack.
 */

export type LookMode = 'dusk' | 'day'

export function readLookMode(search: string = window.location.search): LookMode {
  const q = new URLSearchParams(search)
  const look = q.get('look')
  if (look === 'day' || look === 'daylight' || q.get('daylight') === '1') return 'day'
  return 'dusk'
}
