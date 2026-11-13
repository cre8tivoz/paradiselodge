import type { Mixer } from './mixer.ts'

/**
 * 1990s Film-Noir Soundtrack Player.
 *
 * Plays the approved 5-track ElevenLabs ambient noir score under synthesised
 * footsteps and foley. Crossfades cleanly between scenes and ducks -5 dB when
 * dialogue is active.
 */

export type TrackId = 'scene1' | 'scene2' | 'scene3' | 'scene4' | 'scene5'

const TRACKS: Record<TrackId, string> = {
  scene1: '/audio/soundtrack/01-theme-paradise-lodge.mp3',
  scene2: '/audio/soundtrack/02-theme-st-kilda-precinct.mp3',
  scene3: '/audio/soundtrack/03-theme-prahran-laneway.mp3',
  scene4: '/audio/soundtrack/04-theme-interview-tape.mp3',
  scene5: '/audio/soundtrack/05-theme-mahoneys-end.mp3',
}

const BASE_VOLUME = 0.28
const DUCK_MULTIPLIER = 0.55 // ~ -5 dB during dialogue
const MUSIC_BUS_TRIM = 1.75 // 1.75 * 0.16 bus gain = 0.28 effective level
const CROSSFADE_MS = 900

interface TrackSlot {
  readonly audio: HTMLAudioElement
  readonly source?: MediaElementAudioSourceNode
  readonly gainNode?: GainNode
}

export class SoundtrackPlayer {
  private readonly mixer: Mixer | undefined
  private readonly duckGain: GainNode | undefined
  private activeSlot: TrackSlot | undefined
  private currentTrack: TrackId | undefined
  private ducked = false
  private fadeTimer: number | undefined
  private enabled = true

  constructor(mixer?: Mixer) {
    this.mixer = mixer
    if (mixer !== undefined) {
      this.duckGain = mixer.gain(1.0)
      const trim = mixer.gain(MUSIC_BUS_TRIM)
      this.duckGain.connect(trim).connect(mixer.bus('music'))
    }
  }

  play(track: TrackId): void {
    if (this.currentTrack === track && this.activeSlot !== undefined && !this.activeSlot.audio.paused) {
      return
    }

    const src = TRACKS[track]
    if (!src) return

    this.cancelFade()
    const outgoing = this.activeSlot
    this.currentTrack = track

    const audio = new window.Audio(src)
    audio.crossOrigin = 'anonymous'
    audio.loop = true

    let source: MediaElementAudioSourceNode | undefined
    let gainNode: GainNode | undefined
    if (this.mixer !== undefined && this.duckGain !== undefined) {
      try {
        source = this.mixer.context.createMediaElementSource(audio)
        gainNode = this.mixer.gain(outgoing === undefined ? 1.0 : 0.0)
        source.connect(gainNode).connect(this.duckGain)
        audio.volume = 1.0
      } catch {
        source = undefined
        gainNode = undefined
        audio.volume = outgoing === undefined ? this.targetVolume() : 0.0
      }
    } else {
      audio.volume = outgoing === undefined ? this.targetVolume() : 0.0
    }

    const incoming: TrackSlot = { audio, source, gainNode }
    this.activeSlot = incoming

    if (this.enabled) {
      audio.play().catch(() => {
        // Handled via user interaction unlock
      })
    }

    if (outgoing !== undefined) {
      this.crossfade(outgoing, incoming)
    }
  }

  /** Duck score by ~5 dB during conversations. */
  duck(active: boolean): void {
    this.ducked = active
    const target = active ? DUCK_MULTIPLIER : 1.0
    if (this.mixer !== undefined && this.duckGain !== undefined) {
      this.mixer.fade(this.duckGain.gain, target, 0.25)
    } else if (this.activeSlot !== undefined) {
      this.activeSlot.audio.volume = this.targetVolume()
    }
  }

  unlock(): void {
    if (this.activeSlot !== undefined && this.activeSlot.audio.paused && this.enabled) {
      this.activeSlot.audio.play().catch(() => {})
    }
  }

  stop(): void {
    this.cancelFade()
    if (this.activeSlot !== undefined) {
      this.teardownSlot(this.activeSlot)
      this.activeSlot = undefined
    }
    this.currentTrack = undefined
  }

  dispose(): void {
    this.stop()
    this.duckGain?.disconnect()
  }

  private targetVolume(): number {
    return this.ducked ? BASE_VOLUME * DUCK_MULTIPLIER : BASE_VOLUME
  }

  private crossfade(outgoing: TrackSlot, incoming: TrackSlot): void {
    const steps = 18
    const intervalMs = Math.max(16, Math.round(CROSSFADE_MS / steps))
    let step = 0

    this.fadeTimer = window.setInterval(() => {
      step += 1
      const t = Math.min(1, step / steps)

      if (incoming.gainNode !== undefined) {
        incoming.gainNode.gain.value = t
      } else {
        incoming.audio.volume = t * this.targetVolume()
      }

      if (outgoing.gainNode !== undefined) {
        outgoing.gainNode.gain.value = 1 - t
      } else {
        outgoing.audio.volume = (1 - t) * this.targetVolume()
      }

      if (t >= 1) {
        this.cancelFade()
        this.teardownSlot(outgoing)
      }
    }, intervalMs)
  }

  private cancelFade(): void {
    if (this.fadeTimer !== undefined) {
      window.clearInterval(this.fadeTimer)
      this.fadeTimer = undefined
    }
  }

  private teardownSlot(slot: TrackSlot): void {
    slot.audio.pause()
    slot.audio.currentTime = 0
    slot.audio.src = ''
    slot.source?.disconnect()
    slot.gainNode?.disconnect()
  }
}
