/**
 * Sourced 1990s Film-Noir Soundtrack Player.
 *
 * Plays ambient noir soundtrack cues layered under synthesised footsteps and foley.
 * Loopable with soft volume (0.28) so dialogue and environmental foley stay prominent.
 */

export type TrackId = 'scene1' | 'scene2' | 'scene3' | 'scene4' | 'scene5'

const TRACKS: Record<TrackId, string> = {
  scene1: '/audio/soundtrack/01-theme-paradise-lodge.mp3',
  scene2: '/audio/soundtrack/02-theme-st-kilda-precinct.mp3',
  scene3: '/audio/soundtrack/03-theme-prahran-laneway.mp3',
  scene4: '/audio/soundtrack/04-theme-interview-tape.mp3',
  scene5: '/audio/soundtrack/05-theme-mahoneys-end.mp3',
}

export class SoundtrackPlayer {
  private audio: HTMLAudioElement | undefined
  private currentTrack: TrackId | undefined
  private enabled = true

  play(track: TrackId): void {
    if (this.currentTrack === track && this.audio && !this.audio.paused) {
      return
    }

    if (this.audio) {
      this.audio.pause()
      this.audio.src = ''
    }

    const src = TRACKS[track]
    if (!src) return

    this.currentTrack = track
    this.audio = new window.Audio(src)
    this.audio.loop = true
    this.audio.volume = 0.28

    if (this.enabled) {
      this.audio.play().catch(() => {
        // Handled via user interaction unlock
      })
    }
  }

  unlock(): void {
    if (this.audio && this.audio.paused && this.enabled) {
      this.audio.play().catch(() => {})
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause()
      this.audio.currentTime = 0
    }
    this.currentTrack = undefined
  }

  dispose(): void {
    this.stop()
    this.audio = undefined
  }
}
