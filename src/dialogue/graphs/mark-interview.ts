import type { DialogueChoice, DialogueGraph } from '../graph.ts'

/**
 * Mark's interview statement in Room 2 (Scene 2).
 *
 * Mark is the man in the photo from 1A and the 'M' in the diary.
 * He is not a suspect; his role is to establish Crystal was inside Mahoney's Bar
 * talking to Sterling on Tuesday evening, and to provide the emotional weight.
 */

const TOPICS: readonly DialogueChoice[] = [
  { id: 'tuesday', label: 'The diary says you met her Tuesday at Mahoney\'s.', next: 'tuesday' },
  { id: 'money', label: 'Who knew she had money saved for a ticket?', next: 'money' },
  { id: 'alibi', label: 'Where were you between midnight and 3am?', next: 'alibi' },
  { id: 'done', label: "That's enough for now, Mark. Constable will take your formal statement.", next: 'done' },
]

export const MARK_INTERVIEW: DialogueGraph = {
  id: 'mark.interview',
  start: 'intro',
  nodes: {
    intro: {
      id: 'intro',
      speaker: 'Mark',
      line: "Detective. Your constable said it was Crystal. Tell me she's not...",
      next: 'confirm',
    },
    confirm: {
      id: 'confirm',
      speaker: 'Miller',
      line: "Room 1A. We found her this afternoon.",
      next: 'grief',
    },
    grief: {
      id: 'grief',
      speaker: 'Mark',
      line: "Jesus. She worked two years at the commercial laundry in Richmond. Hands blistered every night just to buy that ticket to Perth.",
      next: 'hub',
    },
    hub: {
      id: 'hub',
      speaker: 'Mark',
      line: "Ask me whatever you need.",
      choices: TOPICS,
    },

    tuesday: {
      id: 'tuesday',
      speaker: 'Mark',
      line: "Lunch at three. Chicken parmas, couple of beers. But she didn't leave when I did.",
      next: 'tuesday2',
    },
    tuesday2: {
      id: 'tuesday2',
      speaker: 'Mark',
      line: "I had to prep for the night shift at seven. When I walked out, Sterling had sat down in her booth with a fresh schooner.",
      next: 'tuesday3',
    },
    tuesday3: {
      id: 'tuesday3',
      speaker: 'Miller',
      line: "Sterling. The publican.",
      next: 'tuesday4',
    },
    tuesday4: {
      id: 'tuesday4',
      speaker: 'Mark',
      line: "He's dirty, Miller. Everyone on the strip knows he sells speed out the cool room. I told her not to talk to him.",
      next: 'hub',
    },

    money: {
      id: 'money',
      speaker: 'Mark',
      line: "Nobody besides me. And Rosie when she paid the rent. But Sterling sees everything that goes over his counter.",
      next: 'money2',
    },
    money2: {
      id: 'money2',
      speaker: 'Mark',
      line: "She had an envelope in her handbag with eight hundred cash for the flight. If Sterling saw that, he'd send someone.",
      next: 'hub',
    },

    alibi: {
      id: 'alibi',
      speaker: 'Mark',
      line: "I was on the door at the Prince of Wales from eight till five in the morning. Ask Gary or Dave. I never left the footpath.",
      next: 'alibi2',
    },
    alibi2: {
      id: 'alibi2',
      speaker: 'Miller',
      line: "We'll check the roster. It'll hold up.",
      next: 'hub',
    },

    done: {
      id: 'done',
      speaker: 'Mark',
      line: "Find whoever did this, Detective. Please.",
      next: 'mark.end',
    },
    'mark.end': {
      id: 'mark.end',
      speaker: 'Miller',
      line: "We're on them now.",
    },
  },
}
