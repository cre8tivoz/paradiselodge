import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
const scene = root.listScenes()[0];
function walk(n, d, M) {
  const t = n.getTranslation(); const m = n.getMesh();
  let bb='';
  if (m) { let mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9]; for (const p of m.listPrimitives()) { const a=p.getAttribute('POSITION'); const mi=a.getMin([]), ma=a.getMax([]); for(let i=0;i<3;i++){mn[i]=Math.min(mn[i],mi[i]);mx[i]=Math.max(mx[i],ma[i]);} } bb=` bb[${mn.map(v=>v.toFixed(2))}]-[${mx.map(v=>v.toFixed(2))}] mats=${m.listPrimitives().map(p=>p.getMaterial()?.getName()).join('|')}`; }
  if (d <= +process.argv[3]) console.log('  '.repeat(d) + n.getName() + ` t=[${t.map(v=>v.toFixed(2))}] s=[${n.getScale().map(v=>v.toFixed(2))}]` + bb + (n.listChildren().length? ` (${n.listChildren().length} ch)`:''));
  for (const c of n.listChildren()) walk(c, d+1);
}
for (const n of scene.listChildren()) walk(n, 0);
console.log('materials', root.listMaterials().map(m=>m.getName()).join(', '));
