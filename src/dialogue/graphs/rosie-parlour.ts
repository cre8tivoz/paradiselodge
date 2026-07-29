import type { DialogueChoice, DialogueGraph } from '../graph.ts'

/**
 * Rosie in the parlour, on the way back down. Gate 5.
 *
 * BRIEF.md: "there was noise at 2am, but this is St Kilda, there's always loud
 * bangs. She's not evasive and she's not lying."
 *
 * That is the whole job of this conversation and it is easy to get wrong. She
 * is not a witness holding something back and she is not a suspect. She heard a
 * bang, she rolled over, and the reason that is not negligence is that she is
 * right about the street. The verandah is what makes her irrelevant to how
 * anyone got upstairs, and she says so herself without knowing what she has
 * said. Miller does not react and the player is not told.
 *
 * No evidence files here. The diary is on the table beside her and it is
 * tagged, not examined, so it lands with Moretti at step 12.
 */

const ASK: readonly DialogueChoice[] = [
  { id: 'noise', label: 'Did you hear anything last night?', next: 'noise' },
  { id: 'crystal', label: 'How long had she been here?', next: 'crystal' },
  { id: 'who', label: 'Who else was in the house?', next: 'who' },
  { id: 'leave', label: "That'll do for now.", next: 'leave' },
]

export const ROSIE_PARLOUR: DialogueGraph = {
  id: 'rosie.parlour',
  start: 'sit',
  nodes: {
    sit: {
      id: 'sit',
      speaker: 'Rosie',
      line: "You were up there a while. Sit down if you want, I'm not getting up.",
      next: 'ask',
    },
    ask: {
      id: 'ask',
      speaker: 'Rosie',
      line: 'Go on then.',
      choices: ASK,
    },

    noise: {
      id: 'noise',
      speaker: 'Rosie',
      line: 'There was a bang. Two of them, close together. Around two.',
      next: 'noise2',
    },
    noise2: {
      id: 'noise2',
      speaker: 'Rosie',
      // The whole point of her, and she has no idea she has just said it.
      line: "This is Fitzroy Street. There's always a loud bang. You'd never sleep if you got up for every one of them.",
      next: 'more',
    },

    crystal: {
      id: 'crystal',
      speaker: 'Rosie',
      line: "Four years. Longest anyone's stopped here since I took it on.",
      next: 'crystal2',
    },
    crystal2: {
      id: 'crystal2',
      speaker: 'Rosie',
      line: "Paid me Friday, every Friday. She'd sorted herself out. You could see it on her.",
      next: 'more',
    },

    who: {
      id: 'who',
      speaker: 'Rosie',
      line: "Nine rooms let, six of them in. I don't sit at that desk all night, Detective.",
      next: 'who2',
    },
    who2: {
      id: 'who2',
      speaker: 'Rosie',
      line: "Anyone could come up the side stairs and I'd not know a thing about it.",
      next: 'more',
    },

    more: {
      id: 'more',
      speaker: 'Rosie',
      line: 'Anything else?',
      choices: ASK,
    },

    leave: {
      id: 'leave',
      speaker: 'Rosie',
      line: "I'll be here. Go and do your job.",
    },
  },
}
