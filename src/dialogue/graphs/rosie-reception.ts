import type { DialogueGraph } from '../graph.ts'

/**
 * Rosie at reception. BRIEF.md cold-open beat, used here to prove the runner
 * until she exists as a rooted NPC (step 9). Wired to the hall door stub in 1A.
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
