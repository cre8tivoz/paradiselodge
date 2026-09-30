# Clean + texture a Hunyuan3D shape on the box (no GPU):
# normalise to 1.65 m, feet at y=0, facing +Z; quadric-decimate; xatlas UVs; bake colour by projecting the
# character-sheet cutouts (front for front-facing, profile for sides, synthesised back from the profile's rear strip).
import sys, numpy as np, trimesh, xatlas, fast_simplification
from PIL import Image
from scipy import ndimage
src, dst, target = sys.argv[1], sys.argv[2], int(sys.argv[3]); TS = int(sys.argv[4]) if len(sys.argv) > 4 else 2048
m = trimesh.load(src, force='mesh'); print('in', len(m.faces))
m = trimesh.Trimesh(m.vertices, m.faces, process=True)
# keep the largest connected component (drops floaters)
cc = m.split(only_watertight=False); m = max(cc, key=lambda c: len(c.faces)); print('components', len(cc))
v = m.vertices.copy(); lo, hi = v.min(0), v.max(0)
s = 1.65 / (hi[1] - lo[1]); v = (v - [(lo[0]+hi[0])/2, lo[1], (lo[2]+hi[2])/2]) * s
vd, fd = fast_simplification.simplify(v.astype(np.float32), m.faces.astype(np.int32), target_reduction=1 - target / len(m.faces))
m = trimesh.Trimesh(vd, fd, process=True); print('decimated', len(m.faces))
trimesh.smoothing.filter_taubin(m, iterations=4)
vmap, idx, uv = xatlas.parametrize(m.vertices, m.faces)
V = m.vertices[vmap]; N = m.vertex_normals[vmap]; F = idx
print('uv verts', len(V))

def load(p):
    im = np.asarray(Image.open(p).convert('RGBA')).astype(np.float32) / 255
    a = im[..., 3] > 0.5; ys, xs = np.nonzero(a)
    return im, (xs.min(), xs.max(), ys.min(), ys.max())
front, fb = load('../assets/rosie-front.png'); prof, pb = load('../assets/rosie-profile.png')
xmin, xmax = V[:, 0].min(), V[:, 0].max(); zmin, zmax = V[:, 2].min(), V[:, 2].max(); H = 1.65

def sample(im, u, vv):  # bilinear, u,v in pixels
    h, w = im.shape[:2]; u = np.clip(u, 0, w - 1.001); vv = np.clip(vv, 0, h - 1.001)
    x0 = u.astype(int); y0 = vv.astype(int); fx = (u - x0)[:, None]; fy = (vv - y0)[:, None]
    c = im[y0, x0] * (1-fx)*(1-fy) + im[y0, x0+1]*fx*(1-fy) + im[y0+1, x0]*(1-fx)*fy + im[y0+1, x0+1]*fx*fy
    return c
def fill_alpha(im):  # push colour outward past the silhouette so edge texels never pick up transparent black
    a = im[..., 3] > 0.5; _, (iy, ix) = ndimage.distance_transform_edt(~a, return_indices=True)
    out = im[iy, ix].copy(); out[..., 3] = a; return out
frontF, profF = fill_alpha(front), fill_alpha(prof)

# per-height registration: each mesh height slice's x (front) / z (side) extent maps onto that image row's silhouette extent
NB = 330
def mesh_ext(axis):
    b = np.clip((V[:, 1] / H * (NB - 1)).astype(int), 0, NB - 1)
    lo = np.full(NB, np.nan); hi = np.full(NB, np.nan)
    for i in range(NB):
        k = b == i
        if k.any(): lo[i], hi[i] = V[k, axis].min(), V[k, axis].max()
    ok = ~np.isnan(lo); xs = np.arange(NB)
    lo = np.interp(xs, xs[ok], lo[ok]); hi = np.interp(xs, xs[ok], hi[ok])
    return ndimage.uniform_filter1d(lo, 5), ndimage.uniform_filter1d(hi, 5)
def img_ext(im, bb):
    a = im[..., 3] > 0.5; f = np.argmax(a, 1).astype(float); l = (im.shape[1] - 1 - np.argmax(a[:, ::-1], 1)).astype(float)
    rows = (bb[3] - (np.arange(NB) / (NB - 1)) * (bb[3] - bb[2])).astype(int)
    return ndimage.uniform_filter1d(f[rows], 5), ndimage.uniform_filter1d(l[rows], 5)
MXlo, MXhi = mesh_ext(0); MZlo, MZhi = mesh_ext(2); FXlo, FXhi = img_ext(front, fb); PZlo, PZhi = img_ext(prof, pb)
def colour(P, Nn):
    y = P[:, 1]; vy_f = fb[3] - (y / H) * (fb[3] - fb[2]); vy_p = pb[3] - (y / H) * (pb[3] - pb[2])
    b = np.clip((y / H * (NB - 1)).astype(int), 0, NB - 1)
    uf = FXlo[b] + (P[:, 0] - MXlo[b]) / np.maximum(MXhi[b] - MXlo[b], 1e-4) * (FXhi[b] - FXlo[b])
    cf = sample(frontF, uf, vy_f)[:, :3]
    up = PZlo[b] + (P[:, 2] - MZlo[b]) / np.maximum(MZhi[b] - MZlo[b], 1e-4) * (PZhi[b] - PZlo[b])
    cs = sample(profF, up, vy_p)[:, :3]
    # back: per row, the profile's rear-most 30% of the silhouette, swept across x for knit variation
    rows = np.clip(vy_p.astype(int), 0, prof.shape[0] - 1)
    a = prof[..., 3] > 0.5
    first = np.argmax(a, axis=1); last = prof.shape[1] - 1 - np.argmax(a[:, ::-1], axis=1)
    rf, rl = first[rows].astype(np.float32), last[rows].astype(np.float32)
    width = np.maximum(rl - rf, 1)
    tx = (P[:, 0] - xmin) / (xmax - xmin)
    ub = rf + width * (0.05 + 0.32 * tx)
    cb = sample(profF, ub, vy_p)[:, :3]
    wf = np.clip(Nn[:, 2], 0, 1) ** 2; ws = Nn[:, 0] ** 2 * 1.2; wb = np.clip(-Nn[:, 2], 0, 1) ** 2
    w = wf + ws + wb + 1e-5
    return (cf * wf[:, None] + cs * ws[:, None] + cb * wb[:, None]) / w[:, None]

# rasterise the UV atlas: for each texel inside a triangle, barycentric position + normal
tex = np.zeros((TS, TS, 3), np.float32); mask = np.zeros((TS, TS), bool)
UV = uv * (TS - 1)
Ps, Ns, Ix = [], [], []
for t in range(len(F)):
    a, b, c = F[t]; A, B, C = UV[a], UV[b], UV[c]
    x0, x1 = int(np.floor(min(A[0], B[0], C[0]))), int(np.ceil(max(A[0], B[0], C[0])))
    y0, y1 = int(np.floor(min(A[1], B[1], C[1]))), int(np.ceil(max(A[1], B[1], C[1])))
    gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1)); gx = gx.ravel(); gy = gy.ravel()
    d = (B[1]-C[1])*(A[0]-C[0]) + (C[0]-B[0])*(A[1]-C[1])
    if abs(d) < 1e-12: continue
    l1 = ((B[1]-C[1])*(gx+0.0-C[0]) + (C[0]-B[0])*(gy-C[1])) / d
    l2 = ((C[1]-A[1])*(gx-C[0]) + (A[0]-C[0])*(gy-C[1])) / d; l3 = 1 - l1 - l2
    k = (l1 >= -0.02) & (l2 >= -0.02) & (l3 >= -0.02)
    if not k.any(): continue
    l = np.stack([l1[k], l2[k], l3[k]], 1)
    Ps.append(l @ V[[a, b, c]]); Ns.append(l @ N[[a, b, c]]); Ix.append(np.stack([gy[k], gx[k]], 1))
P = np.concatenate(Ps); Nn = np.concatenate(Ns); Nn /= np.linalg.norm(Nn, axis=1, keepdims=True) + 1e-9; I = np.concatenate(Ix)
I = np.clip(I, 0, TS - 1)
col = colour(P, Nn); tex[I[:, 0], I[:, 1]] = col; mask[I[:, 0], I[:, 1]] = True
_, (iy, ix) = ndimage.distance_transform_edt(~mask, return_indices=True); tex = tex[iy, ix]   # gutter dilation
img = Image.fromarray((np.clip(tex, 0, 1) * 255).astype(np.uint8)).transpose(Image.FLIP_TOP_BOTTOM)
img.save(dst.replace('.glb', '-albedo.png'))
mat = trimesh.visual.material.PBRMaterial(baseColorTexture=img, metallicFactor=0.0, roughnessFactor=0.88, name='rosie3d')
out = trimesh.Trimesh(V, F, vertex_normals=N, visual=trimesh.visual.TextureVisuals(uv=uv, material=mat), process=False)
out.export(dst); print('wrote', dst, len(out.faces), 'faces', len(out.vertices), 'verts', 'bounds', out.bounds.round(3).tolist())
