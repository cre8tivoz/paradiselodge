// Post-process the rigged GLB: clear the invalid skin.skeleton pointer GLTFExporter writes for Mixamo rigs (optional field).
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
doc.getRoot().listSkins().forEach((s) => s.setSkeleton(null));
doc.getRoot().listScenes().forEach((s) => s.setName('Rosie'));
await io.write(process.argv[3], doc);
