/**
 * Evidence definitions. Knowledge that lands in the case file, not objects
 * Miller pockets. IDs and copy come from BRIEF.md. Look is tier one. Examine
 * is tier two. Only examine files.
 *
 * Writing rules apply: Australian English, contractions, no em dashes, no
 * editorialising.
 */

export interface EvidenceDef {
  readonly id: string
  /** Short label in the notebook list. Plain. Not a hint. */
  readonly label: string
  readonly look: string
  readonly examine: string
  /** Later scenes this clue feeds. Recorded now, used when those scenes land. */
  readonly landsIn: readonly string[]
  /**
   * A shipped texture, for the clues that are documents.
   *
   * The photograph, the diary page and the note are the three things in scene 1
   * Miller actually reads, and a case file that holds knowledge is exactly where
   * a print of one belongs. It is also the only place the photo can be seen:
   * ASSETS.md has him set the frame back down face down, exactly as found, so
   * the print is never face up in the room.
   *
   * Period rule from ASSETS.md, and it is load-bearing: photographs are prints.
   * That is why the frame can lie face down and leave a dust ring at all.
   */
  readonly image?: 'photo-in-frame' | 'diary-page' | 'note'
}

/**
 * Scene 1 evidence, in the order BRIEF.md lists them. The catalogue is the
 * whole set; the case file only shows what has been filed.
 */
export const SCENE1_EVIDENCE: readonly EvidenceDef[] = [
  {
    id: 'needle',
    label: 'Syringe',
    look: 'Syringe in the crook of her arm.',
    examine: 'One puncture. Nothing under it. No history.',
    landsIn: ['S4'],
  },
  {
    id: 'temple',
    label: 'Left temple',
    look: 'Her head, turned toward the window.',
    examine: 'Blunt trauma, left temple, under the hair.',
    landsIn: ['S2', 'S4'],
  },
  {
    id: 'sling',
    label: 'Rubber tie',
    look: 'Rubber tie around her upper arm.',
    examine:
      "The tie's neat. Even tension, tucked under itself. Nobody does that one-handed with their teeth, and nobody leaves it tight after they've found the vein.",
    landsIn: ['S4'],
  },
  {
    id: 'frame',
    label: 'Photo frame',
    look: 'Photo frame angled at the bed.',
    examine:
      'Crystal and a man, black shirt, ponytail. Dust ring shows it lay face down for weeks.',
    landsIn: ['S2', 'S4'],
    image: 'photo-in-frame',
  },
  {
    id: 'sill',
    label: 'Windowsill',
    look: "Sash window, open a hand's width.",
    examine: 'Faint partial, toe pointing out.',
    landsIn: ['S4'],
  },
  {
    id: 'lighter',
    label: 'Cigarette lighter',
    look: 'Cigarette lighter, crystals in the case.',
    examine: "Mahoney's Bar on the base.",
    landsIn: ['S2'],
  },
  {
    id: 'diary',
    label: 'Notebook',
    look: 'Notebook on the parlour table.',
    examine: 'meeting M for lunch - mahoneys 3pm Tuesday',
    landsIn: ['S2'],
    image: 'diary-page',
  },
  {
    id: 'hammer',
    label: 'Hammer',
    look: 'Hammer leaning by the shed.',
    examine: 'Blood on the handle. More on the head.',
    landsIn: ['S2'],
  },
]

export const SCENE2_EVIDENCE: readonly EvidenceDef[] = [
  {
    id: 'hammer_report',
    label: 'Forensics report: hammer',
    look: 'Manila folder from Forensics. Wet ink on the cover.',
    examine:
      'Latent prints on the handle match Victor Rakov. Priors: assault, armed robbery. Associated with the King Street Crew.',
    landsIn: ['S3', 'S4'],
  },
  {
    id: 'rakov_profile',
    label: 'LEAP: Victor Rakov',
    look: 'CRT screen glowing green phosphor. Offender summary: RAKOV, Victor.',
    examine:
      'Victor Rakov, b. 1968. Known to carry a bricklayer hammer. Last recorded address: 14 Regent Street, Prahran.',
    landsIn: ['S3', 'S4'],
  },
  {
    id: 'mark_statement',
    label: "Mark's statement",
    look: 'Mark sitting in the interview cubicle, head down.',
    examine:
      "Met Crystal for lunch at Mahoney's Tuesday 3pm. Left her at the bar around seven. Worked the door at the Prince all night; door roster and bouncers confirm it.",
    landsIn: ['S4', 'S5'],
  },
  {
    id: 'mahoneys_lead',
    label: "Mahoney's Bar lead",
    look: "The link between the lighter, the diary note, and Mark's testimony.",
    examine:
      'Crystal stayed at Mahoney\'s past 7pm Tuesday talking to Sterling in the back booth. Publican is Sterling. Known associate of King St Crew.',
    landsIn: ['S4', 'S5'],
  },
]

export const SCENE3_EVIDENCE: readonly EvidenceDef[] = [
  {
    id: 'victor_bootprint',
    label: 'Laneway bootprint',
    look: 'Mud under the corrugated fence at the alley end.',
    examine:
      'Deep impression of a size 10 workboot in the clay. Heavy lug pattern matches the partial on the 1A windowsill.',
    landsIn: ['S4'],
  },
  {
    id: 'cottage_slip',
    label: 'Handwritten slip',
    look: 'Scrap of receipt paper on the cottage kitchen bench.',
    examine:
      'Pencil scribble: "Fitzroy St - grab the book. S." Sterling sent him for the diary.',
    landsIn: ['S4', 'S5'],
  },
  {
    id: 'radio_arrest',
    label: 'Radio arrest report',
    look: 'Shoulder radio crackling on Victoria Police VHF band.',
    examine:
      'Moretti: Victor Rakov apprehended on Commercial Road after climbing the back fence. Transported to station interview room.',
    landsIn: ['S4'],
  },
]

export const ALL_EVIDENCE: readonly EvidenceDef[] = [
  ...SCENE1_EVIDENCE,
  ...SCENE2_EVIDENCE,
  ...SCENE3_EVIDENCE,
]

const byId = new Map(ALL_EVIDENCE.map((entry) => [entry.id, entry]))

export function getEvidence(id: string): EvidenceDef | undefined {
  return byId.get(id)
}
