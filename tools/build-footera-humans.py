#!/usr/bin/env python3
"""Build assets/footera/models/footera-humans.glb from MakeHuman 1.x system
assets (CC0 1.0, https://www.makehumancommunity.org/content/license.html).

Source: npm package `makehuman-data` 0.0.2 (MakeHuman system assets converted to
three.js JSON). Download and unpack it, then run:

  python3 tools/build-footera-humans.py <makehuman-data/package> [out.glb]

The GLB holds one athletic male body with a 20-bone Unreal-style rig (bone
names match Footera's Quaternius players, so the existing retarget and foot
IK drive it unchanged), several CC0 haircuts, beards, eyebrows and eyes. Face
and ethnicity variety are glTF morph targets shared by the body and every
fitted proxy, so hair and clothes always follow the face. The runtime picks
hair, skin texture and morph weights per player name.
"""
import io, os, sys, json
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from mh_common import load_json, parse_faces, Targets
from glb_writer import GLB, FLOAT, USHORT, UBYTE

SRC = sys.argv[1] if len(sys.argv) > 1 else 'makehuman-data/package'
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'assets/footera/models/footera-humans.glb')
DATA = os.path.join(SRC, 'public/data')
UNIT = .1  # MakeHuman decimetres to metres

base = load_json(os.path.join(DATA, 'models/human_full_size.json'))
V0 = np.array(base['vertices'], np.float32).reshape(-1, 3)
NV = len(V0)
TRIS, TUV, TMAT = parse_faces(base)
UVS = np.array(base['uvs'][0], np.float32).reshape(-1, 2)
MATS = [m['DbgName'] for m in base['materials']]
T = Targets(SRC, NV)

# ---------------------------------------------------------------- body shape
RACES = ('african', 'asian', 'caucasian')


def levels(x):
    lo, hi = max(0., 1 - 2 * x), max(0., 2 * x - 1)
    return {'min': lo, 'average': 1 - lo - hi, 'max': hi}


def macro(race=(1 / 3, 1 / 3, 1 / 3), muscle=.5, weight=.5, height=.5, proportions=.5):
    d = np.zeros_like(V0)
    for r, w in zip(RACES, race):
        d += w * T.delta(f'macrodetails/{r}-male-young')
    h = {'min': max(0., 1 - 2 * height), 'max': max(0., 2 * height - 1)}
    for mk, mv in levels(muscle).items():
        for wk, wv in levels(weight).items():
            if mv * wv == 0:
                continue
            d += mv * wv * T.delta(f'macrodetails/universal-male-young-{mk}muscle-{wk}weight')
            for hk, hv in h.items():
                if hv:
                    d += mv * wv * hv * T.delta(f'macrodetails/height/male-young-{mk}muscle-{wk}weight-{hk}height')
            name = f'macrodetails/proportions/male-young-{mk}muscle-{wk}weight-idealproportions'
            if name in T.index:
                d += mv * wv * proportions * T.delta(name)
    return d


# A lean, athletic young footballer; ethnicity is a morph on top of the mix.
V = V0 + macro(muscle=.86, weight=.45, height=.55, proportions=.9)


def pair(more, less):
    more = more if isinstance(more, list) else [more]
    less = less if isinstance(less, list) else [less]
    return sum(T.delta(n) for n in more) - sum(T.delta(n) for n in less)


def lr(name):
    return [name.replace('{s}', 'l'), name.replace('{s}', 'r')]


race_mean = sum(T.delta(f'macrodetails/{r}-male-young') for r in RACES) / 3
MORPHS = [(f'race_{r}', T.delta(f'macrodetails/{r}-male-young') - race_mean) for r in RACES]
MORPHS += [
    ('head_square', pair('head/head-square', 'head/head-oval')),
    ('jaw_width', pair('chin/chin-width-max', 'chin/chin-width-min')),
    ('chin_prominent', pair('chin/chin-prominent-more', 'chin/chin-prominent-less')),
    ('nose_width', pair('nose/nose-scale-horiz-incr', 'nose/nose-scale-horiz-decr')),
    ('nose_length', pair('nose/nose-scale-vert-incr', 'nose/nose-scale-vert-decr')),
    ('nose_hump', pair('nose/nose-hump-morehump', 'nose/nose-hump-lesshump')),
    ('lips_volume', pair('mouth/mouth-lowerlip-volume-inflate', 'mouth/mouth-lowerlip-volume-deflate')),
    ('mouth_width', pair('mouth/mouth-scale-horiz-incr', 'mouth/mouth-scale-horiz-decr')),
    ('cheekbones', pair(lr('cheek/{s}-cheek-bones-out'), lr('cheek/{s}-cheek-bones-in'))),
    ('eyes_size', pair(lr('eyes/{s}-eye-size-big'), lr('eyes/{s}-eye-size-small'))),
    ('brow_ridge', pair('forehead/forehead-nubian-more', 'forehead/forehead-nubian-less')),
    ('face_age', pair('head/head-age-more', 'head/head-age-less')),
]

# ---------------------------------------------------------------- skeleton
mat_index = {n: i for i, n in enumerate(MATS)}


def joint(name):
    tri = TRIS[TMAT == mat_index['joint-' + name]]
    return V[np.unique(tri)].mean(0)


FINGERS = ('thumb', 'index', 'middle', 'ring', 'pinky')  # MakeHuman finger1..5
BONES = [  # name, parent, MakeHuman joint helper
    ('pelvis', None, 'pelvis'), ('spine_01', 'pelvis', 'spine-3'), ('spine_02', 'spine_01', 'spine-2'),
    ('spine_03', 'spine_02', 'spine-1'), ('neck_01', 'spine_03', 'neck'), ('Head', 'neck_01', 'head'),
]
for s, S in (('l', 'L'), ('r', 'R')):
    BONES += [(f'clavicle_{s}', 'spine_03', f'{s}-clavicle'), (f'upperarm_{s}', f'clavicle_{s}', f'{s}-shoulder'),
              (f'lowerarm_{s}', f'upperarm_{s}', f'{s}-elbow'), (f'hand_{s}', f'lowerarm_{s}', f'{s}-hand'),
              (f'thigh_{s}', 'pelvis', f'{s}-upper-leg'), (f'calf_{s}', f'thigh_{s}', f'{s}-knee'),
              (f'foot_{s}', f'calf_{s}', f'{s}-ankle'), (f'ball_{s}', f'foot_{s}', f'{s}-foot-2')]
    for n, finger in enumerate(FINGERS, 1):
        BONES += [(f'{finger}_0{k}_{s}', f'{finger}_0{k - 1}_{s}' if k > 1 else f'hand_{s}', f'{s}-finger-{n}-{k}')
                  for k in (1, 2, 3)]
BONE_INDEX = {b[0]: i for i, b in enumerate(BONES)}
JOINTS = np.array([joint(b[2]) for b in BONES], np.float32)


def aim_point(name):
    """Where a bone points (MakeHuman joint, in source units); None for tips."""
    side = name[-1]
    if name.startswith(FINGERS):
        n, k = FINGERS.index(name.split('_')[0]) + 1, int(name[-3])
        return joint(f'{side}-finger-{n}-{k + 1}')
    if name.startswith('hand'):
        return JOINTS[BONE_INDEX['middle_01_' + side]]
    kids = [b[0] for b in BONES if b[1] == name and not b[0].startswith(('thigh', 'clavicle'))]
    return JOINTS[BONE_INDEX[kids[0]]] if kids else None


# Bone frames copy Footera's Quaternius CC0 rig (assets/footera/models/
# footballer-prototype.glb), each turned onto this body's own limb direction.
# The Quaternius mocap layers store absolute local rotations; with matching
# frames they pose this body the same way.
def quaternius_frames(path):
    import struct
    b = open(path, 'rb').read(); n = struct.unpack('<I', b[12:16])[0]
    nodes = json.loads(b[20:20 + n])['nodes']
    def mat(node):
        x, y, z, w = node.get('rotation', [0, 0, 0, 1])
        r = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                      [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                      [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
        m = np.eye(4); m[:3, :3] = r * np.array(node.get('scale', [1, 1, 1])); m[:3, 3] = node.get('translation', [0, 0, 0])
        return m
    parent = {c: i for i, nd in enumerate(nodes) for c in nd.get('children', [])}
    def world(i):
        m = mat(nodes[i])
        while i in parent:
            i = parent[i]; m = mat(nodes[i]) @ m
        return m
    out = {}
    for i, nd in enumerate(nodes):
        m = world(i); r = m[:3, :3] / np.linalg.norm(m[:3, :3], axis=0)
        out[nd.get('name')] = (m[:3, 3], r)
    return out


def turn(a, b):
    a = a / np.linalg.norm(a); b = b / np.linalg.norm(b)
    v = np.cross(a, b); c = float(a @ b)
    if c < -.9999:
        return -np.eye(3)
    k = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + k + k @ k / (1 + c)


Q = quaternius_frames(os.path.join(os.path.dirname(__file__), '..', 'assets/footera/models/footballer-prototype.glb'))
Q_AIM = {'pelvis': 'spine_01', 'spine_01': 'spine_02', 'spine_02': 'spine_03', 'spine_03': 'neck_01', 'neck_01': 'Head',
         'hand_l': 'middle_01_l', 'hand_r': 'middle_01_r', 'foot_l': 'ball_l', 'foot_r': 'ball_r',
         'ball_l': 'ball_leaf_l', 'ball_r': 'ball_leaf_r'}
ROT = np.zeros((len(BONES), 3, 3))
for i, (name, parent, _) in enumerate(BONES):
    q_pos, q_rot = Q[name]
    if name.startswith(FINGERS):
        k = int(name[-3]); q_kid = name[:-3] + (f'{k + 1}_' if k < 3 else '4_leaf_') + name[-1]
    else:
        q_kid = Q_AIM.get(name) or {'clavicle': 'upperarm', 'upperarm': 'lowerarm', 'lowerarm': 'hand',
                                    'thigh': 'calf', 'calf': 'foot'}.get(name[:-2], '') + name[-2:]
    aim = aim_point(name)
    if name == 'Head' or aim is None or q_kid not in Q:
        ROT[i] = ROT[BONE_INDEX[parent]] @ Q[parent][1].T @ q_rot if parent else q_rot
    else:
        ROT[i] = turn(Q[q_kid][0] - q_pos, aim - JOINTS[i]) @ q_rot


def game_bone(mh):
    side = '_l' if mh.endswith('.L') else '_r' if mh.endswith('.R') else ''
    b = mh.split('.')[0]
    if b in ('root', 'spine05') or b.startswith('pelvis'): return 'pelvis'
    if b == 'spine04': return 'spine_01'
    if b == 'spine03': return 'spine_02'
    if b in ('spine02', 'spine01') or b.startswith('breast'): return 'spine_03'
    if b.startswith('neck'): return 'neck_01'
    if b in ('clavicle', 'shoulder01'): return 'clavicle' + side
    if b.startswith('upperarm'): return 'upperarm' + side
    if b.startswith('lowerarm'): return 'lowerarm' + side
    if b.startswith('finger'):
        n, k = b[6:].split('-')
        return f'{FINGERS[int(n) - 1]}_0{k}{side}'
    if b in ('wrist',) or b.startswith('metacarpal'): return 'hand' + side
    if b.startswith('upperleg'): return 'thigh' + side
    if b.startswith('lowerleg'): return 'calf' + side
    if b == 'foot': return 'foot' + side
    if b.startswith('toe'): return 'ball' + side
    return 'Head'  # jaw, eyes, tongue and facial muscles


MH_NAMES = [b['name'] for b in base['bones']]
# Skin weights point at the '<bone>____head' entries of the three.js export.
MH_TO_GAME = np.array([BONE_INDEX[game_bone(n.split('____')[0])] for n in MH_NAMES])
si = np.array(base['skinIndices'], np.int64).reshape(-1, 4)
sw = np.array(base['skinWeights'], np.float32).reshape(-1, 4)
W = np.zeros((NV, len(BONES)), np.float32)  # dense per-vertex game-bone weights
for k in range(4):
    np.add.at(W, (np.arange(NV), MH_TO_GAME[si[:, k]]), sw[:, k])
W /= np.maximum(W.sum(1, keepdims=True), 1e-8)

# Ethnicity changes only the face and skull: the body (and so every kit
# proxy) keeps one shape, so shirts fit every player.
HEAD_MASK = np.clip(W[:, BONE_INDEX['Head']] + .5 * W[:, BONE_INDEX['neck_01']], 0, 1)[:, None]
MORPHS = [(n, d * HEAD_MASK if n.startswith('race_') else d) for n, d in MORPHS]


def top4(w):
    idx = np.argsort(-w, axis=1)[:, :4]
    val = np.take_along_axis(w, idx, 1)
    val /= np.maximum(val.sum(1, keepdims=True), 1e-8)
    q = np.round(val * 255).astype(np.int32)
    q[:, 0] += 255 - q.sum(1)  # exact 255 sum for normalized UNSIGNED_BYTE
    return idx.astype(np.uint8), q.astype(np.uint8)  # 52 bones fit in one byte


# ---------------------------------------------------------------- geometry
OFFSET = np.array([0, -V[np.unique(TRIS[TMAT == mat_index['body']])][:, 1].min(), 0], np.float32)


def to_metres(p):
    return (p + OFFSET) * UNIT


def smooth_normals(pos, tris):
    n = np.zeros_like(pos)
    f = np.cross(pos[tris[:, 1]] - pos[tris[:, 0]], pos[tris[:, 2]] - pos[tris[:, 0]])
    for k in range(3):
        np.add.at(n, tris[:, k], f)
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)


def build_mesh(src_pos, src_tris, src_tuv, src_uvs, weights, deltas, kit_uv=None):
    """Split (vertex, uv) pairs into glTF vertices. weights: dense per source
    vertex. kit_uv (N,3,2), optional: Footera kit-canvas UV per triangle
    corner, stored as TEXCOORD_0 with the original UV moved to TEXCOORD_1."""
    normals = smooth_normals(src_pos, src_tris)
    keys = src_tris.astype(np.int64) * (len(src_uvs) + 1) + src_tuv
    if kit_uv is not None:
        q = np.round(kit_uv * 4096).astype(np.int64)
        keys = (keys * 4097 + q[..., 0]) * 4097 + q[..., 1]
    uniq, first, inverse = np.unique(keys.ravel(), return_index=True, return_inverse=True)
    corner_v = src_tris.ravel()[first]; corner_t = src_tuv.ravel()[first]
    uv = src_uvs[corner_t].copy(); uv[:, 1] = 1 - uv[:, 1]
    j, w = top4(weights[corner_v])
    m = {'pos': to_metres(src_pos[corner_v]).astype(np.float32), 'nrm': normals[corner_v].astype(np.float32),
         'uv': uv.astype(np.float32), 'joints': j, 'weights': w,
         'idx': inverse.reshape(-1, 3).astype(np.uint32),
         'morphs': [(d[corner_v] * UNIT).astype(np.float32) for d in deltas], 'src': corner_v}
    if kit_uv is not None:
        m['uv2'] = m['uv']; m['uv'] = kit_uv.reshape(-1, 2)[first].astype(np.float32)
    return m


def proxy_raw(path, lift=0.):
    """Fit a MakeHuman proxy (hair, eyes, eyebrows, clothes) to the body.
    lift pushes a surface proxy (eyebrows) off the skin, in decimetres, so it
    does not z-fight with the face it lies on."""
    p = load_json(path)
    ref = np.array(p['ref_vIdxs'], np.int64); wt = np.array(p['weights'], np.float32)
    off = np.array(p['offsets'], np.float32)
    pos = (V[ref] * wt[..., None]).sum(1) + off
    tris, tuv, _ = parse_faces(p)
    if lift:
        pos = pos + smooth_normals(pos, tris) * lift
    return {'pos': pos, 'tris': tris, 'tuv': tuv, 'uvs': np.array(p['uvs'][0], np.float32).reshape(-1, 2),
            'w': (W[ref] * wt[..., None]).sum(1), 'deltas': [(d[ref] * wt[..., None]).sum(1) for _, d in MORPHS],
            'material': p['materials'][0], 'dir': os.path.dirname(path),
            'delete': np.array(p['metadata'].get('deleteVerts') or [False] * NV, bool), 'ref': ref}


def proxy(path, lift=0.):
    r = proxy_raw(path, lift)
    m = build_mesh(r['pos'], r['tris'], r['tuv'], r['uvs'], r['w'], r['deltas'])
    m.update(material=r['material'], dir=r['dir'], delete=r['delete'])
    return m


def png(path, size=None, fmt='PNG', quality=88, mode=None):
    """Encode a source texture. mode 'tint' stores a grey + alpha map whose
    colour the runtime sets (hair colour, boot colour); 'flat' also evens out
    printed detail such as the source shoe's stripes."""
    im = Image.open(path)
    if size and im.size[0] > size:
        im = im.resize((size, size), Image.LANCZOS)
    if mode:
        a = np.asarray(im.convert('RGBA')).astype(np.float32)
        lum = a[..., :3] @ np.array([.299, .587, .114])
        seen = a[..., 3] > 128
        lum = lum / max(1., np.percentile(lum[seen] if seen.any() else lum, 90))
        if mode == 'flat':
            lum = .78 + .35 * (lum - lum[seen].mean()) if seen.any() else lum
        g = np.clip(lum * 255, 0, 255).astype(np.uint8)
        im = Image.fromarray(np.dstack([g, a[..., 3].astype(np.uint8)]), 'LA') if fmt == 'PNG' else Image.fromarray(g, 'L')
    if fmt == 'JPEG':
        im = im.convert('L' if mode else 'RGB')
    b = io.BytesIO(); im.save(b, fmt, quality=quality, optimize=True)
    return b.getvalue(), 'image/png' if fmt == 'PNG' else 'image/jpeg'


# ---------------------------------------------------------------- football kit
# Every garment samples one per-player kit canvas painted at runtime (club
# pattern, crest, name and the squad number chosen in the game). Kit UV
# bands, top to bottom: shirt 0-.62 (front half | back half), shorts .64-.86,
# socks .88-1. The garment's own MakeHuman UV stays in TEXCOORD_1 for its
# fold normal and occlusion maps.
SHIRT_V, SHORTS_V, SOCKS_V = (0., .62), (.64, .86), (.88, 1.)
Y_KNEE = JOINTS[BONE_INDEX['calf_l'], 1]; Y_HIP = JOINTS[BONE_INDEX['thigh_l'], 1]
Y_HEM = Y_KNEE + .42 * (Y_HIP - Y_KNEE)  # shorts end above the knee
Y_ANKLE = JOINTS[BONE_INDEX['foot_l'], 1]


def band(v, lo_hi):
    return lo_hi[0] + np.clip(v, 0, 1) * (lo_hi[1] - lo_hi[0])


def front_back_uv(p, tris, across, top, bottom, rows, centre_z=0.):
    """Per-corner UV: triangles facing forward map to the left half, the rest
    to the right half mirrored, so back prints read correctly from behind."""
    cz = p[tris][:, :, 2].mean(1)
    front = (cz >= centre_z)[:, None]
    x = p[tris][:, :, 0]; y = p[tris][:, :, 1]
    a = np.clip(x / across * .5 + .5, 0, 1)
    u = np.where(front, .5 * a, .5 + .5 * (1 - a))
    v = band((top - y) / (top - bottom), rows)
    return np.stack([u, v], -1).astype(np.float32)


def concat(a, b):
    out = {k: np.concatenate([a[k], b[k]]) for k in a if k not in ('idx', 'morphs')}
    out['idx'] = np.concatenate([a['idx'], b['idx'] + len(a['pos'])])
    out['morphs'] = [np.concatenate([x, y]) for x, y in zip(a['morphs'], b['morphs'])]
    return out


def connected(tris, n):
    parent = np.arange(n)
    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]; a = parent[a]
        return a
    for t in tris:
        a, b, c = find(t[0]), find(t[1]), find(t[2])
        parent[b] = a; parent[find(c)] = a
    return np.array([find(i) for i in range(n)])


suit = proxy_raw(os.path.join(DATA, 'proxies/clothes/male_casualsuit04/male_casualsuit04.json'))
comp = connected(suit['tris'], len(suit['pos']))
centre = {c: suit['pos'][comp == c][:, 1].mean() for c in np.unique(comp)}
tri_comp = comp[suit['tris'][:, 0]]
shirt_t = np.array([centre[c] * UNIT + OFFSET[1] * UNIT > Y_HIP * UNIT + OFFSET[1] * UNIT for c in tri_comp])
pm = to_metres(suit['pos'])
# Shorts: the trousers cut above the knee and loosened around each thigh.
low = pm[:, 1] < (Y_HIP + OFFSET[1]) * UNIT - .06
for side in ('l', 'r'):
    hip = to_metres(JOINTS[BONE_INDEX['thigh_' + side]]); knee = to_metres(JOINTS[BONE_INDEX['calf_' + side]])
    mine = low & (np.sign(pm[:, 0]) == np.sign(hip[0]))
    axis = (knee - hip) / np.linalg.norm(knee - hip)
    rel = pm[mine] - hip; along = rel @ axis
    radial = rel - along[:, None] * axis
    pm[mine] = hip + along[:, None] * axis + radial * 1.14
hem = (Y_HEM + OFFSET[1]) * UNIT
shorts_t = ~shirt_t & (pm[suit['tris']][:, :, 1].max(1) > hem)
# A straight hem: corners below the cut line are lifted onto it.
below = np.zeros(len(pm), bool); below[suit['tris'][shorts_t].ravel()] = True
below &= pm[:, 1] < hem
pm[below, 1] = hem
suit['pos'] = pm / UNIT - OFFSET

def garment(mask, across, top, bottom, rows):
    tris = suit['tris'][mask]
    kit = front_back_uv(pm, tris, across, top, bottom, rows)
    return build_mesh(suit['pos'], tris, suit['tuv'][mask], suit['uvs'], suit['w'], suit['deltas'], kit_uv=kit)

shirt = garment(shirt_t, .62, 1.60, .86, SHIRT_V)
shorts = garment(shorts_t, .32, (Y_HIP + OFFSET[1]) * UNIT + .07, hem, SHORTS_V)
shoes = proxy_raw(os.path.join(DATA, 'proxies/clothes/shoes05/shoes05.json'))
# The shoe proxy has its own grey sock tube above the collar; the kit socks
# take over there.
shoe_pm = to_metres(shoes['pos'])
tube = shoe_pm[shoes['tris']][:, :, 1].min(1) > .07
shoes['tris'], shoes['tuv'] = shoes['tris'][~tube], shoes['tuv'][~tube]

# Skin hidden under the kit is removed so it cannot poke through in motion.
bt = TRIS[TMAT == mat_index['body']]; btuv = TUV[TMAT == mat_index['body']]
by = to_metres(V)[:, 1]
SOCK_TOP, SOCK_LOW = (Y_KNEE + OFFSET[1]) * UNIT - .03, .06
covered = (suit['delete'] & (by > hem + .03)) | (shoes['delete'] & (by < SOCK_LOW))
keep = ~covered[bt].all(1)
bt, btuv = bt[keep], btuv[keep]
ty = by[bt]
# Socks are a shell 2 mm off the shin with a straight top edge; skin stays
# only under the straddling top row.
sock_t = (ty.min(1) < SOCK_TOP) & (ty.max(1) > SOCK_LOW)
inside = sock_t & (ty.max(1) <= SOCK_TOP)
VS = to_metres(V) + smooth_normals(V, bt) * .002
used = np.zeros(NV, bool); used[bt[sock_t].ravel()] = True
VS[used, 1] = np.minimum(VS[used, 1], SOCK_TOP)
sock_kit = front_back_uv(VS, bt[sock_t], .3, SOCK_TOP, SOCK_LOW + .02, SOCKS_V)
socks = build_mesh(VS / UNIT - OFFSET, bt[sock_t], btuv[sock_t], UVS, W, [d for _, d in MORPHS], kit_uv=sock_kit)
bt, btuv = bt[~inside], btuv[~inside]

# ---------------------------------------------------------------- assemble
g = GLB()
morph_names = [n for n, _ in MORPHS]
body = build_mesh(V, bt, btuv, UVS, W, [d for _, d in MORPHS])

def quat(r):
    """Rotation matrix to glTF quaternion (x, y, z, w), Shepperd's method."""
    t = np.trace(r)
    if t > 0:
        k = np.sqrt(t + 1) * 2; q = [(r[2, 1] - r[1, 2]) / k, (r[0, 2] - r[2, 0]) / k, (r[1, 0] - r[0, 1]) / k, k / 4]
    else:
        i = int(np.argmax(np.diag(r))); j, l = (i + 1) % 3, (i + 2) % 3
        k = np.sqrt(1 + r[i, i] - r[j, j] - r[l, l]) * 2
        q = [0, 0, 0, (r[l, j] - r[j, l]) / k]; q[i] = k / 4; q[j] = (r[j, i] + r[i, j]) / k; q[l] = (r[l, i] + r[i, l]) / k
    q = np.array(q); return (q / np.linalg.norm(q)).tolist()


joint_nodes = []
for i, (name, parent, _) in enumerate(BONES):
    pw = ROT[BONE_INDEX[parent]] if parent else np.eye(3)
    local = JOINTS[i] - (JOINTS[BONE_INDEX[parent]] if parent else -OFFSET)
    joint_nodes.append(g.node(name=name, translation=(pw.T @ (local * UNIT)).tolist(), rotation=quat(pw.T @ ROT[i])))
for i, (name, parent, _) in enumerate(BONES):
    if parent:
        g.j['nodes'][joint_nodes[BONE_INDEX[parent]]].setdefault('children', []).append(joint_nodes[i])
ibm = np.zeros((len(BONES), 16), np.float32)
for i in range(len(BONES)):
    m = np.eye(4); m[:3, :3] = ROT[i]; m[:3, 3] = to_metres(JOINTS[i])
    ibm[i] = np.linalg.inv(m).T.ravel()  # column-major
g.j['skins'] = [{'joints': joint_nodes, 'skeleton': joint_nodes[0], 'inverseBindMatrices': g.accessor(ibm)}]
root = g.node(name='FooteraHumans', children=[joint_nodes[0]])
g.j['scenes'][0]['nodes'].append(root)


def add(name, m, material, morph=True):
    attrs = {'POSITION': g.accessor(m['pos'], 34962, minmax=True), 'NORMAL': g.accessor(m['nrm'], 34962),
             'TEXCOORD_0': g.accessor(m['uv'], 34962), 'JOINTS_0': g.accessor(m['joints'], 34962),
             'WEIGHTS_0': g.accessor(m['weights'], 34962, normalized=True)}
    if 'uv2' in m:
        attrs['TEXCOORD_1'] = g.accessor(m['uv2'], 34962)
    prim = {'attributes': attrs, 'indices': g.accessor(m['idx'].ravel(), 34963), 'material': material}
    if morph:
        prim['targets'] = [{'POSITION': g.sparse_accessor(d, len(m['pos']))} for d in m['morphs']]
    mesh = g.mesh(name, prim, morph_names if morph else None)
    n = g.node(name=name, mesh=mesh, skin=0)
    g.j['nodes'][root]['children'].append(n)
    return n


skins, skin_mean = {}, {}
for tone, rel in (('light', 'skins/young_caucasian_male/textures/young_lightskinned_male_diffuse.png'),
                  ('dark', 'skins/young_african_male/textures/young_darkskinned_male_diffuse.png')):
    path = os.path.join(DATA, rel)
    if not os.path.exists(path):
        path = next(os.path.join(os.path.dirname(path), f) for f in os.listdir(os.path.dirname(path)))
    skins[tone] = g.image(*png(path, 1024, fmt='JPEG', quality=84))
    pix = np.asarray(Image.open(path).convert('RGB').resize((64, 64))).reshape(-1, 3).astype(np.float32)
    skin_mean[tone] = (np.median(pix[pix.sum(1) > 60], 0) / 255).round(3).tolist()
skin_mat = g.material(name='FooteraSkin', pbrMetallicRoughness={
    'baseColorTexture': {'index': skins['light']}, 'metallicFactor': 0, 'roughnessFactor': .62})
add('FooteraBody', body, skin_mat)

suit_tex = os.path.join(suit['dir'], 'textures')
kit_mat = g.material(name='FooteraKit', doubleSided=True, pbrMetallicRoughness={'metallicFactor': 0, 'roughnessFactor': .82},
                     normalTexture={'index': g.image(*png(os.path.join(suit_tex, 'male_casualsuit04_normal.png'), 512)), 'texCoord': 1},
                     occlusionTexture={'index': g.image(*png(os.path.join(suit_tex, 'male_casualsuit04_ao.png'), 512, 'JPEG')), 'texCoord': 1})
add('FooteraShirt', shirt, kit_mat)
add('FooteraShorts', shorts, kit_mat)
sock_mat = g.material(name='FooteraSocks', pbrMetallicRoughness={'metallicFactor': 0, 'roughnessFactor': .9})
add('FooteraSocks', socks, sock_mat)
shoe_mesh = build_mesh(shoes['pos'], shoes['tris'], shoes['tuv'], shoes['uvs'], shoes['w'], shoes['deltas'])
shoe_mat = g.material(name='FooteraBoots', pbrMetallicRoughness={
    'baseColorTexture': {'index': g.image(*png(os.path.join(shoes['dir'], shoes['material']['mapDiffuse']), 512, 'JPEG', mode='flat'))},
    'metallicFactor': 0, 'roughnessFactor': .45})
add('FooteraBoots', shoe_mesh, shoe_mat, morph=False)

HAIR = ['short02', 'short04', 'short01', 'afro01', 'ponytail01']  # short03 (side fringe) and the long styles read wrong on footballers
FACIAL = ['Full_beard', 'Moustache']
BROWS = ['eyebrow001', 'eyebrow002', 'eyebrow004']
parts = {'hair': [], 'facial': [], 'brows': []}
for kind, names, folder in (('hair', HAIR, 'hair'), ('facial', FACIAL, 'hair'), ('brows', BROWS, 'eyebrows')):
    for n in names:
        m = proxy(os.path.join(DATA, 'proxies', folder, n, n + '.json'), lift=.012 if kind == 'brows' else 0)
        tex = os.path.join(m['dir'], m['material']['mapDiffuse'])
        mat = g.material(name='Footera-' + n, alphaMode='MASK', alphaCutoff=.18 if kind == 'brows' else .35, doubleSided=True,
                         pbrMetallicRoughness={'baseColorTexture': {'index': g.image(*png(tex, 512 if kind == 'hair' else 256, mode='tint'))},
                                               'metallicFactor': 0, 'roughnessFactor': .78})
        add(f'Footera{kind.capitalize()}-{n}', m, mat)
        parts[kind].append(n)
eyes = proxy(os.path.join(DATA, 'proxies/eyes/Low-Poly/Low-Poly.json'))
eye_tex = next(f for f in os.listdir(os.path.join(eyes['dir'], 'textures')) if 'brown' in f.lower()) \
    if any('brown' in f.lower() for f in os.listdir(os.path.join(eyes['dir'], 'textures'))) else eyes['material']['mapDiffuse'].split('/')[-1]
eye_mat = g.material(name='FooteraEyes', pbrMetallicRoughness={
    'baseColorTexture': {'index': g.image(*png(os.path.join(eyes['dir'], 'textures', eye_tex), 256, 'JPEG'))},
    'metallicFactor': 0, 'roughnessFactor': .25})
add('FooteraEyes', eyes, eye_mat)

size = g.save(OUT, extras={'footera': {
    'source': 'MakeHuman 1.x system assets, CC0 1.0 (npm makehuman-data 0.0.2)',
    'morphs': morph_names, 'hair': parts['hair'], 'facial': parts['facial'], 'brows': parts['brows'],
    'skins': {k: v for k, v in skins.items()}, 'skinMean': skin_mean, 'bones': [b[0] for b in BONES],
    'kitBands': {'shirt': SHIRT_V, 'shorts': SHORTS_V, 'socks': SOCKS_V},
    # Metres covered by each band: half-width across, then top and bottom height.
    'kitMetres': {'shirt': [.62, 1.60, .86], 'shorts': [.32, round(float((Y_HIP + OFFSET[1]) * UNIT + .07), 3), round(float(hem), 3)]}}})
print(f'wrote {OUT}: {size / 1e6:.2f} MB, body {len(body["pos"])} verts, {len(body["idx"])} tris')
