import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const names = process.argv.slice(3);
for (const n of doc.getRoot().listNodes()) if (names.some(x => n.getName() === x || (x.endsWith('*') && n.getName().startsWith(x.slice(0,-1))))) { const b = getBounds(n); console.log(n.getName(), b.min.map(v=>v.toFixed(2)).join(','), '->', b.max.map(v=>v.toFixed(2)).join(',')); }
