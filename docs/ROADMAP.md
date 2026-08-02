# Paradise Lodge — Delivery Roadmap

This is the canonical project plan. Progress is reported by deliverable name,
never by an unqualified step number.

## Product constraint

This is an independent companion piece for a book release, not a commercial
game. The priority is a short, authored experience with a visual standard that
stands beside *Claude of Duty*. Do not trade that visual ambition for feature
breadth, and do not introduce commercial-game infrastructure, mechanics or
pipelines that the companion piece does not need.

## Current position

The game design covers five scenes. Only Scene 1 is currently playable.
Scene 1's gameplay and lodge interior are complete; its exterior still uses the
original placeholder art. Scenes 2–5 are designed in `BRIEF.md` but are not yet
implemented as playable scenes.

Old terminology, for reference only:

- “step 13” meant Scene 1's objective-gate gameplay milestone
- “steps 6–7” meant the final lodge-interior graphics pipeline tasks
- “Room 1A” is the upstairs bedroom, not a project phase
- “Unit A” meant the lodge interior asset package
- “Unit B” meant the lodge exterior asset package

These labels are retired from active progress reporting.

## Deliverables

| Deliverable | Status | Definition of done |
|---|---|---|
| **1. Scene 1 playable investigation** | **Done** | Cold open, movement, interactions, evidence, Rosie, Moretti, all eight objective gates, theorise ending, audio and save boundary work from start to finish |
| **2. Scene 1 lodge interior** | **Done** | Reception, parlour, staircase, upstairs hall and Room 1A are Blender-authored, furnished, baked, integrated and under the 60MB asset budget |
| **3. Scene 1 lodge exterior** | **In progress** | Authored street facade is integrated and profiled; verandah, back yard and the remaining street dressing still need their final visual pass |
| **4. Scene 1 release candidate** | **Pending** | Balance final interior/exterior lighting, run one clean start-to-finish playthrough, fix only release blockers, verify performance, push and deploy the accepted build |
| **5. Scene 2 — Police station** | **Not started** | Playable forensics handoff, coffee/wait beat, Victor record lookup and Mark statement using the existing interaction/dialogue systems |
| **6. Scene 3 — Victor chase** | **Not started** | Playable location and fixed scripted chase with the designed forced outcome; no pursuit AI or failure state |
| **7. Scene 4 — Interrogation** | **Not started** | Playable evidence-presentation interrogation with the defined Sterling reveal path |
| **8. Scene 5 — Mahoney's and ending** | **Not started** | Playable bar sequence, scripted background fight, Sterling arrest, cell-door ending and final Miller/Moretti shot |

## Scene 1 lodge exterior acceptance

The primary facade references are
`images/concept-art/01-title-card-the-paradise-lodge.png` and
`images/concept-art/02-miller-at-the-lodge-exterior.png`.

The exterior succeeds when it has:

- the strong two-storey Victorian silhouette, arched openings and full-width
  iron-lace balcony shown in the references
- distressed cream render, damp staining, exposed side brick and enough surface
  variation to hold close first-person views
- pink Paradise Lodge neon, cyan Rooms to Let neon, marble entry and
  wet-looking street reflections
- the current fixed 3pm story light; the references guide architecture,
  materials and colour contrast, not a change to dusk or rain
- one authored exterior asset integrated over the existing collision and
  gameplay route; no new mechanics, baking system or engine work

## Immediate remaining work

Only two deliverables are needed before Scene 1 can be called finished:

1. **Scene 1 lodge exterior** — street and facade, verandah, back yard.
2. **Scene 1 release candidate** — final lighting balance, complete play test,
   performance check, push and deploy.

After that, continuing into Scenes 2–5 is a separate production decision, not
an implied continuation of Scene 1 polish.

The accepted build is not yet pushed or deployed. The existing Cloudflare URL
is the release target; wiring `lodge.billyhaddad.au` remains optional and is not
part of gameplay completion.

## Reporting rule

Every work report must name the deliverable and one concrete outcome, for
example: “Scene 1 lodge exterior — facade accepted.” Do not report “step 4” or
“next phase” without the deliverable name.
