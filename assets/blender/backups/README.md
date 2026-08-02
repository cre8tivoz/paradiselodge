# Sourced Rosie proof backup

This folder preserves the rejected sourced-character proof so the modelling,
rigging and material work is not lost. It is deliberately separate from
`public/models/rosie.glb`; the currently shipped game still uses the previous
Rosie asset.

## Files

- `rosie-sourced-proof.blend` — packed Blender source. The active
  `RosieProofFresh` scene contains the rigged source model, adapted skirt,
  shoes, glasses, cigarette, tinted textures and relaxed pose. It also retains
  the original cardigan mesh as `rosie_cardigan_source_mesh_backup`.
- `rosie-sourced-proof.glb` — inspection export of the final proof state. It is
  a backup, not an accepted runtime replacement.
- `rosie-sourced-proof-preview.png` — closest fully dressed in-game iteration;
  it records the remaining shoulder deformation that caused rejection.

To restore the source cardigan in Blender, set the `rosie_cardigan` object's
mesh data to `rosie_cardigan_source_mesh_backup`. Do not overwrite the shipped
Rosie without another conversation-distance game capture.

## Source and licence

- Model: [A plump, middle-aged woman](https://sketchfab.com/models/cfbcce16c2e04095b8bbebf64020947e)
- Author: droidspb
- Sketchfab uid: `cfbcce16c2e04095b8bbebf64020947e`
- Licence: CC Attribution

