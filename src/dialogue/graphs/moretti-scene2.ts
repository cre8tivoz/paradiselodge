import type { DialogueGraph } from '../graph.ts'

/**
 * Moretti's dialogue in Scene 2 (The Station).
 */

export const MORETTI_STATION_STANDBY: DialogueGraph = {
  id: 'moretti.station.standby',
  start: 'wait',
  nodes: {
    wait: {
      id: 'wait',
      speaker: 'Moretti',
      line: "Forensics is processing the latents now. Coffee urn's hot over on the break bench, Detective.",
    },
  },
}

export const MORETTI_STATION_INTERVIEW: DialogueGraph = {
  id: 'moretti.station.interview',
  start: 'info',
  nodes: {
    info: {
      id: 'info',
      speaker: 'Moretti',
      line: "Uniforms brought Mark in. He's sitting in Interview Room 2 when you're ready to take him through Tuesday night.",
    },
  },
}

export const MORETTI_STATION_EXIT: DialogueGraph = {
  id: 'moretti.station.exit',
  start: 'ready',
  nodes: {
    ready: {
      id: 'ready',
      speaker: 'Moretti',
      line: "Mark's alibi checks out. Bouncers at the Prince have him on the door all night.",
      choices: [
        { id: 'run', label: 'And we have our man on the hammer.', next: 'hammer' },
        { id: 'wait', label: 'Give me another second in here.', next: 'hold' },
      ],
    },
    hold: {
      id: 'hold',
      speaker: 'Moretti',
      line: "Righto. Keys to the Commodore are in my pocket.",
    },
    hammer: {
      id: 'hammer',
      speaker: 'Miller',
      line: "Victor Rakov. Four points off the timber handle.",
      next: 'link',
    },
    link: {
      id: 'link',
      speaker: 'Moretti',
      line: "Rakov runs collection for Sterling at Mahoney's. Everything ties straight back to that bar.",
      next: 'address',
    },
    address: {
      id: 'address',
      speaker: 'Miller',
      line: "LEAP file gave us 14 Regent Street, Prahran. Bluestone laneway off Commercial Road.",
      next: 'rollout',
    },
    rollout: {
      id: 'rollout',
      speaker: 'Moretti',
      line: "I'll radio Prahran station for backup in case he bolts. Ready when you are, sir.",
      next: 'sir',
    },
    sir: {
      id: 'sir',
      speaker: 'Miller',
      line: "Let's go take him.",
    },
  },
}

export const SCENE2_THEORISE_LAST_NODE = 'sir'
