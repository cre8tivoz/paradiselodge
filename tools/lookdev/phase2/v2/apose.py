# A-pose reference from the sheet's front cutout, done in code (no image model available for free):
# cut each sleeve+hand along a hand-placed polygon, rotate it out about the shoulder, heal the torso side
# where the arm was, and step the lower legs apart.
import numpy as np, cv2
from PIL import Image
src = np.array(Image.open('../../assets/rosie-front.png').convert('RGBA'))
H, W = src.shape[:2]; PAD = 190
canvas = np.zeros((H + 20, W + 2 * PAD, 4), np.uint8)
body = src.copy()
ARMS = {
  'L': dict(poly=[(96,172),(104,200),(102,232),(82,380),(76,478),(60,498),(58,578),(0,578),(0,380),(28,222),(40,178)], pivot=(80,210), ang=-22),
  'R': dict(poly=[(296,172),(288,200),(290,232),(316,380),(324,478),(332,498),(336,582),(392,582),(392,380),(366,222),(352,178)], pivot=(310,210), ang=+22),
}
out_layers = []
for k, a in ARMS.items():
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.array(a['poly'], np.int32)], 255)
    m = cv2.GaussianBlur(m, (5, 5), 0)
    arm = src.copy(); arm[..., 3] = (arm[..., 3].astype(np.float32) * (m / 255.0)).astype(np.uint8)
    big = np.zeros_like(canvas[:H]); big[:, PAD:PAD + W] = arm
    px, py = a['pivot'][0] + PAD, a['pivot'][1]
    R = cv2.getRotationMatrix2D((px, py), a['ang'], 1.0)
    rot = cv2.warpAffine(big, R, (big.shape[1], big.shape[0]), flags=cv2.INTER_CUBIC, borderValue=(0, 0, 0, 0))
    out_layers.append(rot)
    # remove the arm from the body layer, but keep an inner strip of the sleeve as the torso's side (her bulk is there)
    hard = np.zeros((H, W), np.uint8); cv2.fillPoly(hard, [np.array(a['poly'], np.int32)], 255)
    keep = cv2.erode(np.full((H, W), 255, np.uint8), None)  # dummy
    body[..., 3] = np.where(hard > 0, 0, body[..., 3])
# heal: torso side strip (sleeve area above the cardigan hem, within 22 px of the remaining body) filled by inpainting
alpha = body[..., 3] > 128
side = np.zeros((H, W), np.uint8)
for k, a in ARMS.items():
    hard = np.zeros((H, W), np.uint8); cv2.fillPoly(hard, [np.array(a['poly'], np.int32)], 255)
    near = cv2.dilate(alpha.astype(np.uint8) * 255, np.ones((1, 45), np.uint8))   # horizontal reach
    s = (hard > 0) & (near > 0) & (src[..., 3] > 128)
    near2 = cv2.dilate(alpha.astype(np.uint8) * 255, np.ones((1, 25), np.uint8))
    s[:200] = False; s[470:] &= (near2[470:] > 0); s[595:] = False
    side |= s.astype(np.uint8)
rgb = cv2.cvtColor(body[..., :3], cv2.COLOR_RGB2BGR)
rgb = cv2.inpaint(rgb, side * 255, 7, cv2.INPAINT_TELEA)
# re-texture the healed strip with knit noise sampled from the cardigan front panel so it is not a smear
panel = src[300:560, 80:115, :3].astype(np.float32); pm = panel.mean((0, 1))
yy, xx = np.nonzero(side)
tile = panel[(yy % panel.shape[0]), (xx % panel.shape[1])] - pm
b = cv2.cvtColor(rgb, cv2.COLOR_BGR2RGB).astype(np.float32); b[yy, xx] += tile * 0.9
body[..., :3] = np.clip(b, 0, 255).astype(np.uint8); body[..., 3] = np.where(side > 0, 255, body[..., 3])
blk = body[574:598].astype(int); lum = blk[..., :3].mean(-1)
for xs in (slice(0, 74), slice(320, 392)):
    sub = body[574:598, xs]; sub[..., 3] = np.where(lum[:, xs] > 55, 0, sub[..., 3])
# scrub leftover hand skin at the cardigan corners
f = body[..., :3].astype(int); skin = (f[..., 0] > 125) & (f[..., 0] - f[..., 2] > 35) & (f[..., 0] - f[..., 1] > 12) & (f[..., 0] - f[..., 1] < 60) & (body[..., 3] > 0)
zone = np.zeros_like(skin); zone[455:600, :110] = True; zone[455:600, 285:] = True
edge = cv2.distanceTransform((body[..., 3] > 0).astype(np.uint8), cv2.DIST_L2, 5) < 22
bad = (cv2.dilate((skin & zone & edge).astype(np.uint8), np.ones((7, 7), np.uint8)) > 0) & zone & edge & (body[..., 3] > 0)
bgr = cv2.inpaint(cv2.cvtColor(body[..., :3], cv2.COLOR_RGB2BGR), bad.astype(np.uint8) * 255, 9, cv2.INPAINT_TELEA)
body[..., :3] = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB); print('scrubbed', bad.sum())
for r in range(380, 574):
    t = min(1.0, (r - 380) / 90.0); cl = int(round(74 * t)) if r < 478 else 74; cr = int(round(392 - 72 * t)) if r < 478 else 320
    L0 = int(np.argmax(src[r, :, 3] > 128)); R0 = 391 - int(np.argmax(src[r, ::-1, 3] > 128))
    body[r, :max(cl, 0), 3] = 0; body[r, min(cr, 392):, 3] = 0   # thumb remnants outside the hard arm polygons
# legs apart below the skirt hem
LEG_Y = 770; mid = 196; SH = 13
legs = body[LEG_Y:].copy(); body[LEG_Y:] = 0
for i in range(legs.shape[0]):
    sh = int(round(SH * min(1.0, i / 55.0)))   # ramp in so the hem has no step
    row = legs[i]; y = LEG_Y + i
    body[y, :mid - sh] = row[sh:mid]; body[y, mid + sh:] = row[mid:W - sh]
    if sh == 0: body[y] = row
canvas[:H, PAD:PAD + W] = body
bodymask = np.zeros(canvas.shape[:2], np.uint8); bodymask[:H, PAD:PAD + W] = (body[..., 3] > 128) * 255
for l in out_layers:   # arms over the body
    a = l[..., 3:4].astype(np.float32) / 255
    canvas[:H, :, :3] = (l[..., :3] * a + canvas[:H, :, :3] * (1 - a)).astype(np.uint8)
    canvas[:H, :, 3] = np.maximum(canvas[:H, :, 3], l[..., 3])
ys, xs = np.nonzero(canvas[..., 3] > 20); crop = canvas[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
Image.fromarray(crop).save('apose-front.png'); Image.fromarray(bodymask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]).save('apose-bodymask.png'); print('apose', crop.shape)
