import type { DialogueGraph } from '../graph.ts'

/**
 * Scene 5 — Mahoney's Bar & St Kilda Watchhouse Ending.
 *
 * 1. Confrontation at the public bar with publican Kenneth Sterling.
 * 2. Bar brawl breakout and Moretti's crowd control intervention.
 * 3. Collar grab behind the bar to extract the cellar key.
 * 4. Cellar safe penetration and recovery of the extortion ledger.
 * 5. Final arrest, watchhouse booking, and cell door slam ending.
 */

export const SCENE5_STERLING_CONFRONTATION: DialogueGraph = {
  id: 'scene5.sterling.confrontation',
  start: 'sterling_intro',
  nodes: {
    sterling_intro: {
      id: 'sterling_intro',
      speaker: 'Kenneth Sterling',
      line: "Miller. You're out of your division. St Kilda uniform is one thing, but CID sniffing around my taps on a Friday night is bad for business.",
      choices: [
        {
          id: 'victor_leverage',
          label: "We've got Victor Rakov in the box at Grey Street, Kenneth.",
          next: 'victor_response',
        },
        {
          id: 'refuse_cellar',
          label: "Step away from the counter and show me your cellar, Sterling.",
          next: 'warrant_demand',
        },
      ],
    },
    victor_response: {
      id: 'victor_response',
      speaker: 'Kenneth Sterling',
      line: "Rakov's a twitchy turnip who couldn't lie straight in bed. Anything he muttered under your fluorescent lamps won't survive committal.",
      choices: [
        {
          id: 'slip_threat',
          label: "He gave up your handwritten slip: 'Fitzroy St - grab the book. S.'",
          next: 'dismiss_slip',
        },
        {
          id: 'hammer_threat',
          label: "The hammer has Victor's latent prints and Crystal's blood.",
          next: 'dismiss_hammer',
        },
      ],
    },
    warrant_demand: {
      id: 'warrant_demand',
      speaker: 'Kenneth Sterling',
      line: "Not without a Section 92 search warrant signed by a magistrate, Detective. And it's past eight on a Friday. Courts closed at four-thirty.",
      choices: [
        {
          id: 'push_warrant',
          label: "Exigent circumstances, Sterling. We don't need paper when evidence is being destroyed.",
          next: 'dismiss_slip',
        },
      ],
    },
    dismiss_slip: {
      id: 'dismiss_slip',
      speaker: 'Kenneth Sterling',
      line: "A pencil scribble on butcher's paper? Good luck entering that before Judge Neesham. Now drink a half-pint or take Moretti and piss off.",
      next: 'trigger_brawl_node',
    },
    dismiss_hammer: {
      id: 'dismiss_hammer',
      speaker: 'Kenneth Sterling',
      line: "Then hang Victor for it! Don't come shaking down a licensed victualler because some junkie burglar got sloppy.",
      next: 'trigger_brawl_node',
    },
    trigger_brawl_node: {
      id: 'trigger_brawl_node',
      speaker: 'Moretti',
      line: "Miller! Behind you! Watch out at the pool table!",
      choices: [
        {
          id: 'trigger_brawl',
          label: "Turn toward the disturbance.",
          next: 'brawl_erupts',
        },
      ],
    },
    brawl_erupts: {
      id: 'brawl_erupts',
      speaker: 'Punter',
      line: "You spilt my bloody pot, mate! I'll put your head through the cigarette machine!",
      next: 'moretti_covers',
    },
    moretti_covers: {
      id: 'moretti_covers',
      speaker: 'Moretti',
      line: "Police! Break it up! Back against the timber, both of you! Miller—deal with Sterling! I've got these two pinned!",
      choices: [
        {
          id: 'corner_sterling',
          label: "Corner Sterling behind the bar.",
          next: 'collar_cornered',
        },
      ],
    },
    collar_cornered: {
      id: 'collar_cornered',
      speaker: 'Detective Graham Miller',
      line: "You think this pub protects you, Kenneth? Your patrons are too busy bleeding on the carpet to care.",
      next: 'sterling_cornered',
    },
    sterling_cornered: {
      id: 'sterling_cornered',
      speaker: 'Kenneth Sterling',
      line: "Get your hands off the tweed, Miller. I've got aldermen and magistrates on speed dial. Touch me and your badge is gone by breakfast.",
      choices: [
        {
          id: 'collar_grab',
          label: "Grab Sterling firmly by the collar and slam him against the optics shelf.",
          next: 'collar_grab_result',
        },
      ],
    },
    collar_grab_result: {
      id: 'collar_grab_result',
      speaker: 'Detective Graham Miller',
      line: "I'll ruin you now or ruin you later, Sterling. Your choice. Where's the book?",
      next: 'sterling_yields',
    },
    sterling_yields: {
      id: 'sterling_yields',
      speaker: 'Kenneth Sterling',
      line: "Alright! Bloody hell, alright! Left vest pocket! The brass mortise key! Take it and choke on it!",
      choices: [
        {
          id: 'take_key',
          label: "Pry the brass cellar key from Sterling's vest.",
          next: 'key_taken',
        },
      ],
    },
    key_taken: {
      id: 'key_taken',
      speaker: 'Detective Graham Miller',
      line: "Stay right on that stool, Kenneth. Moretti has the front door covered. Try the back lane and you'll find out what bluestone feels like.",
    },
  },
}

export const SCENE5_CELLAR_SAFE: DialogueGraph = {
  id: 'scene5.cellar.safe',
  start: 'cellar_entry',
  nodes: {
    cellar_entry: {
      id: 'cellar_entry',
      speaker: 'Detective Graham Miller',
      line: "Between the Carlton Draught kegs. A Chub-pattern floor safe recessed into the wet bluestone foundation. The brass mortise key slides cleanly into the tumbler.",
      choices: [
        {
          id: 'open_safe',
          label: "Turn the key and heave the heavy steel safe door up.",
          next: 'safe_cracked',
        },
      ],
    },
    safe_cracked: {
      id: 'safe_cracked',
      speaker: 'Detective Graham Miller',
      line: "Heavy steel clanks back. Stacks of rubber-banded hundred-dollar notes, and beneath them: a black vinyl-bound ledger.",
      next: 'ledger_detail',
    },
    ledger_detail: {
      id: 'ledger_detail',
      speaker: 'Detective Graham Miller',
      line: "Crystal's name in Sterling's tight fountain-pen hand: 'Paradise Lodge Room 1A - paid in full - terminate contract'. A complete extortion paper trail.",
      choices: [
        {
          id: 'seize_ledger',
          label: "Seize the extortion ledger and head back up to the bar.",
          next: 'ledger_secured',
        },
      ],
    },
    ledger_secured: {
      id: 'ledger_secured',
      speaker: 'Detective Graham Miller',
      line: "That's Section 3 murder and extortion. No magistrate in the State of Victoria throws this out.",
    },
  },
}

export const SCENE5_FINAL_ARREST: DialogueGraph = {
  id: 'scene5.final.arrest',
  start: 'intercept_flight',
  nodes: {
    intercept_flight: {
      id: 'intercept_flight',
      speaker: 'Moretti',
      line: "Miller! Sterling tried to slip out the back alley door while you were down below! I cut him off at the bluestone!",
      choices: [
        {
          id: 'confront_flight',
          label: "Step up to Sterling and present the black ledger.",
          next: 'present_ledger',
        },
      ],
    },
    present_ledger: {
      id: 'present_ledger',
      speaker: 'Detective Graham Miller',
      line: "Recognise your own handwriting, Kenneth? Page forty-two. 'Room 1A - terminate contract'.",
      next: 'sterling_despair',
    },
    sterling_despair: {
      id: 'sterling_despair',
      speaker: 'Kenneth Sterling',
      line: "You think you've won something, Miller? You think putting me away cleans up St Kilda? You're pissing into a southerly buster.",
      choices: [
        {
          id: 'miller_verdict',
          label: "Maybe. But your room at the watchhouse has got a north-facing window.",
          next: 'formal_charge',
        },
      ],
    },
    formal_charge: {
      id: 'formal_charge',
      speaker: 'Detective Graham Miller',
      line: "Kenneth Sterling, you are under arrest for the murder of Crystal Vance, conspiracy, and extortion. Cuff him, Constable.",
      next: 'moretti_cuffs',
    },
    moretti_cuffs: {
      id: 'moretti_cuffs',
      speaker: 'Moretti',
      line: "With pleasure, Detective. Divisional van is outside. Let's take him in.",
      choices: [
        {
          id: 'cell_slam',
          label: "Escort Sterling to the St Kilda Watchhouse cell block.",
          next: 'watchhouse_ending',
        },
      ],
    },
    watchhouse_ending: {
      id: 'watchhouse_ending',
      speaker: 'St Kilda Watchhouse',
      line: "St Kilda Police Station. Cell block corridor. Heavy steel bolts slide into place.",
      choices: [
        {
          id: 'credits_roll',
          label: "Slam the cell door shut.",
          next: 'final_blackout',
        },
      ],
    },
    final_blackout: {
      id: 'final_blackout',
      speaker: 'The Paradise Lodge',
      line: "Case Closed. 27 February 1994.",
    },
  },
}
