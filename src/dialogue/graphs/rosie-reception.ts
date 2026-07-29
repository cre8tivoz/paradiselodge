import type { DialogueGraph } from '../graph.ts'

/**
 * Rosie at reception, on the way in. BRIEF.md's cold-open beat.
 *
 * Brief and directive, and it stays that way. The cold open at step 15 plays
 * this over the walk in without the player pressing anything, so it has to work
 * as something overheard as well as something asked for. That is why the two
 * options both end in the same place and neither of them is information.
 *
 * She names the parlour here. That is the only signposting scene 1 gets, and it
 * lands before the player has any reason to want it.
 */
export const ROSIE_RECEPTION: DialogueGraph = {
  id: 'rosie.reception',
  start: 'found',
  nodes: {
    found: {
      id: 'found',
      speaker: 'Rosie',
      line: "I found her, Detective. She was one of my long termers. Come find me when you're done.",
      choices: [
        {
          id: 'what',
          label: 'What happened?',
          next: 'what',
        },
        {
          id: 'ok',
          label: "I'll come down.",
          next: 'ok',
        },
      ],
    },
    what: {
      id: 'what',
      speaker: 'Rosie',
      line: "She's upstairs. 1A. I haven't touched anything.",
      next: 'done',
    },
    ok: {
      id: 'ok',
      speaker: 'Rosie',
      line: "Parlour's on the left when you come back down. I'll be there.",
      next: 'done',
    },
    done: {
      id: 'done',
      speaker: 'Rosie',
      line: 'Go on.',
    },
  },
}
