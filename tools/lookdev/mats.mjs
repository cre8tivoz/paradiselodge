import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(process.argv[2]);
for (const n of doc.getRoot().listNodes()) if (process.argv.slice(3).includes(n.getName())) {
  const s = new Set(); const walk = (x) => { const m = x.getMesh(); if (m) m.listPrimitives().forEach((p) => s.add(p.getMaterial()?.getName() + (p.getMaterial()?.getBaseColorTexture() ? '[tex]' : ''))); x.listChildren().forEach(walk); }; walk(n);
  console.log(n.getName(), [...s].join(', '));
}
