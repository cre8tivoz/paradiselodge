import { Vector3 } from 'three'
import type { SceneId } from '../core/save.ts'
import type { Mixer } from './mixer.ts'

/**
 * Ambience beds, crossfaded per zone within the active scene.
 *
 * Scene 1 keeps the four spatial zones from ASSETS.md:
 * - **Street:** traffic on Fitzroy Street, a tram two blocks off, low air
 * - **Lodge interior:** room tone, muffled traffic, a clock, radio through a wall
 * - **Room 1A:** almost nothing. Distant traffic through the open sash, flies
 * - **Yard:** street over a paling fence plus late-summer insects
 *
 * Scenes 2–5 add matched spatial beds so entering an interview room, stepping
 * from Regent Street into the bluestone laneway, or descending to Mahoney's cellar
 * shifts the acoustic weight immediately.
 */

export type Zone = 'street' | 'lodge' | 'room1a' | 'yard'

export type AmbienceZone =
  | Zone
  | 'bullpen'
  | 'interview2'
  | 'prahran_street'
  | 'laneway'
  | 'interrogation'
  | 'pub_bar'
  | 'cellar'

/**
 * Which Scene 1 zone a point is in.
 *
 * Kept in step with lodge.ts by hand, same as the gate box: the building runs
 * x -6.5 to 6.4 and z 0 to 10.5, the ground floor is y 0 and the first floor
 * 3.45. The verandah hangs off +X above 3.45 and is deliberately lumped in with
 * the yard, because it is outdoors and it looks at the same street.
 */
export function zoneAt(p: Vector3): Zone {
  const inside = p.x > -6.5 && p.x < 6.4 && p.z > -0.1 && p.z < 10.5
  if (inside) {
    // Room 1A sits on the first floor in the +X half, toward the street.
    if (p.y > 3.0 && p.x > 1.9 && p.z < 5.0) {
      return 'room1a'
    }
    return 'lodge'
  }
  return p.z < -0.1 ? 'street' : 'yard'
}

function zoneForScene(sceneId: SceneId, p: Vector3): AmbienceZone {
  switch (sceneId) {
    case 'scene1':
      return zoneAt(p)
    case 'scene2':
      return p.x > 3.4 && p.z < -1.4 ? 'interview2' : 'bullpen'
    case 'scene3':
      return p.z < 7.5 ? 'laneway' : 'prahran_street'
    case 'scene4':
      return 'interrogation'
    case 'scene5':
      return p.y < -0.8 ? 'cellar' : 'pub_bar'
    default: {
      const neverScene: never = sceneId
      return neverScene
    }
  }
}

const FADE = 1.6

interface Bed {
  readonly gain: GainNode
  readonly voices: AudioScheduledSourceNode[]
}

export class Ambience {
  private readonly mixer: Mixer
  private readonly beds = new Map<AmbienceZone, Bed>()
  private tone: GainNode | undefined = undefined
  private readonly toneVoices: OscillatorNode[] = []
  private sceneId: SceneId = 'scene1'
  private current: AmbienceZone | undefined = undefined
  private bedsStarted = false

  constructor(mixer: Mixer, initialScene: SceneId = 'scene1') {
    this.mixer = mixer
    this.buildForScene(initialScene)
  }

  /** Switch ambient beds to match the active scene. */
  setScene(sceneId: SceneId): void {
    if (sceneId === this.sceneId && this.beds.size > 0) {
      return
    }
    this.teardownBeds()
    this.buildForScene(sceneId)
    if (this.mixer.isRunning) {
      this.start()
    }
  }

  /** Call once the context is running. Safe to call repeatedly. */
  start(): void {
    if (this.bedsStarted || !this.mixer.isRunning) {
      return
    }
    this.bedsStarted = true
    const t = this.mixer.now
    for (const bed of this.beds.values()) {
      for (const voice of bed.voices) {
        voice.start(t)
      }
    }
    for (const voice of this.toneVoices) {
      voice.start(t)
    }
  }

  /** Crossfade to whatever zone Miller is in. Cheap enough to call per frame. */
  update(playerFeet: Vector3): void {
    if (!this.bedsStarted) {
      return
    }
    const zone = zoneForScene(this.sceneId, playerFeet)
    if (zone === this.current) {
      return
    }
    this.current = zone
    for (const [name, bed] of this.beds) {
      this.mixer.fade(bed.gain.gain, name === zone ? 1 : 0, FADE)
    }
    if (this.tone !== undefined) {
      // The tone belongs to Room 1A and nowhere else.
      this.mixer.fade(
        this.tone.gain,
        zone === 'room1a' ? 1 : 0,
        zone === 'room1a' ? 4.5 : 2.0,
      )
    }
  }

  dispose(): void {
    this.teardownBeds()
  }

  private buildForScene(sceneId: SceneId): void {
    this.sceneId = sceneId
    this.current = undefined
    this.bedsStarted = false

    switch (sceneId) {
      case 'scene1':
        this.beds.set('street', this.buildStreet())
        this.beds.set('lodge', this.buildLodge())
        this.beds.set('room1a', this.buildRoom1A())
        this.beds.set('yard', this.buildYard())
        this.tone = this.buildTone()
        break
      case 'scene2':
        this.beds.set('bullpen', this.buildBullpen())
        this.beds.set('interview2', this.buildInterview2())
        break
      case 'scene3':
        this.beds.set('prahran_street', this.buildPrahranStreet())
        this.beds.set('laneway', this.buildLaneway())
        break
      case 'scene4':
        this.beds.set('interrogation', this.buildInterrogation())
        break
      case 'scene5':
        this.beds.set('pub_bar', this.buildPubBar())
        this.beds.set('cellar', this.buildCellar())
        break
      default: {
        const neverScene: never = sceneId
        throw new Error(`Unhandled scene id: ${String(neverScene)}`)
      }
    }
  }

  private teardownBeds(): void {
    if (this.bedsStarted) {
      for (const bed of this.beds.values()) {
        for (const voice of bed.voices) {
          try {
            voice.stop()
          } catch {
            // Ignore nodes already stopped or never started
          }
          voice.disconnect()
        }
        bed.gain.disconnect()
      }
      for (const voice of this.toneVoices) {
        try {
          voice.stop()
        } catch {
          // Ignore nodes already stopped or never started
        }
        voice.disconnect()
      }
    } else {
      for (const bed of this.beds.values()) {
        bed.gain.disconnect()
      }
    }
    this.tone?.disconnect()
    this.tone = undefined
    this.toneVoices.length = 0
    this.beds.clear()
    this.bedsStarted = false
    this.current = undefined
  }

  /** A bed at zero gain, wired to the ambience bus and ready to be faded up. */
  private bed(): { gain: GainNode; voices: AudioScheduledSourceNode[] } {
    const gain = this.mixer.gain(0)
    gain.connect(this.mixer.bus('ambience'))
    return { gain, voices: [] }
  }

  /**
   * Fitzroy Street. Traffic is low noise with a slow swell in it, the tram is a
   * band of rumble two blocks off, and low wind.
   */
  private buildStreet(): Bed {
    const ctx = this.mixer.context
    const { gain, voices } = this.bed()

    const traffic = this.mixer.noiseSource()
    const trafficFilter = this.mixer.filter('lowpass', 420, 0.7)
    const trafficGain = this.mixer.gain(0.5)
    traffic.connect(trafficFilter).connect(trafficGain).connect(gain)
    voices.push(traffic)

    const swell = ctx.createOscillator()
    swell.type = 'sine'
    swell.frequency.value = 0.06
    const swellDepth = this.mixer.gain(210)
    swell.connect(swellDepth).connect(trafficFilter.frequency)
    voices.push(swell)

    const tram = this.mixer.noiseSource()
    const tramBand = this.mixer.filter('bandpass', 88, 3.5)
    const tramGain = this.mixer.gain(0.0)
    tram.connect(tramBand).connect(tramGain).connect(gain)
    voices.push(tram)

    const tramLfo = ctx.createOscillator()
    tramLfo.type = 'sine'
    tramLfo.frequency.value = 0.021
    const tramDepth = this.mixer.gain(0.16)
    tramLfo.connect(tramDepth).connect(tramGain.gain)
    voices.push(tramLfo)

    const air = this.mixer.noiseSource()
    const airFilter = this.mixer.filter('highpass', 2200, 0.5)
    const airGain = this.mixer.gain(0.02)
    air.connect(airFilter).connect(airGain).connect(gain)
    voices.push(air)

    return { gain, voices }
  }

  /**
   * The lodge. ASSETS.md's "silence with weight", which is not silence: it is a
   * very low bed you stop hearing, a clock, and a radio through a wall.
   */
  private buildLodge(): Bed {
    const ctx = this.mixer.context
    const { gain, voices } = this.bed()

    const room = this.mixer.noiseSource()
    const roomFilter = this.mixer.filter('lowpass', 190, 0.6)
    const roomGain = this.mixer.gain(0.42)
    room.connect(roomFilter).connect(roomGain).connect(gain)
    voices.push(room)

    const muffled = this.mixer.noiseSource()
    const muffledFilter = this.mixer.filter('lowpass', 260, 0.8)
    const muffledGain = this.mixer.gain(0.12)
    muffled.connect(muffledFilter).connect(muffledGain).connect(gain)
    voices.push(muffled)

    const radioBand = this.mixer.filter('bandpass', 900, 4)
    const radioGain = this.mixer.gain(0.035)
    radioBand.connect(radioGain).connect(gain)
    for (const hz of [196, 293.7]) {
      const voice = ctx.createOscillator()
      voice.type = 'sawtooth'
      voice.frequency.value = hz
      const trim = this.mixer.gain(0.5)
      voice.connect(trim).connect(radioBand)
      voices.push(voice)
    }
    const wobble = ctx.createOscillator()
    wobble.type = 'sine'
    wobble.frequency.value = 0.11
    const wobbleDepth = this.mixer.gain(320)
    wobble.connect(wobbleDepth).connect(radioBand.frequency)
    voices.push(wobble)

    const tick = ctx.createOscillator()
    tick.type = 'square'
    tick.frequency.value = 1
    const tickShape = this.mixer.filter('bandpass', 2400, 12)
    const tickGain = this.mixer.gain(0.012)
    tick.connect(tickShape).connect(tickGain).connect(gain)
    voices.push(tick)

    return { gain, voices }
  }

  /**
   * Room 1A. Nearly nothing, on purpose. Distant traffic and flies.
   */
  private buildRoom1A(): Bed {
    const ctx = this.mixer.context
    const { gain, voices } = this.bed()

    const throughSash = this.mixer.noiseSource()
    const sashFilter = this.mixer.filter('bandpass', 340, 0.9)
    const sashGain = this.mixer.gain(0.16)
    throughSash.connect(sashFilter).connect(sashGain).connect(gain)
    voices.push(throughSash)

    const fly = ctx.createOscillator()
    fly.type = 'sawtooth'
    fly.frequency.value = 148
    const flyBand = this.mixer.filter('bandpass', 1500, 7)
    const flyGain = this.mixer.gain(0.0)
    fly.connect(flyBand).connect(flyGain).connect(gain)
    voices.push(fly)

    const wander = ctx.createOscillator()
    wander.type = 'triangle'
    wander.frequency.value = 3.1
    const wanderDepth = this.mixer.gain(26)
    wander.connect(wanderDepth).connect(fly.frequency)
    voices.push(wander)

    const near = ctx.createOscillator()
    near.type = 'sine'
    near.frequency.value = 0.043
    const nearDepth = this.mixer.gain(0.022)
    near.connect(nearDepth).connect(flyGain.gain)
    voices.push(near)
    flyGain.gain.value = 0.024

    return { gain, voices }
  }

  /** The yard. The street, over a paling fence, plus dry late-summer insects. */
  private buildYard(): Bed {
    const ctx = this.mixer.context
    const { gain, voices } = this.bed()

    const overFence = this.mixer.noiseSource()
    const fenceFilter = this.mixer.filter('lowpass', 520, 0.7)
    const fenceGain = this.mixer.gain(0.3)
    overFence.connect(fenceFilter).connect(fenceGain).connect(gain)
    voices.push(overFence)

    const insects = this.mixer.noiseSource()
    const insectBand = this.mixer.filter('bandpass', 4200, 9)
    const insectGain = this.mixer.gain(0.03)
    insects.connect(insectBand).connect(insectGain).connect(gain)
    voices.push(insects)

    const pulse = ctx.createOscillator()
    pulse.type = 'sine'
    pulse.frequency.value = 6.2
    const pulseDepth = this.mixer.gain(0.02)
    pulse.connect(pulseDepth).connect(insectGain.gain)
    voices.push(pulse)

    return { gain, voices }
  }

  /**
   * Scene 2 — St Kilda Police Station Bullpen: fluorescent ballast hum,
   * institutional aircon, distant shift murmur behind partitions.
   */
  private buildBullpen(): Bed {
    const ctx = this.mixer.context
    const { gain, voices } = this.bed()

    const hvac = this.mixer.noiseSource()
    const hvacFilter = this.mixer.filter('lowpass', 240, 0.7)
    const hvacGain = this.mixer.gain(0.34)
    hvac.connect(hvacFilter).connect(hvacGain).connect(gain)
    voices.push(hvac)

    // 50Hz mains / 100Hz fluorescent ballast buzz
    for (const [hz, level] of [[50, 0.018], [100, 0.011]] as const) {
      const hum = ctx.createOscillator()
      hum.type = 'sine'
      hum.frequency.value = hz
      const humGain = this.mixer.gain(level)
      hum.connect(humGain).connect(gain)
      voices.push(hum)
    }

    // Muffled shift chatter behind glass partitions
    const murmur = this.mixer.noiseSource()
    const murmurBand = this.mixer.filter('bandpass', 720, 3.2)
    const murmurGain = this.mixer.gain(0.032)
    murmur.connect(murmurBand).connect(murmurGain).connect(gain)
    voices.push(murmur)

    const murmurLfo = ctx.createOscillator()
    murmurLfo.type = 'sine'
    murmurLfo.frequency.value = 0.14
    const murmurDepth = this.mixer.gain(240)
    murmurLfo.connect(murmurDepth).connect(murmurBand.frequency)
    voices.push(murmurLfo)

    return { gain, voices }
  }

  /** Scene 2 — Interview Room 2: tighter acoustic tile deadness + tube hum. */
  private buildInterview2(): Bed {
    const ctx = this.mixer.context
    const { gain, voices } = this.bed()

    const vent = this.mixer.noiseSource()
    const ventFilter = this.mixer.filter('lowpass', 180, 0.8)
    const ventGain = this.mixer.gain(0.24)
    vent.connect(ventFilter).connect(ventGain).connect(gain)
    voices.push(vent)

    const tube = ctx.createOscillator()
    tube.type = 'sine'
    tube.frequency.value = 100
    const tubeGain = this.mixer.gain(0.014)
    tube.connect(tubeGain).connect(gain)
    voices.push(tube)

    return { gain, voices }
  }

  /** Scene 3 — Regent Street: damp night breeze, sodium hum, distant traffic. */
  private buildPrahranStreet(): Bed {
    const ctx = this.mixer.context
    const { gain, voices } = this.bed()

    const traffic = this.mixer.noiseSource()
    const trafficFilter = this.mixer.filter('lowpass', 380, 0.8)
    const trafficGain = this.mixer.gain(0.36)
    traffic.connect(trafficFilter).connect(trafficGain).connect(gain)
    voices.push(traffic)

    const swell = ctx.createOscillator()
    swell.type = 'sine'
    swell.frequency.value = 0.045
    const swellDepth = this.mixer.gain(160)
    swell.connect(swellDepth).connect(trafficFilter.frequency)
    voices.push(swell)

    const sodium = ctx.createOscillator()
    sodium.type = 'sine'
    sodium.frequency.value = 100
    const sodiumGain = this.mixer.gain(0.012)
    sodium.connect(sodiumGain).connect(gain)
    voices.push(sodium)

    return { gain, voices }
  }

  /** Scene 3 — Bluestone Laneway: tight alley draft and drain resonance. */
  private buildLaneway(): Bed {
    const ctx = this.mixer.context
    const { gain, voices } = this.bed()

    const draft = this.mixer.noiseSource()
    const draftBand = this.mixer.filter('bandpass', 540, 1.4)
    const draftGain = this.mixer.gain(0.22)
    draft.connect(draftBand).connect(draftGain).connect(gain)
    voices.push(draft)

    const commercial = this.mixer.noiseSource()
    const commFilter = this.mixer.filter('lowpass', 220, 0.9)
    const commGain = this.mixer.gain(0.24)
    commercial.connect(commFilter).connect(commGain).connect(gain)
    voices.push(commercial)

    // Slow downpipe drip modulation
    const dripLfo = ctx.createOscillator()
    dripLfo.type = 'sine'
    dripLfo.frequency.value = 0.72
    const dripOsc = ctx.createOscillator()
    dripOsc.type = 'sine'
    dripOsc.frequency.value = 1420
    const dripBand = this.mixer.filter('bandpass', 1420, 14)
    const dripGain = this.mixer.gain(0.0)
    const dripDepth = this.mixer.gain(0.008)
    dripLfo.connect(dripDepth).connect(dripGain.gain)
    dripOsc.connect(dripBand).connect(dripGain).connect(gain)
    voices.push(dripLfo, dripOsc)

    return { gain, voices }
  }

  /** Scene 4 — CID Interview Room 1: tight cinderblock silence, tube & tape capstan. */
  private buildInterrogation(): Bed {
    const ctx = this.mixer.context
    const { gain, voices } = this.bed()

    const room = this.mixer.noiseSource()
    const roomFilter = this.mixer.filter('lowpass', 175, 0.7)
    const roomGain = this.mixer.gain(0.28)
    room.connect(roomFilter).connect(roomGain).connect(gain)
    voices.push(room)

    const fluorescent = ctx.createOscillator()
    fluorescent.type = 'sine'
    fluorescent.frequency.value = 100
    const fluoGain = this.mixer.gain(0.017)
    fluorescent.connect(fluoGain).connect(gain)
    voices.push(fluorescent)

    // Subtle CTR-80 cassette drive motor buzz
    const tapeWhir = ctx.createOscillator()
    tapeWhir.type = 'triangle'
    tapeWhir.frequency.value = 165
    const tapeBand = this.mixer.filter('bandpass', 180, 4.0)
    const tapeGain = this.mixer.gain(0.008)
    tapeWhir.connect(tapeBand).connect(tapeGain).connect(gain)
    voices.push(tapeWhir)

    return { gain, voices }
  }

  /** Scene 5 — Mahoney's Public Bar: muted late-night crowd murmur & fridge hum. */
  private buildPubBar(): Bed {
    const ctx = this.mixer.context
    const { gain, voices } = this.bed()

    const crowd = this.mixer.noiseSource()
    const crowdBand = this.mixer.filter('bandpass', 480, 1.5)
    const crowdGain = this.mixer.gain(0.16)
    crowd.connect(crowdBand).connect(crowdGain).connect(gain)
    voices.push(crowd)

    const crowdSwell = ctx.createOscillator()
    crowdSwell.type = 'sine'
    crowdSwell.frequency.value = 0.18
    const swellDepth = this.mixer.gain(160)
    crowdSwell.connect(swellDepth).connect(crowdBand.frequency)
    voices.push(crowdSwell)

    // Coolroom / beer fridge compressor under bar
    const fridge = ctx.createOscillator()
    fridge.type = 'sine'
    fridge.frequency.value = 60
    const fridgeGain = this.mixer.gain(0.02)
    fridge.connect(fridgeGain).connect(gain)
    voices.push(fridge)

    const sub = this.mixer.noiseSource()
    const subFilter = this.mixer.filter('lowpass', 160, 0.7)
    const subGain = this.mixer.gain(0.25)
    sub.connect(subFilter).connect(subGain).connect(gain)
    voices.push(sub)

    return { gain, voices }
  }

  /** Scene 5 — Mahoney's Beer Cellar: damp stone, glycol chiller compressor hum. */
  private buildCellar(): Bed {
    const ctx = this.mixer.context
    const { gain, voices } = this.bed()

    const dampAir = this.mixer.noiseSource()
    const dampFilter = this.mixer.filter('lowpass', 150, 0.9)
    const dampGain = this.mixer.gain(0.32)
    dampAir.connect(dampFilter).connect(dampGain).connect(gain)
    voices.push(dampAir)

    for (const [hz, level] of [[48, 0.026], [96, 0.015]] as const) {
      const chiller = ctx.createOscillator()
      chiller.type = 'sawtooth'
      chiller.frequency.value = hz
      const lp = this.mixer.filter('lowpass', 140, 1.2)
      const trim = this.mixer.gain(level)
      chiller.connect(lp).connect(trim).connect(gain)
      voices.push(chiller)
    }

    return { gain, voices }
  }

  /**
   * ASSETS.md: "A single sustained low tone in room 1A that you cannot quite
   * identify as music."
   */
  private buildTone(): GainNode {
    const ctx = this.mixer.context
    const out = this.mixer.gain(0)
    out.connect(this.mixer.bus('music'))

    const soften = this.mixer.filter('lowpass', 300, 0.7)
    soften.connect(out)

    for (const hz of [73.4, 73.9, 110.2]) {
      const voice = ctx.createOscillator()
      voice.type = 'sine'
      voice.frequency.value = hz
      const trim = this.mixer.gain(hz > 100 ? 0.22 : 0.5)
      voice.connect(trim).connect(soften)
      this.toneVoices.push(voice)
    }
    return out
  }
}
