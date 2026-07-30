import { SRGBColorSpace, Texture, TextureLoader } from 'three'

/**
 * The shipped textures, and the sub-rectangles the props actually use.
 *
 * ## Windows, not crops
 *
 * Every source in `images/assets/` is a photograph of a whole thing: the neon
 * one is a facade with a sign on it, not a sign. Rather than cutting the region
 * out with an image tool and baking the decision into the file, each prop takes
 * a **window** into the full image through `offset` and `repeat`. The numbers
 * below are read straight off the picture and can be nudged in code, which is
 * the difference between tuning a texture in a minute and re-exporting an asset.
 *
 * ## Colour space is not optional
 *
 * Three has needed `SRGBColorSpace` on every colour map since r152. Without it
 * a photograph comes back pale and chalky and looks like a washed-out decal,
 * which reads as a bug in the lighting rather than in the texture.
 *
 * ## Windows are measured from the top
 *
 * Because that is how you read them off an image. `uvWindow` flips into three's
 * bottom-left origin so the call site never has to think about it.
 */

const loader = new TextureLoader()
const cache = new Map<string, Texture>()

export type TextureName = 'photo-in-frame' | 'diary-page' | 'note' | 'victor-record'

/**
 * `images/assets/neon-sign.png` is deliberately not in here.
 *
 * It is a photograph of a whole facade at dusk with the sign on it, and the
 * letterforms sit on a pale rendered wall. There is no way to use it as a sign
 * texture without the wall coming with them: additive blending lifts the board
 * to grey, and an alpha map off luminance cannot separate a mid-grey wall from a
 * mid-bright tube. It is reference for what the sign should look like, not an
 * asset. The neon stays two tubes until there is an isolated letterform image
 * with an alpha channel.
 */

/**
 * Where the interesting part of each source actually is, in fractions of the
 * image, measured from the top left. Read off the pictures by eye.
 */
export const WINDOWS: Readonly<Record<TextureName, readonly [number, number, number, number]>> = {
  // The whole print. Crystal and Mark at a pub table, date stamped 12 3 1993,
  // which is the dust ring's alibi: it lay face down for weeks.
  'photo-in-frame': [0.02, 0.02, 0.98, 0.98],
  'diary-page': [0.06, 0.08, 0.94, 0.92],
  note: [0.08, 0.10, 0.92, 0.90],
  'victor-record': [0.04, 0.04, 0.96, 0.96],
}

/** Load once, shared. Nothing here is big enough to want unloading. */
export function texture(name: TextureName): Texture {
  const existing = cache.get(name)
  if (existing !== undefined) {
    return existing
  }
  const loaded = loader.load(`/textures/${name}.jpg`)
  loaded.colorSpace = SRGBColorSpace
  loaded.anisotropy = 4
  cache.set(name, loaded)
  return loaded
}

/**
 * A texture windowed to one region of its source.
 *
 * Cloned, because `offset` and `repeat` live on the texture and two props
 * windowing the same source would otherwise fight over them. Clones share the
 * uploaded image, so this costs nothing on the GPU.
 */
export function windowed(name: TextureName): Texture {
  const [x0, y0, x1, y1] = WINDOWS[name]
  const tex = texture(name).clone()
  tex.needsUpdate = true
  tex.repeat.set(x1 - x0, y1 - y0)
  // Three's V runs up from the bottom, the window is measured down from the top.
  tex.offset.set(x0, 1 - y1)
  return tex
}
