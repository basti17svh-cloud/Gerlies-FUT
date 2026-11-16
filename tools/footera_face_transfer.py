"""Face variety for the realistic body (V21.433): carry the MakeHuman face
morphs, haircuts, beards and brows of footera-humans.glb onto another head.

Both bodies stand in the same A-pose with the same bones. The MakeHuman head
is fitted onto the target head in two steps: a per-axis scale and offset from
the two heads' extents, then a smooth surface field (every MakeHuman head
vertex pulled onto the nearest target head point, averaged over neighbours)
so a haircut sits on the new scalp. Morph deltas move with the fit's scale;
the whole-body part of the ethnicity morphs (MakeHuman's race targets also
change body height, so they lift the head) is removed by subtracting the mean
head offset, which leaves the face shape only.
"""
import numpy as np

FACE_MORPHS = ['race_african', 'race_asian', 'race_caucasian', 'head_square', 'jaw_width', 'chin_prominent', 'nose_width',
               'nose_length', 'nose_hump', 'lips_volume', 'mouth_width', 'cheekbones', 'eyes_size', 'brow_ridge', 'face_age']


def knn(src, pts, k, chunk=1024):
    """Indices and distances of the k nearest src points for every pt."""
    idx = np.zeros((len(pts), k), np.int64); dist = np.zeros((len(pts), k))
    s2 = (src * src).sum(1)
    for a in range(0, len(pts), chunk):
        p = pts[a:a + chunk]
        d = np.maximum(s2[None, :] - 2 * p @ src.T + (p * p).sum(1)[:, None], 0)
        i = np.argpartition(d, k - 1 if k < len(src) else len(src) - 1, axis=1)[:, :k]
        di = np.take_along_axis(d, i, 1); o = np.argsort(di, 1)
        idx[a:a + chunk] = np.take_along_axis(i, o, 1); dist[a:a + chunk] = np.sqrt(np.take_along_axis(di, o, 1))
    return idx, dist


def blend(values, idx, dist, eps=.002):
    w = 1 / (dist + eps) ** 2; w /= w.sum(1, keepdims=True)
    return np.einsum('pk,pk...->p...', w, values[idx])


def head_weight(W, head):
    return W[:, head]


class HeadFit:
    def __init__(self, mh_pos, mh_head_w, real_pos, real_head_w, neck_y_mh, neck_y_real):
        # Head region = mostly Head-weighted and above the jaw line's neck.
        a = (mh_head_w > .6) & (mh_pos[:, 1] > neck_y_mh - .03)
        b = (real_head_w > .6) & (real_pos[:, 1] > neck_y_real - .03)
        self.mh_sel = np.where(a)[0]; self.real_pts = real_pos[b]
        lo_a, hi_a = np.percentile(mh_pos[a], [1, 99], 0); lo_b, hi_b = np.percentile(real_pos[b], [1, 99], 0)
        self.scale = (hi_b - lo_b) / (hi_a - lo_a)
        self.scale[0] = self.scale[2] = (self.scale[0] + self.scale[2]) / 2  # no squashed skulls
        self.offset = (hi_b + lo_b) / 2 - (hi_a + lo_a) / 2 * self.scale
        # Surface field: affine-fitted MakeHuman head vertices -> nearest target point.
        src = self.affine(mh_pos[a])
        i, _ = knn(self.real_pts, src, 1)
        disp = self.real_pts[i[:, 0]] - src
        # Smooth over ~2 cm so the field never folds a haircut.
        j, d = knn(src, src, 24)
        w = np.exp(-(d / .012) ** 2); w /= w.sum(1, keepdims=True)
        for _ in range(2):
            disp = np.einsum('pk,pkc->pc', w, disp[j])
        self.src, self.disp = src, disp

    def affine(self, p):
        return p * self.scale + self.offset

    def apply(self, p, k=12):
        q = self.affine(p)
        i, d = knn(self.src, q, k)
        # Far from the scalp (long hair, ponytail) the field fades to the
        # nearest scalp offset instead of extrapolating.
        return q + blend(self.disp, i, d, eps=.004)

    def delta(self, d):
        return d * self.scale


def face_deltas(mh, fit, mh_head_w, names=FACE_MORPHS):
    """Per morph: delta on every MakeHuman vertex with the head lift removed."""
    head = mh_head_w > .9
    out = {}
    for n in names:
        d = mh['morphs'][mh['morph_names'].index(n)]
        out[n] = fit.delta(d - d[head].mean(0) * (mh_head_w[:, None] > .02))
    return out


def transfer_to_surface(real_pos, real_head_w, mh_pos, mh_head_w, fit, deltas, k=4):
    """Morphs for the target head's own vertices: blend of the nearest fitted
    MakeHuman vertices' deltas, faded out down the neck."""
    sel = np.where(mh_head_w > .02)[0]
    src = fit.apply(mh_pos[sel])
    i, d = knn(src, real_pos, k)
    fade = np.clip((real_head_w - .15) / .7, 0, 1)
    fade = fade * fade * (3 - 2 * fade)
    far = np.clip((d[:, 0] - .02) / .02, 0, 1)   # nothing fitted nearby: no move
    fade = fade * (1 - far)
    return {n: blend(v[sel], i, d) * fade[:, None] for n, v in deltas.items()}


def follow(points, surface_pos, surface_deltas, k=8, rigid_groups=None):
    """Morphs for loose parts (eyes, teeth, lashes, the source hair): the
    blended deltas of the nearest skin; eyeballs move as one piece."""
    i, d = knn(surface_pos, points, k)
    out = {n: blend(v, i, d) for n, v in surface_deltas.items()}
    if rigid_groups is not None:
        for g in np.unique(rigid_groups):
            m = rigid_groups == g
            for n in out:
                out[n][m] = out[n][m].mean(0)
    return out


def prune(morphs, keep=5e-4):
    """Drop targets that move nothing visible on this mesh."""
    return {n: d for n, d in morphs.items() if np.abs(d).max() > keep}
