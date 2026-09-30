# Rosie v2 rigged (Mixamo) - Phase 2
- reception-rosie-idle-720p.mp4: 7.0 s, 1280x720, 24 fps, H.264 CRF 19, 7.5 MB. Reception camera with a 0.45 m smoothstep push-in, Standing Idle (loop wrap at 6 s is seamless).
- reception-rosie-rigged.png: 1080p still with DoF.
- rosie-rigged.glb: game-ready. 1.65 m, 39,510 tris / 27k verts, one 33-bone Mixamo skeleton (`mixamorig*`), clips `idle` (6.0 s) + `walk` (1.03 s cycle, **root motion**, not in place).
  WebP textures (EXT_texture_webp, required): body 2048, face 1024, hair 512 (alpha MASK, double-sided). No Draco/meshopt, so no decoder needed. 2.65 MB. glTF validator: 0 errors.
- rosie-rig-check.jpg: skinning check sheet (idle and walk, 4 views, head close-up).
Lookdev hook: `?rosie=rigged` (src/character_rigged.js; `?rig=<fbx>` overrides the file). Camera push: `&push=<m>&pushdur=<s>`.
Fixes applied in the loader: collapsed FBXLoader's duplicate bones (Neck/Head x4 etc.); rebuilt the hair-card normals (black after the FBX round trip); added normals to the props; props keep Mixamo's skin weights (cigarette is on the RightHand/Index bones, glasses on Neck/Head).
Pipeline: FBXLoader -> GLTFExporter (headless Chrome, export_rigged.mjs) -> gltf-transform weld/resample/dedup/prune/webp -> finish_glb.mjs (clears the invalid skin.skeleton pointer).
