import type { DialogueGraph } from '../graph.ts'

/**
 * Scene 4 - St Kilda CID Interview Room 1.
 *
 * Formal interrogation of Victor Rakov conducted under Section 464A Crimes Act 1958.
 * Miller confronts Victor with the forensic evidence (hammer prints, mud bootprints,
 * and Sterling's handwritten slip), breaking Victor's denial and extracting
 * the location of Sterling's base in the cellar of Mahoney's Bar.
 */

let concludePredicate: () => boolean = () => true

export function setScene4ConcludePredicate(fn: () => boolean): void {
  concludePredicate = fn
}

export const SCENE4_TAPE_CAUTION: DialogueGraph = {
  id: 'scene4.tape.caution',
  start: 'caution',
  nodes: {
    caution: {
      id: 'caution',
      speaker: 'Miller',
      line: 'Record of interview between Detective Graham Miller and Victor Rakov at St Kilda CID, Saturday 26 February 1994, 22:50 hours. Also present, Constable Moretti. Tape number one.',
      next: 'rights',
    },
    rights: {
      id: 'rights',
      speaker: 'Miller',
      line: 'Victor, you do not have to say or do anything, but anything you do say may be given in evidence. Do you understand that?',
      choices: [
        { id: 'understand', label: 'Do you understand that caution?', next: 'confirm_caution' },
        { id: 'solicitor', label: 'Have you contacted your solicitor?', next: 'solicitor_check' },
      ],
    },
    solicitor_check: {
      id: 'solicitor_check',
      speaker: 'Victor Rakov',
      line: "Legal aid didn't answer. I know how this works, Detective. Let's get it over with.",
      next: 'confirm_caution',
    },
    confirm_caution: {
      id: 'confirm_caution',
      speaker: 'Victor Rakov',
      line: "Yeah. I understand my bloody rights. Now what am I doing here?",
      next: 'record_on',
    },
    record_on: {
      id: 'record_on',
      speaker: 'Miller',
      line: 'Let the record show the suspect acknowledged the caution. The tape is running.',
    },
  },
}

export const SCENE4_VICTOR_INTERROGATION: DialogueGraph = {
  id: 'scene4.victor.interrogation',
  start: 'hub',
  nodes: {
    hub: {
      id: 'hub',
      speaker: 'Victor Rakov',
      line: "I've got nothing to say to you, Detective. You dragged me out of my street for nothing.",
      choices: [
        { id: 'hammer', label: "Let's talk about the bricklayer's hammer from the Lodge yard.", next: 'hammer_branch' },
        { id: 'bootprint', label: 'We have your bootprints in the mud outside Room 1A.', next: 'boot_branch' },
        { id: 'slip', label: 'We found the slip on your table: "grab the book. S."', next: 'slip_branch' },
        { id: 'sterling', label: 'Where is Sterling right now?', next: 'sterling_branch' },
        {
          id: 'conclude',
          label: 'Interview concluded. Moretti, book him.',
          next: 'conclude_branch',
          when: () => concludePredicate(),
        },
      ],
    },

    // 1. Hammer Branch
    hammer_branch: {
      id: 'hammer_branch',
      speaker: 'Miller',
      line: "The bricklayer's hammer we pulled from beside the iron shed at the Paradise Lodge. Blood on the face, hair on the claw.",
      next: 'hammer_ans1',
    },
    hammer_ans1: {
      id: 'hammer_ans1',
      speaker: 'Victor Rakov',
      line: "I lost a hammer on a construction job in Richmond three weeks ago. Anyone could've nicked it out of my ute.",
      next: 'hammer_ans2',
    },
    hammer_ans2: {
      id: 'hammer_ans2',
      speaker: 'Miller',
      line: "Forensics pulled four distinct ridge points of your left palm and thumb off the rubber grip. You held that hammer tonight, Victor.",
      next: 'hammer_ans3',
    },
    hammer_ans3: {
      id: 'hammer_ans3',
      speaker: 'Victor Rakov',
      line: "I didn't hit anyone with it! I swear to God, Miller, I didn't touch her!",
      next: 'hub',
    },

    // 2. Bootprint Branch
    boot_branch: {
      id: 'boot_branch',
      speaker: 'Miller',
      line: "Size 10 lug workboots. We took plaster casts under the 1A sash window and from the clay under your back fence.",
      next: 'boot_ans1',
    },
    boot_ans1: {
      id: 'boot_ans1',
      speaker: 'Victor Rakov',
      line: "Half the tradies in Victoria wear Blundstones. That doesn't prove I was inside any room.",
      next: 'boot_ans2',
    },
    boot_ans2: {
      id: 'boot_ans2',
      speaker: 'Miller',
      line: "Worn inside heel on the left sole, angled slice through the third lug. Identical match to the smudge on the internal timber sill.",
      next: 'boot_ans3',
    },
    boot_ans3: {
      id: 'boot_ans3',
      speaker: 'Victor Rakov',
      line: "Alright, so I went to the bloody Lodge! That ain't murder, Detective.",
      next: 'hub',
    },

    // 3. Slip Branch (The Break)
    slip_branch: {
      id: 'slip_branch',
      speaker: 'Miller',
      line: '"Fitzroy St - grab the book. S." Sterling wrote that. He sent you to grab Crystal\'s ledger.',
      next: 'slip_break1',
    },
    slip_break1: {
      id: 'slip_break1',
      speaker: 'Victor Rakov',
      line: "Look... you've got this completely bloody wrong! Sterling told me she had an account book hidden in her wardrobe. Payouts, names, politicians. He told me to jemmy the window, grab the book, and walk.",
      next: 'slip_break2',
    },
    slip_break2: {
      id: 'slip_break2',
      speaker: 'Victor Rakov',
      line: "When I climbed through that sash, she was already dead on the mattress! Her skull was split open and the blood was already drying! Sterling did it before I even got there, and now the bastard's pinning it on me!",
      next: 'slip_break3',
    },
    slip_break3: {
      id: 'slip_break3',
      speaker: 'Miller',
      line: "Then why dump the hammer out by the shed?",
      next: 'slip_break4',
    },
    slip_break4: {
      id: 'slip_break4',
      speaker: 'Victor Rakov',
      line: "Because I panicked! I heard sirens down Fitzroy Street, dropped the tool by the shed, and bolted down the back verandah stairs!",
      next: 'hub',
    },

    // 4. Sterling Branch
    sterling_branch: {
      id: 'sterling_branch',
      speaker: 'Miller',
      line: "Where is Sterling right now, Victor?",
      next: 'sterling_ans1',
    },
    sterling_ans1: {
      id: 'sterling_ans1',
      speaker: 'Victor Rakov',
      line: "Mahoney's on Fitzroy Street. In the cellar behind the keg store. He keeps his safe and the syndicate books down there.",
      next: 'sterling_ans2',
    },
    sterling_ans2: {
      id: 'sterling_ans2',
      speaker: 'Victor Rakov',
      line: "He's packing up his cash tonight before the heat hits. He keeps the brass mortise key on a chain in his waist pocket. Go get him, Miller. Don't let him leave me holding his rope.",
      next: 'hub',
    },

    // 5. Conclude Branch
    conclude_branch: {
      id: 'conclude_branch',
      speaker: 'Miller',
      line: "Interview concluded at 23:14 hours. Tape recorder stopped.",
      next: 'moretti_book',
    },
    moretti_book: {
      id: 'moretti_book',
      speaker: 'Moretti',
      line: "Right with you, Detective. Div van is downstairs. I'll process the remand warrant for burglary and accessory. Where are you heading?",
      next: 'mahoneys',
    },
    mahoneys: {
      id: 'mahoneys',
      speaker: 'Miller',
      line: "Fitzroy Street. Mahoney's Bar. Time to see Sterling.",
    },
  },
}

export const SCENE4_THEORISE_LAST_NODE = 'mahoneys'
