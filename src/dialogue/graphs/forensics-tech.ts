import type { DialogueGraph } from '../graph.ts'

/**
 * Forensics intake hatch dialog.
 *
 * Miller hands in the bagged hammer from 1A. Tech tells him to grab a coffee
 * while the state system runs the latents.
 */

export const FORENSICS_INTAKE: DialogueGraph = {
  id: 'forensics.intake',
  start: 'drop',
  nodes: {
    drop: {
      id: 'drop',
      speaker: 'Forensics Tech',
      line: "Intake hatch. What have you brought us from Fitzroy Street, Miller?",
      choices: [
        { id: 'hammer', label: 'Bloodied claw hammer from the yard. Need the handle done first.', next: 'take' },
        { id: 'rush', label: 'Rush job. Cause of death was blunt trauma to the temple.', next: 'take' },
      ],
    },
    take: {
      id: 'take',
      speaker: 'Forensics Tech',
      line: "Righto. I'll dust the timber and run whatever ridges we pull against the central latent file.",
      next: 'wait',
    },
    wait: {
      id: 'wait',
      speaker: 'Forensics Tech',
      line: "Go put the kettle on. I'll drop the folder on your desk when the comparisons finish.",
    },
  },
}

export const FORENSICS_DONE: DialogueGraph = {
  id: 'forensics.done',
  start: 'ready',
  nodes: {
    ready: {
      id: 'ready',
      speaker: 'Forensics Tech',
      line: "Folder is sitting on your blotter, Miller. Four clear points on the handle. You'll like the name.",
    },
  },
}
