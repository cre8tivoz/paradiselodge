# Rosie v2: clean + texture + props, all on the box.
#  shape  : Hunyuan3D-2 (free Space) from the code-made A-pose front image
#  texture: front = A-pose image, back = synthesised back image, sides = sheet profile (per-height registered);
#           the face gets its own 1024 UV island/texture from a 4x Lanczos + unsharp upsample of the sheet face.
#  extras : alpha hair cards, glasses pushed up on the head, cigarette in her right hand.
import sys, numpy as np, trimesh, xatlas, fast_simplification
from PIL import Image, ImageFilter
from scipy import ndimage
SRC = sys.argv[1] if len(sys.argv) > 1 else 'hy2-apose-front.glb'
TARGET = 36000; H = 1.65; rng = np.random.default_rng(7)
m = trimesh.load(SRC, force='mesh'); m.merge_vertices()
m = max(m.split(only_watertight=False), key=lambda c: len(c.faces))
lo, hi = m.bounds; v = (m.vertices - [(lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2]) * (H / (hi[1] - lo[1]))
vd, fd = fast_simplification.simplify(v.astype(np.float32), m.faces.astype(np.int32), target_reduction=1 - TARGET / len(m.faces))
m = trimesh.Trimesh(vd, fd, process=True); trimesh.smoothing.filter_taubin(m, iterations=3)
print('body tris', len(m.faces))
X0, X1 = m.vertices[:, 0].min(), m.vertices[:, 0].max()

def rgba(p): return np.asarray(Image.open(p).convert('RGBA')).astype(np.float32) / 255
def fill(im):
    a = im[..., 3] > 0.5; _, (iy, ix) = ndimage.distance_transform_edt(~a, return_indices=True); o = im[iy, ix].copy(); o[..., 3] = a; return o
front = rgba('apose-front.png'); back = rgba('apose-back.png'); prof = rgba('../../assets/rosie-profile.png')
# 4x upsampled + sharpened front for the face island
up = Image.open('apose-front.png').convert('RGBA'); up = up.resize((up.width * 4, up.height * 4), Image.LANCZOS)
rgb = up.convert('RGB').filter(ImageFilter.UnsharpMask(radius=3, percent=90, threshold=2)); up = Image.merge('RGBA', (*rgb.split(), up.split()[3]))
front4 = np.asarray(up).astype(np.float32) / 255
frontF, backF, profF, front4F = fill(front), fill(back), fill(prof), fill(front4)
def bbox(im):
    a = im[..., 3] > 0.5; ys, xs = np.nonzero(a); return xs.min(), xs.max(), ys.min(), ys.max()
FB, BB, PB = bbox(front), bbox(back), bbox(prof)
def sample(im, u, vv):
    h, w = im.shape[:2]; u = np.clip(u, 0, w - 1.001); vv = np.clip(vv, 0, h - 1.001)
    x0 = u.astype(int); y0 = vv.astype(int); fx = (u - x0)[:, None]; fy = (vv - y0)[:, None]
    return im[y0, x0] * (1 - fx) * (1 - fy) + im[y0, x0 + 1] * fx * (1 - fy) + im[y0 + 1, x0] * (1 - fx) * fy + im[y0 + 1, x0 + 1] * fx * fy
# profile per-height z registration (as v1)
NB = 330; V0 = m.vertices
def mesh_ext(axis):
    b = np.clip((V0[:, 1] / H * (NB - 1)).astype(int), 0, NB - 1); lo_ = np.full(NB, np.nan); hi_ = np.full(NB, np.nan)
    for i in range(NB):
        k = b == i
        if k.any(): lo_[i], hi_[i] = V0[k, axis].min(), V0[k, axis].max()
    ok = ~np.isnan(lo_); xs = np.arange(NB)
    return ndimage.uniform_filter1d(np.interp(xs, xs[ok], lo_[ok]), 5), ndimage.uniform_filter1d(np.interp(xs, xs[ok], hi_[ok]), 5)
def img_ext(im, bb):
    a = im[..., 3] > 0.5; f = np.argmax(a, 1).astype(float); l = (im.shape[1] - 1 - np.argmax(a[:, ::-1], 1)).astype(float)
    rows = (bb[3] - (np.arange(NB) / (NB - 1)) * (bb[3] - bb[2])).astype(int); return ndimage.uniform_filter1d(f[rows], 5), ndimage.uniform_filter1d(l[rows], 5)
MZlo, MZhi = mesh_ext(2); PZlo, PZhi = img_ext(prof, PB)

def colour(P, N, face=False):
    y = P[:, 1]; b = np.clip((y / H * (NB - 1)).astype(int), 0, NB - 1)
    if face:
        s = 4.0; uf = (FB[0] + (P[:, 0] - X0) / (X1 - X0) * (FB[1] - FB[0])) * s; vf = (FB[3] - y / H * (FB[3] - FB[2])) * s
        return sample(front4F, uf, vf)[:, :3]
    uf = FB[0] + (P[:, 0] - X0) / (X1 - X0) * (FB[1] - FB[0]); vf = FB[3] - y / H * (FB[3] - FB[2])
    cf = sample(frontF, uf, vf)[:, :3]
    ub = BB[0] + (X1 - P[:, 0]) / (X1 - X0) * (BB[1] - BB[0]); vb = BB[3] - y / H * (BB[3] - BB[2])     # back image is mirrored
    cb = sample(backF, ub, vb)[:, :3]
    up_ = PZlo[b] + (P[:, 2] - MZlo[b]) / np.maximum(MZhi[b] - MZlo[b], 1e-4) * (PZhi[b] - PZlo[b]); vp = PB[3] - y / H * (PB[3] - PB[2])
    cs = sample(profF, up_, vp)[:, :3]
    armish = (np.abs(P[:, 0]) > 0.27) | ((np.abs(P[:, 0]) > 0.2) & (P[:, 1] > 1.12) & (P[:, 1] < 1.42))          # A-pose arms are not in the (arms-down) profile: front/back only there
    wf = np.clip(N[:, 2], 0, 1) ** 2 + 0.25 * N[:, 1] ** 2 * (P[:, 2] >= 0)
    wb = np.clip(-N[:, 2], 0, 1) ** 2 + 0.25 * N[:, 1] ** 2 * (P[:, 2] < 0)
    ws = np.where(armish, 0.0, N[:, 0] ** 2 * 1.2)
    wf = wf + np.where(armish, N[:, 0] ** 2 * 0.5, 0); wb = wb + np.where(armish, N[:, 0] ** 2 * 0.5, 0)
    w = wf + wb + ws + 1e-5
    out = (cf * wf[:, None] + cb * wb[:, None] + cs * ws[:, None]) / w[:, None]
    # arms: treat the sleeve as a cylinder. Texels turning away from the camera sample further in from the silhouette
    # edge (sleeve knit) instead of the smeared edge column; front/back chosen by which way the texel faces.
    if armish.any():
        Pa = P[armish].copy(); Na = N[armish]; sgn = np.sign(Pa[:, 0])
        Pa[:, 0] -= sgn * 0.075 * (1 - np.abs(Na[:, 2])) ** 0.8
        ua = FB[0] + (Pa[:, 0] - X0) / (X1 - X0) * (FB[1] - FB[0]); va = FB[3] - Pa[:, 1] / H * (FB[3] - FB[2])
        ub2 = BB[0] + (X1 - Pa[:, 0]) / (X1 - X0) * (BB[1] - BB[0])
        caf = sample(frontF, ua, va)[:, :3]; cab = sample(backF, ub2, va)[:, :3]
        t = np.clip((Na[:, 2] + 0.25) / 0.5, 0, 1)[:, None]
        out[armish] = caf * t + cab * (1 - t)
    return out

def bake(mesh, TS, face=False):
    vmap, idx, uv = xatlas.parametrize(mesh.vertices, mesh.faces)
    V = mesh.vertices[vmap]; N = mesh.vertex_normals[vmap]; F = idx; UV = uv * (TS - 1)
    tex = np.zeros((TS, TS, 3), np.float32); mask = np.zeros((TS, TS), bool); Ps, Ns, Ix = [], [], []
    for a, b_, c in F:
        A, B, C = UV[a], UV[b_], UV[c]
        x0, x1 = int(np.floor(min(A[0], B[0], C[0]))), int(np.ceil(max(A[0], B[0], C[0]))); y0, y1 = int(np.floor(min(A[1], B[1], C[1]))), int(np.ceil(max(A[1], B[1], C[1])))
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1)); gx = gx.ravel(); gy = gy.ravel()
        d = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1])
        if abs(d) < 1e-12: continue
        l1 = ((B[1] - C[1]) * (gx - C[0]) + (C[0] - B[0]) * (gy - C[1])) / d; l2 = ((C[1] - A[1]) * (gx - C[0]) + (A[0] - C[0]) * (gy - C[1])) / d; l3 = 1 - l1 - l2
        k = (l1 >= -0.02) & (l2 >= -0.02) & (l3 >= -0.02)
        if not k.any(): continue
        l = np.stack([l1[k], l2[k], l3[k]], 1); Ps.append(l @ V[[a, b_, c]]); Ns.append(l @ N[[a, b_, c]]); Ix.append(np.stack([gy[k], gx[k]], 1))
    P = np.concatenate(Ps); Nn = np.concatenate(Ns); Nn /= np.linalg.norm(Nn, axis=1, keepdims=True) + 1e-9; I = np.clip(np.concatenate(Ix), 0, TS - 1)
    tex[I[:, 0], I[:, 1]] = colour(P, Nn, face); mask[I[:, 0], I[:, 1]] = True
    _, (iy, ix) = ndimage.distance_transform_edt(~mask, return_indices=True); tex = tex[iy, ix]
    return V, F, N, uv, Image.fromarray((np.clip(tex, 0, 1) * 255).astype(np.uint8)).transpose(Image.FLIP_TOP_BOTTOM)

# --- split off the face island (front of head below the hairline)
cen = m.triangles_center; fn = m.face_normals
head_top = m.vertices[:, 1].max()
# face region from the image: face spans image rows ~40..165 and x 262..352 (of 605) in apose-front.png
def img2mesh_x(px): return X0 + (px - FB[0]) / (FB[1] - FB[0]) * (X1 - X0)
def img2mesh_y(py): return (FB[3] - py) / (FB[3] - FB[2]) * H
fx0, fx1 = img2mesh_x(250), img2mesh_x(362); fy0, fy1 = img2mesh_y(172), img2mesh_y(30)
isface = (cen[:, 0] > fx0) & (cen[:, 0] < fx1) & (cen[:, 1] > fy0) & (cen[:, 1] < fy1) & (fn[:, 2] > 0.15)
print('face tris', isface.sum(), 'face box x', round(fx0, 3), round(fx1, 3), 'y', round(fy0, 3), round(fy1, 3))
body = m.submesh([np.nonzero(~isface)[0]], append=True); facem = m.submesh([np.nonzero(isface)[0]], append=True)
Vb, Fb, Nb, uvb, texb = bake(body, 2048); Vf, Ff, Nf, uvf, texf = bake(facem, 1024, face=True)
texb.save('rosie-v2-body.png'); texf.save('rosie-v2-face.png')
def pbr(img, name, **kw): return trimesh.visual.material.PBRMaterial(name=name, baseColorTexture=img, metallicFactor=0.0, roughnessFactor=0.85, **kw)
parts = {
  'body': trimesh.Trimesh(Vb, Fb, vertex_normals=Nb, visual=trimesh.visual.TextureVisuals(uv=uvb, material=pbr(texb, 'rosie_body')), process=False),
  'face': trimesh.Trimesh(Vf, Ff, vertex_normals=Nf, visual=trimesh.visual.TextureVisuals(uv=uvf, material=pbr(texf, 'rosie_face')), process=False),
}

# --- hair cards: thin strand cards that hug the scalp, coloured from the sheet's own hair pixels
fa = front[..., 3] > 0.5; hr = front[20:175]; hm = fa[20:175].copy(); hm[:, 250:362] = False
hp = hr[hm][:, :3]; sat = hp.max(1) - hp.min(1)
red = hp[sat > 0.18]; grey = hp[(sat < 0.10) & (hp.mean(1) > 0.35)]
lum = red.mean(1); cols = [np.median(red[lum < np.percentile(lum, 35)], 0), np.median(red[lum > np.percentile(lum, 60)], 0),
       (np.median(red, 0) + np.median(grey, 0)) / 2, np.median(grey, 0)]
cols = [np.clip(c.mean() + (c - c.mean()) * (1.45 if k < 2 else 1.1), 0, 1) for k, c in enumerate(cols)]
print('hair palette', np.round(cols, 2).tolist())
TS = 512; hair = np.zeros((TS, TS, 4), np.float32)
for ci, col in enumerate(cols):
    x0 = ci * TS // 4
    for sidx in range(70):
        x = x0 + rng.uniform(3, TS // 4 - 3); top = rng.uniform(0, 30); bot = TS - rng.uniform(0, 160)
        ys = np.arange(int(top), int(bot)); xs = x + 2.5 * np.sin(ys / rng.uniform(50, 110) + rng.uniform(0, 6))
        shade = np.array(col) * rng.uniform(0.75, 1.15); xi = np.clip(xs.astype(int), 0, TS - 1)
        a_ = np.clip((bot - ys) / 80, 0, 1)
        hair[ys, xi, :3] = shade; hair[ys, xi, 3] = np.maximum(hair[ys, xi, 3], a_)
        xi2 = np.clip(xi + 1, 0, TS - 1); hair[ys, xi2, :3] = shade * 0.85; hair[ys, xi2, 3] = np.maximum(hair[ys, xi2, 3], a_ * 0.6)
xx = (np.arange(TS) % (TS // 4)) / (TS // 4); win = np.clip(np.minimum(xx, 1 - xx) / 0.18, 0, 1)
hair[..., 3] *= win[None, :] * 0.85 + 0.15 * (win[None, :] > 0.5)
rgbh = hair[..., :3].copy(); a3 = hair[..., 3]
_, (iy, ix) = ndimage.distance_transform_edt(a3 < 0.05, return_indices=True); rgbh = rgbh[iy, ix]
hair_img = Image.fromarray((np.clip(np.dstack([rgbh, a3]), 0, 1) * 255).astype(np.uint8), 'RGBA'); hair_img.save('rosie-v2-hair.png')
Vm, Fm = m.vertices, m.faces; cen = m.triangles_center; fn = m.face_normals
zface = Vm[(Vm[:, 1] > img2mesh_y(170)) & (np.abs(Vm[:, 0]) < 0.05)][:, 2].max()
hairline = img2mesh_y(42)
infront = (cen[:, 2] > zface - 0.05) & (np.abs(cen[:, 0]) < 0.08) & (cen[:, 1] < hairline)
lowfront = (cen[:, 1] < img2mesh_y(150)) & (cen[:, 2] > -0.01) & (np.abs(cen[:, 0]) < 0.11)
scalp = (cen[:, 1] > img2mesh_y(182)) & ~isface & ~infront & ~lowfront & (fn[:, 1] > -0.25) & (np.abs(cen[:, 0]) < 0.16)
area = m.area_faces * scalp; NC = 720; pick = rng.choice(len(Fm), size=NC, p=area / area.sum())
bary = rng.dirichlet([1, 1, 1], size=NC); seeds = np.einsum('ij,ijk->ik', bary, Vm[Fm[pick]]); sn = fn[pick]
seedcol = colour(seeds, sn)
cv, cf, cu = [], [], []
for i in range(NC):
    p, n = seeds[i], sn[i]
    if p[2] > zface - 0.06 and abs(p[0]) < 0.09: down = np.array([0, -0.35, -1.0])      # front hairline: combed back
    else: down = np.array([0, -1.0, 0])
    d = down - n * down.dot(n)
    if np.linalg.norm(d) < 0.15: d = np.array([p[0], 0, p[2] - 0.0]) + [0, -0.5, 0]
    d /= np.linalg.norm(d)
    if d[1] > -0.35: d[1] = -0.35; d /= np.linalg.norm(d)
    side = np.cross(n, d); side /= np.linalg.norm(side) + 1e-9
    L = rng.uniform(0.05, 0.11) * (1.3 if p[1] < 1.52 else 1.0); W = rng.uniform(0.012, 0.022)
    top = p + n * 0.003; mid = top + d * L * 0.5 + n * 0.004; end = top + d * L + n * 0.004
    c = seedcol[i]; col = int(np.argmin([np.sum((c - cc) ** 2) for cc in cols]))
    hg = (p[1] - img2mesh_y(182)) / (head_top - img2mesh_y(182))
    if hg < 0.72 and col >= 2: col = int(rng.integers(0, 2)) if rng.random() < 0.8 else 2   # grey stays on the crown, red lengths below
    u0, u1 = col / 4 + 0.004, (col + 1) / 4 - 0.004
    base = len(cv)
    for q, vv in ((top, 1.0), (mid, 0.55), (end, 0.0)):
        cv += [q - side * W / 2, q + side * W / 2]; cu += [[u0, vv], [u1, vv]]
    cf += [[base, base + 2, base + 1], [base + 1, base + 2, base + 3], [base + 2, base + 4, base + 3], [base + 3, base + 4, base + 5]]
cards = trimesh.Trimesh(np.array(cv), np.array(cf), process=False)
cards.visual = trimesh.visual.TextureVisuals(uv=np.array(cu), material=pbr(hair_img, 'rosie_hair', alphaMode='MASK', alphaCutoff=0.35, doubleSided=True))
parts['hair_cards'] = cards; print('hair card tris', len(cf))

# --- glasses pushed up on the head: ray-cast the scalp for the lens seats
ray = trimesh.ray.ray_triangle.RayMeshIntersector(m)
def hit(o, d):
    loc, _, _ = ray.intersects_location([o], [d]); return loc[np.argmax(loc @ -np.array(d))] if len(loc) else None
gl = []; blk = [0.08, 0.06, 0.05]
zf = m.vertices[m.vertices[:, 1] > head_top - 0.06][:, 2].max()
seats = []
for sx in (-0.032, 0.032):
    p = hit(np.array([sx, head_top + 0.3, zf - 0.035]), np.array([0, -1.0, 0])); seats.append(p)
    ring = trimesh.creation.torus(major_radius=0.021, minor_radius=0.0022, major_sections=20, minor_sections=6)
    ring.apply_transform(trimesh.transformations.rotation_matrix(np.radians(-25), [1, 0, 0]))   # lenses tipped back onto the crown
    ring.apply_translation(p + [0, 0.009, 0]); gl.append(ring)
bridge = trimesh.creation.cylinder(radius=0.0018, segment=[seats[0] + [0.02, 0.011, 0], seats[1] + [-0.02, 0.011, 0]], sections=6); gl.append(bridge)
for sgn, s in zip((-1, 1), seats):
    ep = hit(np.array([sgn * 0.3, s[1] - 0.05, s[2] - 0.07]), np.array([-sgn * 1.0, 0, 0]))
    if ep is not None: gl.append(trimesh.creation.cylinder(radius=0.0016, segment=[s + [sgn * 0.02, 0.009, 0], ep + [sgn * 0.008, 0, 0]], sections=6))
glasses = trimesh.util.concatenate(gl)
glasses.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(name='rosie_glasses', baseColorFactor=[40, 30, 26, 255], metallicFactor=0.2, roughnessFactor=0.35))
parts['glasses'] = glasses; print('glasses tris', len(glasses.faces))

# --- cigarette in her right hand (the -X hand)
hv = m.vertices[m.vertices[:, 0] < X0 + 0.06]; hc = hv.mean(0); zfwd = hv[:, 2].max()
start = np.array([hc[0] + 0.005, hc[1] - 0.005, zfwd - 0.01]); dirc = np.array([-0.35, -0.15, 0.92]); dirc /= np.linalg.norm(dirc)
paper = trimesh.creation.cylinder(radius=0.0042, segment=[start, start + dirc * 0.062], sections=10)
paper.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(name='cig_paper', baseColorFactor=[235, 230, 218, 255], roughnessFactor=0.7))
ember = trimesh.creation.cylinder(radius=0.0043, segment=[start + dirc * 0.062, start + dirc * 0.068], sections=10)
ember.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(name='cig_ember', baseColorFactor=[120, 110, 100, 255], emissiveFactor=[1.0, 0.35, 0.08], roughnessFactor=0.9))
parts['cigarette'] = paper; parts['cigarette_ember'] = ember

sc = trimesh.Scene(); [sc.add_geometry(g, node_name=k, geom_name=k) for k, g in parts.items()]
tot = sum(len(g.faces) for g in parts.values()); print('TOTAL tris', tot)
sc.export('rosie3d-v2.glb'); print('wrote rosie3d-v2.glb')
