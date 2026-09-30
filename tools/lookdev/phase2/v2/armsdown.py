# In-scene variant only (the Mixamo file stays A-pose): swing the A-pose arms ~22 deg down about the shoulders
# with a soft falloff near the armpit, so she can stand behind the desk. Props in the hand follow.
import numpy as np, trimesh
sc = trimesh.load('rosie3d-v2.glb'); ANG = np.radians(22)
def smooth(e0, e1, x): t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
for name, g in sc.geometry.items():
    if name in ('glasses', 'hair_cards', 'face'): continue
    v = g.vertices.copy()
    for sgn in (-1, 1):
        px, py = sgn * 0.19, 1.33
        w = smooth(0.18, 0.27, sgn * v[:, 0]) * smooth(0.6, 0.8, v[:, 1]) * (v[:, 1] < 1.42)
        th = -sgn * ANG * w
        dx, dy = v[:, 0] - px, v[:, 1] - py
        c, s = np.cos(th), np.sin(th)
        nx, ny = px + dx * c - dy * s, py + dx * s + dy * c
        k = w > 0; v[k, 0], v[k, 1] = nx[k], ny[k]
    g.vertices = v
sc.export('rosie3d-v2-armsdown.glb'); print('ok')
