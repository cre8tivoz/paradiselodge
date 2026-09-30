# Cut Rosie's three views out of rosie-sheet.png with clean alpha + inflate normal map.
import numpy as np, sys
from pathlib import Path
from PIL import Image
from scipy import ndimage as ndi
from rembg import remove, new_session
src = Image.open(Path(__file__).resolve().parents[2] / 'images/characters/rosie-sheet.png').convert('RGB')
sess = new_session(sys.argv[1] if len(sys.argv)>1 else 'isnet-general-use')
cut = remove(src, session=sess, post_process_mask=True)
a = np.asarray(cut)[..., 3].astype(np.float32)/255
rgb = np.asarray(src).astype(np.float32)/255
W = rgb.shape[1]
cols = [(0, 540), (540, 1060), (1060, W)]
names = ['front', 'threequarter', 'profile']
for (x0, x1), n in zip(cols, names):
    al = a[:, x0:x1].copy()
    # keep only the largest connected component (plus cigarettes touching it)
    lab, k = ndi.label(al > 0.5)
    if k > 1:
        sizes = ndi.sum(np.ones_like(al), lab, range(1, k+1))
        keep = np.argmax(sizes)+1
        mask = ndi.binary_dilation(lab == keep, iterations=3)
        al *= mask
    al[al < 0.06] = 0
    # erode edge slightly to lose grey fringe, then soften 1px
    hard = al > 0.5
    core = ndi.binary_erosion(hard, iterations=1)
    al = np.clip(np.minimum(al, ndi.gaussian_filter(core.astype(np.float32), 0.8)*1.2), 0, 1)
    c = rgb[:, x0:x1].copy()
    # decontaminate: push edge colours toward interior colours (remove grey spill)
    inner = ndi.binary_erosion(hard, iterations=4)
    idx = ndi.distance_transform_edt(~inner, return_distances=False, return_indices=True)
    fill = c[idx[0], idx[1]]
    edge = (al > 0) & ~inner
    w = np.clip(1 - al, 0, 1)[..., None]*0.0 + 0.6
    c[edge] = c[edge]*(1-w[edge]) + fill[edge]*w[edge]
    c[al == 0] = fill[al == 0]
    ys, xs = np.where(al > 0.02)
    y0, y1, xa, xb = ys.min(), ys.max()+1, xs.min(), xs.max()+1
    pad = 6
    y0, xa = max(0, y0-pad), max(0, xa-pad); y1, xb = min(al.shape[0], y1+pad), min(al.shape[1], xb+pad)
    al, c = al[y0:y1, xa:xb], c[y0:y1, xa:xb]
    # inflate normal map from distance transform
    d = ndi.distance_transform_edt(al > 0.5)
    h = np.sqrt(np.clip(d, 0, 60)/60.0)
    h = ndi.gaussian_filter(h, 6)
    gy, gx = np.gradient(h)
    s = 30.0
    nx, ny, nz = -gx*s, gy*s, np.ones_like(h)
    L = np.sqrt(nx*nx+ny*ny+nz*nz); nx, ny, nz = nx/L, ny/L, nz/L
    nrm = np.stack([nx*0.5+0.5, ny*0.5+0.5, nz*0.5+0.5], -1)
    out = np.dstack([c, al])
    Image.fromarray((out*255+0.5).astype(np.uint8), 'RGBA').save(f'assets/rosie-{n}.png')
    Image.fromarray((nrm*255+0.5).astype(np.uint8), 'RGB').save(f'assets/rosie-{n}-normal.png')
    # feet position (lowest alpha row) for anchoring
    print(n, out.shape[1], out.shape[0], 'feet_row', np.where(al.max(1) > 0.5)[0].max())
