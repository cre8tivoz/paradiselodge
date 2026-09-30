# Synthesised back view (the sheet has no back): mirrored A-pose silhouette; hair from the rear of the profile's head;
# cardigan back from the profile's knit (the real pattern, re-mapped); sleeves/hands/skirt/legs/shoes mirrored from the front.
import numpy as np, cv2
from PIL import Image
fr = np.array(Image.open('apose-front.png').convert('RGBA')); bm = np.array(Image.open('apose-bodymask.png')) > 0
pr = np.array(Image.open('../../assets/rosie-profile.png').convert('RGBA'))
fr = fr[:, ::-1].copy(); bm = bm[:, ::-1].copy()
H, W = fr.shape[:2]; out = fr.copy()
pa = pr[..., 3] > 128
_, (iy, ix) = __import__('scipy.ndimage', fromlist=['x']).distance_transform_edt(~pa, return_indices=True)
prf = pr[iy, ix].copy()   # colour pushed past the silhouette so every lookup is opaque
pf = np.argmax(pa, 1); pl = pr.shape[1] - 1 - np.argmax(pa[:, ::-1], 1)
a = fr[..., 3] > 128
NECK, HEM = 172, 592
def samp(img, u, v):
    return cv2.remap(img, u.astype(np.float32), v.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
# hair: rows 0..NECK+14 of the head silhouette -> profile head rows 6..178, columns across the rear half of the head (x 38..128)
rows = np.arange(0, NECK + 14)
for r in rows:
    xs = np.nonzero(a[r])[0]
    if len(xs) == 0: continue
    if r > NECK - 6: xs = xs[np.abs(xs - W / 2) < 80]   # only hair width at the shoulders
    if len(xs) == 0: continue
    x0, x1 = xs.min(), xs.max(); t = (xs - x0) / max(x1 - x0, 1)
    vr = int(6 + r / (NECK + 14) * 172.0); v = np.full(len(xs), float(vr))
    u = pf[vr] + 2 + t * max(0.40 * (pl[vr] - pf[vr]), 10)
    # a little centre parting darkening + sine sweep so it doesn't look like a straight stretch
    u = u + 6 * np.sin(t * 9.0 + r * 0.05)
    c = samp(prf, u[None, :], v[None, :])[0]
    out[r, xs, :3] = c[:, :3]; out[r, xs, 3] = 255
# cardigan back over the torso body mask between NECK and HEM
for r in range(NECK, HEM):
    xs = np.nonzero(bm[r])[0]
    if len(xs) == 0: continue
    x0, x1 = xs.min(), xs.max(); t = (xs - x0) / max(x1 - x0, 1)
    v = np.full(len(xs), 185 + (r - NECK) / (HEM - NECK) * (590 - 185), np.float32)
    u = 30 + t * 100
    c = samp(prf, u[None, :], v[None, :])[0]
    out[r, xs, :3] = c[:, :3]
# soften the seams: hair bottom edge over cardigan
Image.fromarray(out).save('apose-back.png'); print('back', out.shape)
