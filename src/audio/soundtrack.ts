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
const CROSSFADE_SEC = 0.9
const INTERRUPT_FADE_SEC = 0.045

interface TrackSlot {
  readonly audio: HTMLAudioElement
  readonly source?: MediaElementAudioSourceNode
  readonly gainNode?: GainNode
}

interface FadingSlot {
  readonly slot: TrackSlot
  timer: number
  fallbackInterval?: number
}

export class SoundtrackPlayer {
  private readonly mixer: Mixer | undefined
  private readonly duckGain: GainNode | undefined
  private readonly trimGain: GainNode | undefined
  private activeSlot: TrackSlot | undefined
  private readonly fadingOut = new Set<FadingSlot>()
  private incomingFadeInterval: number | undefined
  private currentTrack: TrackId | undefined
  private ducked = false
  private enabled = true

  constructor(mixer?: Mixer) {
    this.mixer = mixer
    if (mixer !== undefined) {
      this.duckGain = mixer.gain(1.0)
      this.trimGain = mixer.gain(MUSIC_BUS_TRIM)
      this.duckGain.connect(this.trimGain).connect(mixer.bus('music'))
    }
  }

  play(track: TrackId): void {
    if (this.currentTrack === track && this.activeSlot !== undefined) {
      if (this.enabled && this.activeSlot.audio.paused) {
        this.activeSlot.audio.play().catch(() => {
          // Handled via user interaction unlock
        })
      }
      return
    }

    const src = TRACKS[track]
    if (!src) return

    // Cancel any fallback fade-in on the previous slot and hasten fading-out slots.
    this.clearIncomingFade()
    this.hastenFadingOut()
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
        gainNode = this.mixer.gain(0.0)
        source.connect(gainNode).connect(this.duckGain)
        audio.volume = 1.0
      } catch {
        source = undefined
        gainNode = undefined
        audio.volume = 0.0
      }
    } else {
      audio.volume = 0.0
    }

    const incoming: TrackSlot = { audio, source, gainNode }
    this.activeSlot = incoming

    if (this.enabled) {
      audio.play().catch(() => {
        // Handled via user interaction unlock
      })
    }

    if (outgoing !== undefined) {
      this.fadeInSlot(incoming, CROSSFADE_SEC)
      this.fadeOutSlot(outgoing, CROSSFADE_SEC)
    } else {
      this.fadeInSlot(incoming, 0.06)
    }
  }

  /** Duck score by ~5 dB during conversations. */
  duck(active: boolean): void {
    this.ducked = active
    const target = active ? DUCK_MULTIPLIER : 1.0
    if (this.mixer !== undefined && this.duckGain !== undefined) {
      this.mixer.fade(this.duckGain.gain, target, 0.25)
    }
    if (
      this.activeSlot !== undefined &&
      this.activeSlot.gainNode === undefined &&
      this.incomingFadeInterval === undefined
    ) {
      this.activeSlot.audio.volume = this.targetVolume()
    }
  }

  unlock(): void {
    if (this.activeSlot !== undefined && this.activeSlot.audio.paused && this.enabled) {
      this.activeSlot.audio.play().catch(() => {})
    }
  }

  stop(): void {
    this.clearIncomingFade()
    this.clearAllFadingOut()
    if (this.activeSlot !== undefined) {
      this.teardownSlot(this.activeSlot)
      this.activeSlot = undefined
    }
    this.currentTrack = undefined
  }

  dispose(): void {
    this.stop()
    this.duckGain?.disconnect()
    this.trimGain?.disconnect()
  }

  private targetVolume(): number {
    return this.ducked ? BASE_VOLUME * DUCK_MULTIPLIER : BASE_VOLUME
  }

  private clearIncomingFade(): void {
    if (this.incomingFadeInterval !== undefined) {
      window.clearInterval(this.incomingFadeInterval)
      this.incomingFadeInterval = undefined
    }
  }

  private fadeInSlot(slot: TrackSlot, seconds: number): void {
    if (this.mixer !== undefined && slot.gainNode !== undefined) {
      const now = this.mixer.now
      const g = slot.gainNode.gain
      g.cancelScheduledValues(now)
      g.setValueAtTime(0.0, now)
      g.linearRampToValueAtTime(1.0, now + Math.max(0.015, seconds))
      return
    }

    if (seconds <= 0.1) {
      slot.audio.volume = this.targetVolume()
      return
    }

    const steps = 18
    const intervalMs = Math.max(16, Math.round((seconds * 1000) / steps))
    let step = 0
    this.incomingFadeInterval = window.setInterval(() => {
      step += 1
      const t = Math.min(1, step / steps)
      slot.audio.volume = t * this.targetVolume()
      if (t >= 1) {
        this.clearIncomingFade()
      }
    }, intervalMs)
  }

  private fadeOutSlot(outgoing: TrackSlot, seconds: number): void {
    if (this.mixer !== undefined && outgoing.gainNode !== undefined) {
      const now = this.mixer.now
      const outGain = outgoing.gainNode.gain
      const currentOut = outGain.value
      outGain.cancelScheduledValues(now)
      outGain.setValueAtTime(currentOut, now)
      outGain.linearRampToValueAtTime(0.0, now + seconds)

      const entry: FadingSlot = {
        slot: outgoing,
        timer: window.setTimeout(() => {
          this.fadingOut.delete(entry)
          this.teardownSlot(outgoing)
        }, Math.round(seconds * 1000) + 40),
      }
      this.fadingOut.add(entry)
      return
    }

    const steps = 18
    const intervalMs = Math.max(16, Math.round((seconds * 1000) / steps))
    let step = 0
    const startVol = outgoing.audio.volume
    const entry: FadingSlot = { slot: outgoing, timer: 0 }
    entry.fallbackInterval = window.setInterval(() => {
      step += 1
      const t = Math.min(1, step / steps)
      outgoing.audio.volume = (1 - t) * startVol
      if (t >= 1) {
        if (entry.fallbackInterval !== undefined) {
          window.clearInterval(entry.fallbackInterval)
        }
        this.fadingOut.delete(entry)
        this.teardownSlot(outgoing)
      }
    }, intervalMs)
    this.fadingOut.add(entry)
  }

  private hastenFadingOut(): void {
    for (const entry of [...this.fadingOut]) {
      window.clearTimeout(entry.timer)
      if (entry.fallbackInterval !== undefined) {
        window.clearInterval(entry.fallbackInterval)
        entry.fallbackInterval = undefined
      }
      if (this.mixer !== undefined && entry.slot.gainNode !== undefined) {
        const now = this.mixer.now
        const g = entry.slot.gainNode.gain
        const cur = g.value
        g.cancelScheduledValues(now)
        g.setValueAtTime(cur, now)
        g.linearRampToValueAtTime(0.0, now + INTERRUPT_FADE_SEC)
        entry.timer = window.setTimeout(() => {
          this.fadingOut.delete(entry)
          this.teardownSlot(entry.slot)
        }, Math.round(INTERRUPT_FADE_SEC * 1000) + 25)
      } else {
        this.fadingOut.delete(entry)
        this.teardownSlot(entry.slot)
      }
    }
  }

  private clearAllFadingOut(): void {
    for (const entry of this.fadingOut) {
      window.clearTimeout(entry.timer)
      if (entry.fallbackInterval !== undefined) {
        window.clearInterval(entry.fallbackInterval)
      }
      this.teardownSlot(entry.slot)
    }
    this.fadingOut.clear()
  }

  private teardownSlot(slot: TrackSlot): void {
    if (this.mixer !== undefined && slot.gainNode !== undefined) {
      slot.gainNode.gain.cancelScheduledValues(this.mixer.now)
    }
    slot.audio.pause()
    slot.audio.currentTime = 0
    slot.audio.removeAttribute('src')
    slot.audio.load()
    slot.source?.disconnect()
    slot.gainNode?.disconnect()
  }
}
