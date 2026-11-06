import type { DialogueGraph } from '../graph.ts'

/**
 * Police shoulder radio exchange concluding Scene 3 (The Laneway Chase).
 *
 * Moretti corners Victor Rakov on Commercial Road after Victor scrambles over the
 * dead-end corrugated iron fence. Miller orders Victor transported to St Kilda
 * Interview Room 1 for interrogation.
 */

export const SCENE3_RADIO_ARREST: DialogueGraph = {
  id: 'scene3.radio.arrest',
  start: 'arrest',
  nodes: {
    arrest: {
      id: 'arrest',
      speaker: 'Moretti (Radio)',
      line: "Miller! Got him! Caught him coming over the back fence onto Commercial Road. Kicking and swearing, but we've got the cuffs on him.",
      choices: [
        { id: 'bring', label: 'Bring him in. Interview Room 1.', next: 'bring' },
        { id: 'search', label: 'Did he have anything on him?', next: 'search' },
      ],
    },
    search: {
      id: 'search',
      speaker: 'Moretti (Radio)',
      line: "No weapon. Pockets empty except a set of house keys and twenty-two dollars cash. He's dirty as hell, Detective.",
      next: 'bring',
    },
    bring: {
      id: 'bring',
      speaker: 'Miller',
      line: "Four points off the hammer handle and now he bolts. Don't let him talk to anyone until we get in the room.",
      next: 'confirm',
    },
    confirm: {
      id: 'confirm',
      speaker: 'Moretti (Radio)',
      line: "Right with you, Detective. Div van is taking him straight back to St Kilda. See you at the station.",
      next: 'sir',
    },
    sir: {
      id: 'sir',
      speaker: 'Miller',
      line: "On my way.",
    },
  },
}

export const SCENE3_THEORISE_LAST_NODE = 'sir'
