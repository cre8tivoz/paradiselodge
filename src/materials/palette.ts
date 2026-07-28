/**
 * The locked palette, from ASSETS.md. Store as constants, never hardcode a
 * colour in a material.
 */

export const EXTERIOR = {
  renderCream: 0xd8cdba,
  renderStain: 0x8a7c68,
  marbleStep: 0xc9c4b8,
  ironLace: 0x2e2a26,
  neonPink: 0xff3e8a,
  neonCyan: 0x3ee8ff,
  tapeBlue: 0x1b3a6b,
} as const

export const INTERIOR = {
  nicotine: 0xc4b393,
  carpetBrown: 0x5c4433,
  timberDark: 0x3b2a1e,
  brassVerdigris: 0x7a8a6b,
  curtainMaroon: 0x5a2730,
} as const

export const ROOM_1A = {
  wallpaperFloral: 0xb8a48c,
  sunWarm: 0xffe0b0,
  /**
   * ASSETS.md lists `sun-shadow` as `#6E6croll`, which is not a colour. The
   * note in that table gives `#6E6255` as the intended value. Using that.
   */
  sunShadow: 0x6e6255,
  bedspreadRose: 0x9c6b72,
  crystalDress: 0xe8e2d6,
} as const

/**
 * Test room only. Never ships. Deliberately outside the locked palette so a
 * grey box is never mistaken for authored geometry.
 */
export const GREYBOX = {
  floor: 0x6f6f6f,
  wall: 0x9a9a9a,
  prop: 0xb4b4b4,
  propAlt: 0x808080,
} as const
