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
  /**
   * What you see through the sash at 3pm. Not in ASSETS.md, so it is an
   * assumption like the glove colour.
   *
   * It is deliberately near white rather than sky blue. A real photograph of a
   * sunlit room blows its windows out, and BRIEF.md asks room 1A to photograph
   * like a real estate listing. A correctly exposed sky outside would make the
   * interior read as the dark thing in frame, which is the opposite of the point.
   */
  daylight: 0xfff6e6,
} as const

/**
 * Miller's hands. The only part of him the player sees until the last shot.
 *
 * ASSETS.md gives no glove colour and the palette has no token for one, so
 * `glove` is an assumption: pale cream latex, which is what a 1994 Victorian
 * crime scene would actually have. Change this one value if that is wrong.
 *
 * `cuff` is not an assumption. IMAGE-PROMPTS.md puts Miller in a white
 * business shirt with the sleeves buttoned at the wrist, and CLAUDE.md's
 * ageing table has scene 1 cuffs clean and buttoned.
 */
export const HANDS = {
  glove: 0xd9d2be,
  gloveSeam: 0xc7bfa8,
  cuff: 0xf2f0ea,
  cuffShadow: 0xd8d4c8,
} as const

/**
 * Rosie. Read off images/characters/rosie-sheet.png rather than ASSETS.md,
 * which gives no character colours. The cardigan is meant to clash: it is
 * described as genuinely ugly and hand-knitted, and four fighting colours is
 * the point of it.
 */
export const ROSIE = {
  skin: 0xd0ab90,
  hairRed: 0xa8542a,
  hairGrey: 0x9c948a,
  cardiganTan: 0x9a7846,
  cardiganMustard: 0xc0964a,
  cardiganBurgundy: 0x7a3038,
  cardiganBrown: 0x5c4630,
  shirt: 0x7d6a68,
  skirt: 0x23252e,
  shoe: 0x4a3a2e,
  glasses: 0x2b2b2b,
  cigarette: 0xe8e4dc,
  ember: 0xff5a22,
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
