#!/usr/bin/env python3
"""Build assets/footera/models/footera-metahuman.glb, Footera's MetaHuman
player (V21.437), from a MetaHuman Creator DCC export (Unreal Engine 5.6+:
Exportieren > DCC-Export, joints-only rig, 2K maps). Unzip the export, then:

  python3 tools/build-footera-metahuman.py <export folder> [out.glb]

The folder holds head.dna, body.dna and Maps/*.png; the DNA files are read by
tools/footera_dna.py. The output keeps the contract of footera-real.glb (see
tools/build-footera-real.py and 3d-player-human.mjs), so the game takes it as
its realistic men's body unchanged:

* the 52 Footera bone names and Quaternius-matched bone frames, so the
  Mixamo/CMU/UAL mocap layers and the foot IK drive it; MetaHuman's 342 body
  and 870 face joints fold into those bones (twist, corrective and face
  joints into their limb or the head);
* the A-pose of the MakeHuman body (arms and legs turned from MetaHuman's
  own A-pose onto the MakeHuman limb directions);
* the kit: shirt, shorts and boots of footera-real.glb carried onto this body
  bone by bone and pushed outside the skin with their own clearance; socks a
  shell grown from the shins; skin hidden under the kit removed;
* the per-player face morphs, haircuts, beards and brows of footera-humans.glb
  fitted onto the MetaHuman head (tools/footera_face_transfer.py);
* one skin atlas (head left, body right) in a light and a dark version.

The raw export is never committed.
"""
import io, os, sys, json, struct
import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(__file__))
from glb_writer import GLB
from glb_read import GLBRead
from footera_dna import DNA
import footera_face_transfer as face

SRC = sys.argv[1]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'assets/footera/models/footera-metahuman.glb')
HEAD_LOD, BODY_LOD = 1, 1          # MetaHuman LOD1: 12k head, 7.6k body vertices
MAPS = os.path.join(SRC, 'Maps')

HD = DNA(os.path.join(SRC, 'head.dna')); BD = DNA(os.path.join(SRC, 'body.dna'))


def turn(a, b):
    a = a / np.linalg.norm(a); b = b / np.linalg.norm(b)
    v = np.cross(a, b); c = float(a @ b)
    if c < -.9999:
        return -np.eye(3)
    k = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + k + k @ k / (1 + c)


def local(n):
    m = np.eye(4); x, y, z, w = n.get('rotation', [0, 0, 0, 1])
    m[:3, :3] = [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                 [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                 [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]
    m[:3, 3] = n.get('translation', [0, 0, 0]); return m


def glb_frames(j):
    nodes = j['nodes']; par = {c: i for i, nd in enumerate(nodes) for c in nd.get('children', [])}
    out = {}
    for i, nd in enumerate(nodes):
        m = local(nd); k = i
        while k in par:
            k = par[k]; m = local(nodes[k]) @ m
        r = m[:3, :3] / np.linalg.norm(m[:3, :3], axis=0)
        out[nd.get('name')] = (m[:3, 3], r)
    return out


MHG = GLBRead(os.path.join(ROOT, 'assets/footera/models/footera-humans.glb'))
REAL = GLBRead(os.path.join(ROOT, 'assets/footera/models/footera-real.glb'))
MH = glb_frames(MHG.j)
Q = glb_frames(GLBRead(os.path.join(ROOT, 'assets/footera/models/footballer-prototype.glb')).j)
RF = glb_frames(REAL.j)
BONE_NAMES = MHG.j['extras']['footera']['bones']
assert BONE_NAMES == REAL.j['extras']['footera']['bones']
BONE_INDEX = {n: i for i, n in enumerate(BONE_NAMES)}
FINGERS = ('thumb', 'index', 'middle', 'ring', 'pinky')

# ------------------------------------------------------------------ MetaHuman joints -> Footera bones
# Footera bone -> the MetaHuman joint at its pivot.
PIVOT = {'pelvis': 'pelvis', 'spine_01': 'spine_01', 'spine_02': 'spine_03', 'spine_03': 'spine_05',
         'neck_01': 'neck_01', 'Head': 'head'}
# MetaHuman joints that fold into another bone than their own name.
FOLD = {'root': 'pelvis', 'spine_02': 'spine_01', 'spine_04': 'spine_02', 'neck_02': 'neck_01'}
BODY_PARENT = {}


def footera_bone(dna, i):
    """The Footera bone a MetaHuman joint drives: itself when the names
    match, else the nearest ancestor that does (twist, corrective, bulge and
    metacarpal joints), face joints into the head."""
    names = dna.joints
    while True:
        n = names[i]
        if n in FOLD:
            return FOLD[n]
        if n == 'spine_03':
            return 'spine_02'
        if n == 'spine_05':
            return 'spine_03'
        if n == 'head' or n.startswith('FACIAL'):
            return 'Head'
        if n in BONE_INDEX and n != 'Head':
            return n
        p = dna.parent[i]
        if p == i:
            return 'pelvis'
        i = p


def bone_map(dna):
    return np.array([BONE_INDEX[footera_bone(dna, i)] for i in range(len(dna.joints))])


BJ = {n: i for i, n in enumerate(BD.joints)}
WR = BD.world.copy(); WR[:, :3, 3] /= 100            # metres, MetaHuman rest (its own A-pose)


def pivot_name(bone):
    return PIVOT.get(bone, bone)


# Turn MetaHuman's limbs onto the MakeHuman A-pose directions (as the
# realistic body does from its T-pose), children following their parent.
POSE = []
for s in ('l', 'r'):
    POSE += [(f'clavicle_{s}', f'upperarm_{s}'), (f'upperarm_{s}', f'lowerarm_{s}'), (f'lowerarm_{s}', f'hand_{s}'),
             (f'thigh_{s}', f'calf_{s}'), (f'calf_{s}', f'foot_{s}')]
POSE_AT = {a: b for a, b in POSE}
WN = WR.copy()
for i, n in enumerate(BD.joints):
    p = BD.parent[i]
    if p != i:
        WN[i] = WN[p] @ np.linalg.inv(WR[p]) @ WR[i]
    if n in POSE_AT and not n.startswith('clavicle'):
        kid = BJ[POSE_AT[n]]
        kid_pos = (WN[i] @ np.linalg.inv(WR[i]) @ WR[kid])[:3, 3]
        R = turn(kid_pos - WN[i][:3, 3], MH[POSE_AT[n]][0] - MH[n][0])
        T = np.eye(4); T[:3, :3] = R; T[:3, 3] = WN[i][:3, 3] - R @ WN[i][:3, 3]
        WN[i] = T @ WN[i]
SKIN_BODY = WN @ np.linalg.inv(WR)                     # rest -> A-pose per body joint
# The head file repeats the body joints it shares by name; face joints follow the head.
HJ_BODY = np.array([BJ.get(n, BJ['head']) for n in HD.joints])
SKIN_HEAD = SKIN_BODY[HJ_BODY]


def pose(m, skin):
    W = m['Wsrc'].astype(np.float64); W /= np.maximum(W.sum(1, keepdims=True), 1e-9)
    M = np.einsum('vk,kab->vab', W, skin)
    m['pos'] = np.einsum('vab,vb->va', M[:, :3, :3], m['pos']) + M[:, :3, 3]
    n = np.einsum('vab,vb->va', M[:, :3, :3], m['nrm']); m['nrm'] = n / np.linalg.norm(n, axis=1, keepdims=True)
    return m


def to_game(m, dna):
    W = np.zeros((len(m['pos']), len(BONE_NAMES)))
    bm = bone_map(dna)
    for b in range(len(BONE_NAMES)):
        W[:, b] = m['Wsrc'][:, bm == b].sum(1)
    m['W'] = W / np.maximum(W.sum(1, keepdims=True), 1e-9)
    del m['Wsrc']
    return m


def part(dna, name, skin):
    return to_game(pose(dna.mesh(name), skin), dna)


head = part(HD, f'head_lod{HEAD_LOD}_mesh', SKIN_HEAD)
body_m = part(BD, f'body_lod{BODY_LOD}_mesh', SKIN_BODY)
JOINTS = np.array([WN[BJ[pivot_name(b)]][:3, 3] for b in BONE_NAMES])
FLOOR = body_m['pos'][:, 1].min()
JOINTS[:, 1] -= FLOOR
parts = {'head': head, 'body': body_m}
for k in ('eyeLeft', 'eyeRight', 'eyeshell', 'eyelashes', 'teeth'):
    parts[k] = part(HD, f'{k}_lod{HEAD_LOD}_mesh', SKIN_HEAD)
for m in parts.values():
    m['pos'][:, 1] -= FLOOR

# ------------------------------------------------------------------ bone frames (Quaternius, aimed at this body)
PARENT = {}
for nd in MHG.j['nodes']:
    for c in nd.get('children', []):
        PARENT[MHG.j['nodes'][c]['name']] = nd['name']


def aim_point(i):
    name = BONE_NAMES[i]
    if name.startswith(FINGERS):
        k = int(name[-3])
        if k < 3:
            return JOINTS[BONE_INDEX[f'{name[:-3]}{k + 1}_{name[-1]}']]
        return JOINTS[i] + (JOINTS[i] - JOINTS[i - 1]) * .8
    if name.startswith('hand'):
        return JOINTS[BONE_INDEX['middle_01_' + name[-1]]]
    kids = [k for k, b in enumerate(BONE_NAMES) if PARENT.get(b) == name and not b.startswith(('thigh', 'clavicle'))]
    return JOINTS[kids[0]] if kids else None


Q_AIM = {'pelvis': 'spine_01', 'spine_01': 'spine_02', 'spine_02': 'spine_03', 'spine_03': 'neck_01', 'neck_01': 'Head',
         'hand_l': 'middle_01_l', 'hand_r': 'middle_01_r', 'foot_l': 'ball_l', 'foot_r': 'ball_r',
         'ball_l': 'ball_leaf_l', 'ball_r': 'ball_leaf_r'}
ROT = np.zeros((len(BONE_NAMES), 3, 3))
for i, name in enumerate(BONE_NAMES):
    parent = PARENT.get(name) if PARENT.get(name) in BONE_INDEX else None
    q_pos, q_rot = Q[name]
    if name.startswith(FINGERS):
        k = int(name[-3]); q_kid = name[:-3] + (f'{k + 1}_' if k < 3 else '4_leaf_') + name[-1]
    else:
        q_kid = Q_AIM.get(name) or {'clavicle': 'upperarm', 'upperarm': 'lowerarm', 'lowerarm': 'hand',
                                    'thigh': 'calf', 'calf': 'foot'}.get(name[:-2], '') + name[-2:]
    aim = aim_point(i)
    if name == 'Head' or aim is None or q_kid not in Q:
        ROT[i] = ROT[BONE_INDEX[parent]] @ Q[parent][1].T @ q_rot if parent else q_rot
    else:
        ROT[i] = turn(Q[q_kid][0] - q_pos, aim - JOINTS[i]) @ q_rot


def top4(W):
    idx = np.argsort(-W, axis=1)[:, :4]
    val = np.take_along_axis(W, idx, 1); val /= np.maximum(val.sum(1, keepdims=True), 1e-8)
    q = np.round(val * 255).astype(np.int32); q[:, 0] += 255 - q.sum(1)
    return idx.astype(np.uint8), q.astype(np.uint8)


def drop_unused(m):
    used = np.unique(m['idx']); remap = -np.ones(len(m['pos']), np.int64); remap[used] = np.arange(len(used))
    r = {k: (v[used] if isinstance(v, np.ndarray) and len(v) == len(m['pos']) else v) for k, v in m.items()}
    r['idx'] = remap[m['idx']]; return r


def merge(ps, atlas=None):
    out = {k: [] for k in ('pos', 'nrm', 'uv', 'W', 'idx')}; base = 0
    for n, m in enumerate(ps):
        uv = m['uv'].copy()
        if atlas:
            u0, v0, su, sv = atlas[n]; uv = np.stack([u0 + np.clip(uv[:, 0], 0, 1) * su, v0 + np.clip(uv[:, 1], 0, 1) * sv], 1)
        for k in ('pos', 'nrm', 'W'):
            out[k].append(m[k])
        out['uv'].append(uv.astype(np.float32)); out['idx'].append(m['idx'] + base); base += len(m['pos'])
    return {k: np.concatenate(v) for k, v in out.items()}


# Skin atlas: head on the left half, body on the right (2:1).
body = merge([head, body_m], atlas=[(0, 0, .5, 1), (.5, 0, .5, 1)])
body['ishead'] = np.arange(len(body['pos'])) < len(head['pos'])

# ------------------------------------------------------------------ kit from footera-real.glb, bone by bone
RJ = np.array([RF[n][0] for n in BONE_NAMES]); RR = np.array([RF[n][1] for n in BONE_NAMES])
CARRY = np.zeros((len(BONE_NAMES), 4, 4))
for i in range(len(BONE_NAMES)):
    a = np.eye(4); a[:3, :3] = RR[i]; a[:3, 3] = RJ[i]
    b = np.eye(4); b[:3, :3] = ROT[i]; b[:3, 3] = JOINTS[i]
    CARRY[i] = b @ np.linalg.inv(a)
R_BODY = REAL.mesh('FooteraBody')


def dense_w(m):
    W = np.zeros((len(m['pos']), len(BONE_NAMES)))
    for k in range(4):
        np.add.at(W, (np.arange(len(W)), m['j'][:, k]), m['w'][:, k])
    return W


def nearest(src_pos, src_nrm, pts, chunk=2048):
    i, _ = face.knn(src_pos, pts, 1, chunk)
    i = i[:, 0]; return src_pos[i], src_nrm[i]


def carry(name, min_gap=.004):
    """A footera-real garment on this body: each vertex moves with its bones
    (Man Player bind -> MetaHuman bind), then is pushed out wherever the
    MetaHuman skin comes through or sits closer than min_gap. The push is
    smoothed over the garment so folds stay folds."""
    m = REAL.mesh(name); W = dense_w(m)
    M = np.einsum('vk,kab->vab', W, CARRY)
    pos = np.einsum('vab,vb->va', M[:, :3, :3], m['pos']) + M[:, :3, 3]
    nrm = np.einsum('vab,vb->va', M[:, :3, :3], m['nrm']); nrm /= np.linalg.norm(nrm, axis=1, keepdims=True)
    j, d = face.knn(pos, pos, 12); wk = np.exp(-(d / .015) ** 2); wk /= wk.sum(1, keepdims=True)
    moved = np.linalg.norm(pos - m['pos'], axis=1)
    print(f'{name}: carried {moved.mean() * 100:.1f} cm on average (max {moved.max() * 100:.1f})')
    for _ in range(8):
        p1, n1 = nearest(body['pos'], body['nrm'], pos)
        lack = np.maximum(min_gap - np.einsum('ij,ij->i', pos - p1, n1), 0)
        lack = np.where(np.linalg.norm(pos - p1, axis=1) < .1, lack, 0)       # only where skin is near
        lack = np.maximum(lack, np.einsum('pk,pk->p', wk, lack[j]))            # spread to neighbours, never less
        pos = pos + n1 * lack[:, None]
    print(f'{name}: pushed out up to {np.linalg.norm(pos - (np.einsum("vab,vb->va", M[:, :3, :3], m["pos"]) + M[:, :3, 3]), axis=1).max() * 100:.1f} cm')
    out = dict(m); out.update(pos=pos, nrm=nrm, W=W)
    tex = REAL.j['meshes'][[x['name'] for x in REAL.j['meshes']].index(name)]['primitives'][0]['attributes']
    if 'TEXCOORD_1' in tex:
        out['uv2'] = REAL.acc(tex['TEXCOORD_1']).astype(np.float32)
    for k in ('j', 'w', 'morphs', 'morph_names'):
        out.pop(k, None)
    return out


boots = carry('FooteraBoots', .003)

# ------------------------------------------------------------------ shirt and shorts: cloth shells of this body
# The Man Player kit does not fit MetaHuman proportions (collar, shoulders),
# so shirt and shorts are grown from this body itself: the skin under them,
# smoothed (no painted-on abs), lifted off the skin (looser towards the hems)
# and cut with straight hems, collar and sleeve ends.
J = lambda n: JOINTS[BONE_INDEX[n]]
NB = len(body['pos']); BP = body['pos']; BW = body['W']
bones_of = lambda *names: BW[:, [BONE_INDEX[n] for n in names]].sum(1)


def along(a, b):
    """Position of every body vertex along the a->b bone, 0 at a, 1 at b."""
    ax = J(b) - J(a); return (BP - J(a)) @ ax / (ax @ ax)


arm_t = {s: along(f'upperarm_{s}', f'lowerarm_{s}') for s in 'lr'}
leg_t = {s: along(f'thigh_{s}', f'calf_{s}') for s in 'lr'}
SLEEVE, SHORTS_LEG = .46, .6
HEM_Y = J('pelvis')[1] - .05
WAIST_Y = J('pelvis')[1] + .06
COLLAR = J('neck_01') + np.array([0, -.06, 0])      # collar plane through the neck base, tilted forward
COLLAR_N = np.array([0, 1, .35]); COLLAR_N /= np.linalg.norm(COLLAR_N)
torso = bones_of('spine_01', 'spine_02', 'spine_03', 'clavicle_l', 'clavicle_r', 'pelvis', 'neck_01', 'upperarm_l', 'upperarm_r')
ARM_BONES = {s: [n for n in BONE_INDEX if n.endswith('_' + s) and n.split('_')[0] in
                 ('upperarm', 'lowerarm', 'hand', 'thumb', 'index', 'middle', 'ring', 'pinky')] for s in 'lr'}
armw = {s: bones_of(*ARM_BONES[s]) for s in 'lr'}
legw = {s: bones_of(f'thigh_{s}', f'calf_{s}', f'foot_{s}') for s in 'lr'}
collar_d = (BP - COLLAR) @ COLLAR_N
# Regions by geometry (skin weights leave holes at the belly and hips): the
# shirt is everything of the trunk between hem and collar up to the sleeve
# ends, the shorts everything below the waist down to the leg hems.
NECK_C = (J('neck_01') + J('spine_03')) / 2; NECK_R = .09
neck_r = lambda p: np.hypot(p[:, 0] - NECK_C[0], (p[:, 2] - NECK_C[2]) * 1.15)
# Round neck: above the collar plane only a ring around the neck stays open,
# so the shirt covers the shoulder tops.
# Crew neck: the collar line drops at the front and rises in a curve towards
# the shoulders, so the shirt covers the shoulder tops with a clean round neck.
collar_y = lambda p: COLLAR[1] + .02 - .2 * (p[:, 2] - NECK_C[2]) + 9. * (p[:, 0] - NECK_C[0]) ** 2
near_neck = lambda p: np.clip((.16 - neck_r(p)) / .03, 0, 1)
in_shirt = (BP[:, 1] > HEM_Y) & (BP[:, 1] < collar_y(BP)) & (BP[:, 1] < J('neck_01')[1] + .005)
for s_ in 'lr':
    in_shirt &= ~((armw[s_] > .3) & (arm_t[s_] > SLEEVE))
in_shorts = (~body['ishead']) & (BP[:, 1] < WAIST_Y) & (armw['l'] < .5) & (armw['r'] < .5)
for s_ in 'lr':
    in_shorts &= ~((legw[s_] > .3) & (leg_t[s_] > SHORTS_LEG))
in_shorts &= BP[:, 1] > J('calf_l')[1]


def open_edges(idx, n):
    """Vertices on an open edge (used by one triangle only)."""
    e = np.sort(np.concatenate([idx[:, [0, 1]], idx[:, [1, 2]], idx[:, [2, 0]]]), 1)
    u, c = np.unique(e, axis=0, return_counts=True)
    out = np.zeros(n, bool); out[u[c == 1].ravel()] = True; return out


def smooth(pos, idx, n, lam=.5, pin=None):
    nb = [[] for _ in range(len(pos))]
    for t in idx:
        for x in range(3):
            nb[t[x]] += [t[(x + 1) % 3], t[(x + 2) % 3]]
    nb = [np.unique(v) for v in nb]
    for _ in range(n):
        avg = np.array([pos[v].mean(0) if len(v) else pos[k] for k, v in enumerate(nb)])
        step = lam * (avg - pos)
        if pin is not None:
            step[pin] = 0
        pos = pos + step
    return pos


def shell(sel, lift, loose, planes, iters=6, floor=.0025):
    """Cloth from the skin triangles touching sel: smoothed, lifted by lift
    (plus loose * how far towards the hem), corners outside a hem plane
    pulled onto it (straight edges)."""
    tri = body['idx'][sel[body['idx']].any(1)]
    m = drop_unused({'pos': BP, 'nrm': body['nrm'], 'W': BW, 'uv': body['uv'], 'idx': tri})
    # The skin is unwelded at UV seams: weld by position so the cloth stays
    # one piece while smoothing and lifting, then hand back per corner.
    _, first, inv = np.unique(np.round(m['pos'] / 6e-4).astype(np.int64), axis=0, return_index=True, return_inverse=True)
    inv = inv.reshape(-1); widx = inv[m['idx']]
    pos = m['pos'][first].copy()
    # A plane may hold only for vertices of some bones (sleeve ends cut the
    # arm, not the trunk below the armpit).
    W1 = m['W'][first]
    gate = [np.ones(len(pos)) if bones is None else bones(pos) if callable(bones) else
            np.clip(W1[:, [BONE_INDEX[n] for n in bones]].sum(1) * 2 - .2, 0, 1) for _, _, bones in planes]
    def cut(pos):
        for (point, normal, _), g_ in zip(planes, gate):
            if point is None:                            # curved cut: y <= normal(p)
                pos = pos.copy(); pos[:, 1] -= g_ * np.maximum(pos[:, 1] - normal(pos), 0)
                continue
            over = (pos - point) @ normal                # keep side: (p - point) . normal <= 0
            pos = pos - (g_ * np.maximum(over, 0))[:, None] * normal
        return pos
    pos = cut(pos)
    # The head and body meshes meet at a seam with different vertex spacing;
    # open edges there stay where they are, so the two halves keep meeting.
    seam = open_edges(widx, len(pos)) & (pos[:, 1] > HEM_Y + .05) & (pos[:, 1] < J('neck_01')[1] - .03)
    seam &= np.min([np.abs(pos[:, 1] - nn(pos)) if pt is None else np.abs((pos - pt) @ nn) for pt, nn, _ in planes], 0) > .004
    pos = smooth(pos, widx, iters, pin=seam)
    p1, n1 = nearest(BP, body['nrm'], pos)
    gap = np.einsum('ij,ij->i', pos - p1, n1)
    want = lift + loose(pos)
    pos = pos + n1 * np.maximum(want - gap, 0)[:, None]
    pos = smooth(pos, widx, 4, pin=seam)                # lifting re-imprints muscles: smooth once more
    pos = cut(pos)
    for _ in range(3):                                   # nothing of the skin pokes through
        p1, n1 = nearest(BP, body['nrm'], pos)
        lack = np.maximum((floor(pos) if callable(floor) else floor) - np.einsum('ij,ij->i', pos - p1, n1), 0)
        pos = pos + n1 * lack[:, None]
    # Normals of the smoothed, welded cloth.
    fn = np.cross(pos[widx[:, 1]] - pos[widx[:, 0]], pos[widx[:, 2]] - pos[widx[:, 0]])
    vn = np.zeros_like(pos)
    for x in range(3):
        np.add.at(vn, widx[:, x], fn)
    vn /= np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-9)
    m['pos'] = pos[inv]; m['nrm'] = vn[inv]
    return m


def arm_plane(s_):
    ax = J(f'lowerarm_{s_}') - J(f'upperarm_{s_}')
    return J(f'upperarm_{s_}') + ax * SLEEVE, ax / np.linalg.norm(ax), ARM_BONES[s_]


def leg_plane(s_):
    ax = J(f'calf_{s_}') - J(f'thigh_{s_}')
    return J(f'thigh_{s_}') + ax * SHORTS_LEG, ax / np.linalg.norm(ax), [f'thigh_{s_}', f'calf_{s_}']


shirt = shell(in_shirt, .007, lambda p: np.clip((J('spine_02')[1] - p[:, 1]) / .25, 0, 1) * .012,
              [(np.array([0, HEM_Y, 0]), np.array([0, -1., 0]), None), (None, collar_y, near_neck), arm_plane('l'), arm_plane('r')], iters=14,
              # over the shorts' waistband the shirt must stay outside the shorts
              floor=lambda p: np.where(p[:, 1] < WAIST_Y + .04, .016, .003))
shorts = shell(in_shorts, .008, lambda p: np.clip((J('pelvis')[1] - .08 - p[:, 1]) / .2, 0, 1) * .03,
               [(np.array([0, WAIST_Y, 0]), np.array([0, 1., 0]), None), leg_plane('l'), leg_plane('r')])
print(f'shirt shell {len(shirt["pos"])} verts, shorts shell {len(shorts["pos"])} verts')


SHORTS_HEM = float(shorts['pos'][:, 1].min())
under = (in_shirt & ((BP[:, 1] < collar_y(BP) - .03) | (near_neck(BP) < .5))) | in_shorts
Y_KNEE = JOINTS[BONE_INDEX['calf_l'], 1]
BOOT_TOP = boots['pos'][:, 1].max()
feet = body['W'][:, [BONE_INDEX[n] for n in ('foot_l', 'foot_r', 'ball_l', 'ball_r')]].sum(1) > .5
in_boot = (body['pos'][:, 1] < BOOT_TOP - .015) & feet
gone = (under | in_boot)[body['idx']].all(1)
print(f'skin under kit removed: {gone.sum()} of {len(gone)} triangles')
SOCK_TOP = Y_KNEE - .045; SOCK_LOW = BOOT_TOP - .03
ty = body['pos'][body['idx']][:, :, 1]
legs = body['W'][:, [BONE_INDEX[n] for n in ('calf_l', 'calf_r', 'foot_l', 'foot_r')]].sum(1) > .5
sock_t = ~gone & (ty.min(1) < SOCK_TOP) & (ty.max(1) > SOCK_LOW) & legs[body['idx']].all(1)
inside_sock = sock_t & (ty.max(1) <= SOCK_TOP)
socks = dict(body); socks['idx'] = body['idx'][sock_t]
socks = drop_unused(socks)
socks['pos'] = socks['pos'] + socks['nrm'] * .003
socks['pos'][:, 1] = np.minimum(socks['pos'][:, 1], SOCK_TOP)
body['idx'] = body['idx'][~gone & ~inside_sock]
body = drop_unused(body)

# ------------------------------------------------------------------ face variety (as V21.433)
HEAD = BONE_INDEX['Head']


def mh_weights(m):
    return dense_w(m)


mh_body = MHG.mesh('FooteraBody'); mh_body['W'] = mh_weights(mh_body)
mh_hw = mh_body['W'][:, HEAD]
neck_mh = (MH['neck_01'][0][1] + MH['Head'][0][1]) / 2
neck_real = (JOINTS[BONE_INDEX['neck_01'], 1] + JOINTS[HEAD, 1]) / 2
FIT = face.HeadFit(mh_body['pos'], mh_hw, body['pos'], body['W'][:, HEAD], neck_mh, neck_real)
print('head fit scale', FIT.scale.round(3), 'offset', FIT.offset.round(3))
mh_head = mh_hw > .9
MH_LIFT = {n: mh_body['morphs'][mh_body['morph_names'].index(n)][mh_head].mean(0) for n in face.FACE_MORPHS}
mh_deltas = face.face_deltas(mh_body, FIT, mh_hw)
body['morphs'] = face.prune(face.transfer_to_surface(body['pos'], body['W'][:, HEAD], mh_body['pos'], mh_hw, FIT, mh_deltas))
print('body face morphs:', len(body['morphs']))


def follow_face(m, rigid=None, keep=.001):
    m['morphs'] = face.prune(face.follow(m['pos'], body['pos'], body['morphs'], rigid_groups=rigid), keep)
    return m


def mh_part(name):
    m = MHG.mesh(name); W = mh_weights(m)
    pos = FIT.apply(m['pos'])
    nrm = m['nrm'] / FIT.scale; nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
    morphs = {}
    for n in face.FACE_MORPHS:
        if n in m['morph_names']:
            morphs[n] = FIT.delta(m['morphs'][m['morph_names'].index(n)] - MH_LIFT[n])
    return {'pos': pos, 'nrm': nrm, 'uv': m['uv'], 'W': W, 'idx': m['idx'], 'morphs': face.prune(morphs, .0025),
            'material': m['material']}


# ------------------------------------------------------------------ textures
def load(name, size=None):
    im = Image.open(os.path.join(MAPS, name)).convert('RGB')
    return im.resize((size, size), Image.LANCZOS) if size else im


def enc(img, fmt='JPEG', quality=86):
    b = io.BytesIO(); img.save(b, fmt, quality=quality, optimize=True)
    return b.getvalue(), 'image/jpeg' if fmt == 'JPEG' else 'image/png'


def pair(a, b, size):
    img = Image.new('RGB', (size * 2, size)); img.paste(load(a, size), (0, 0)); img.paste(load(b, size), (size, 0)); return img


ATLAS = 1024
skin_src = pair('Head_Basecolor.png', 'Body_Basecolor.png', ATLAS)
# The body colour map of the DCC export is blocky (coarse tiles that read as
# stripes along the limbs): soften the body half; the normal map keeps detail.
skin_src.paste(skin_src.crop((ATLAS, 0, ATLAS * 2, ATLAS)).filter(ImageFilter.GaussianBlur(10)), (ATLAS, 0))
skin_nrm = pair('Head_Normal.png', 'Body_Normal.png', ATLAS)


def lin(a): return np.where(a <= .04045, a / 12.92, ((a + .055) / 1.055) ** 2.4)
def srgb(a): return np.where(a <= .0031308, a * 12.92, 1.055 * np.clip(a, 0, None) ** (1 / 2.4) - .055)


def skin_mean(img):
    a = np.asarray(img.resize((128, 64))).reshape(-1, 3).astype(np.float32) / 255
    return np.median(a[a.sum(1) > .12], 0)


def retone(img, target, chroma=1.0, contrast=1.0):
    """Move the photo to another complexion, keeping its detail as luminance
    ratio around the median skin (as deepen() of the realistic body)."""
    a = lin(np.asarray(img).astype(np.float32) / 255); m = lin(skin_mean(img)); t = lin(np.array(target))
    w = np.array([.2126, .7152, .0722]); rel = a / m; lum = rel @ w
    # A light complexion has less contrast than a dark one (lips, palms and
    # creases would turn white): compress the ratio around the median.
    want = np.power(np.maximum(lum, 1e-4), contrast)
    if contrast < 1:                                    # brighter-than-skin parts (lips, palms) barely brighter
        want = np.where(lum > 1, 1 + (lum - 1) * .2, want)
    soft = want / np.maximum(lum, 1e-4)
    rel = rel * soft[..., None]; lum = lum * soft
    col = lum[..., None] + (rel - lum[..., None]) * chroma
    return Image.fromarray((srgb(np.clip(col * t, 0, 1)) * 255).clip(0, 255).astype(np.uint8))


LIGHT = (.78, .58, .47); DARK = (.36, .23, .165)
src_mean = skin_mean(skin_src)
print('source skin mean', src_mean.round(3))
light_img = retone(skin_src, LIGHT, .85, .55)
# Lips (and lid corners) of the dark source are a light pink; on a light
# complexion they would read white. Paint them a rosy, slightly darker skin.
_a = np.asarray(skin_src).astype(np.float32) / 255
_pink = np.clip((_a[..., 2] - _a[..., 1] * .97) / .03, 0, 1) * np.clip((_a[..., 0] - .3) / .08, 0, 1)
_pink = np.asarray(Image.fromarray((_pink * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))).astype(np.float32) / 255


def lips(img, tone, tint, amount):
    l = np.asarray(img).astype(np.float32) / 255
    detail = (_a.mean(2, keepdims=True) / max(_a.mean(2)[_pink > .5].mean(), 1e-3)) ** .4
    lip = np.array(tone) * np.array(tint) * detail
    k = _pink[..., None] * amount
    return Image.fromarray((np.clip(l * (1 - k) + lip * k, 0, 1) * 255).astype(np.uint8))


if (_pink > .5).any():
    light_img = lips(light_img, LIGHT, (.9, .68, .64), .8)
print('lip pixels', int((_pink > .5).sum()))
dark_img = skin_src if src_mean[0] < .45 else retone(skin_src, DARK, 1.3)
if (_pink > .5).any():
    dark_img = lips(dark_img, src_mean if src_mean[0] < .45 else DARK, (1.25, .78, .8), .6)

g = GLB()
skin_tex = g.image(*enc(light_img))
skin_dark_tex = g.image(*enc(dark_img))
skin_nrm_tex = g.image(*enc(skin_nrm, 'JPEG', 90))


def quat(r):
    t = np.trace(r)
    if t > 0:
        k = np.sqrt(t + 1) * 2; q = [(r[2, 1] - r[1, 2]) / k, (r[0, 2] - r[2, 0]) / k, (r[1, 0] - r[0, 1]) / k, k / 4]
    else:
        i = int(np.argmax(np.diag(r))); j, l = (i + 1) % 3, (i + 2) % 3
        k = np.sqrt(1 + r[i, i] - r[j, j] - r[l, l]) * 2
        q = [0, 0, 0, (r[l, j] - r[j, l]) / k]; q[i] = k / 4; q[j] = (r[j, i] + r[i, j]) / k; q[l] = (r[l, i] + r[i, l]) / k
    q = np.array(q); return (q / np.linalg.norm(q)).tolist()


joint_nodes = []
for i, name in enumerate(BONE_NAMES):
    parent = PARENT.get(name) if PARENT.get(name) in BONE_INDEX else None
    pw = ROT[BONE_INDEX[parent]] if parent else np.eye(3)
    loc = JOINTS[i] - (JOINTS[BONE_INDEX[parent]] if parent else 0)
    joint_nodes.append(g.node(name=name, translation=(pw.T @ loc).tolist(), rotation=quat(pw.T @ ROT[i])))
for i, name in enumerate(BONE_NAMES):
    parent = PARENT.get(name) if PARENT.get(name) in BONE_INDEX else None
    if parent:
        g.j['nodes'][joint_nodes[BONE_INDEX[parent]]].setdefault('children', []).append(joint_nodes[i])
ibm = np.zeros((len(BONE_NAMES), 16), np.float32)
for i in range(len(BONE_NAMES)):
    m = np.eye(4); m[:3, :3] = ROT[i]; m[:3, 3] = JOINTS[i]
    ibm[i] = np.linalg.inv(m).T.ravel()
g.j['skins'] = [{'joints': joint_nodes, 'skeleton': joint_nodes[0], 'inverseBindMatrices': g.accessor(ibm)}]
root = g.node(name='FooteraMetaHuman', children=[joint_nodes[0]])
g.j['scenes'][0]['nodes'].append(root)


def add(name, m, material):
    j, w = top4(m['W'])
    attrs = {'POSITION': g.accessor(m['pos'].astype(np.float32), 34962, minmax=True),
             'NORMAL': g.accessor(m['nrm'].astype(np.float32), 34962),
             'TEXCOORD_0': g.accessor(m['uv'].astype(np.float32), 34962), 'JOINTS_0': g.accessor(j, 34962),
             'WEIGHTS_0': g.accessor(w, 34962, normalized=True)}
    if 'uv2' in m:
        attrs['TEXCOORD_1'] = g.accessor(m['uv2'].astype(np.float32), 34962)
    idx = m['idx'].ravel()
    prim = {'attributes': attrs, 'indices': g.accessor(idx.astype(np.uint16 if len(m['pos']) < 65536 else np.uint32), 34963),
            'material': material}
    names = list(m.get('morphs') or {})
    if names:
        prim['targets'] = [{'POSITION': g.morph_accessor(m['morphs'][k], len(m['pos']))} for k in names]
    n = g.node(name=name, mesh=g.mesh(name, prim, names or None), skin=0)
    g.j['nodes'][root]['children'].append(n)
    return len(m['pos']), len(idx) // 3


def real_tex(material, key):
    t = material.get(key) or material.get('pbrMetallicRoughness', {}).get(key)
    return g.image(*REAL.image(t['index'])) if t else None


stats = {}
stats['FooteraBody'] = add('FooteraBody', body, g.material(name='FooteraSkin', pbrMetallicRoughness={
    'baseColorTexture': {'index': skin_tex}, 'metallicFactor': 0, 'roughnessFactor': .58},
    normalTexture={'index': skin_nrm_tex, 'scale': 1}))
KB = REAL.j['extras']['footera']['kitBands']


def kit_uv(m, across, top, bottom, rows, centre_z):
    """Per-vertex kit UV as on the realistic body: front half left, back half
    right (mirrored); corners split by facing first."""
    tri = m['idx']; p = m['pos']
    front = p[tri][:, :, 2].mean(1) >= centre_z
    keys = tri * 2 + (~front)[:, None]
    uniq, first, inv = np.unique(keys.ravel(), return_index=True, return_inverse=True)
    src = tri.ravel()[first]; f = front.repeat(3)[first]
    a = np.clip(p[src, 0] / across * .5 + .5, 0, 1)
    u = np.where(f, .5 * a, .5 + .5 * (1 - a)); v = rows[0] + np.clip((top - p[src, 1]) / (top - bottom), 0, 1) * (rows[1] - rows[0])
    return {'pos': p[src], 'nrm': m['nrm'][src], 'W': m['W'][src], 'uv': np.stack([u, v], 1).astype(np.float32),
            'idx': inv.reshape(-1, 3)}


CZ = JOINTS[BONE_INDEX['spine_02'], 2]
KM = {}
for name, m, band in (('FooteraShirt', shirt, KB['shirt']), ('FooteraShorts', shorts, KB['shorts'])):
    top = float(m['pos'][:, 1].max()) + .01; bottom = float(m['pos'][:, 1].min()) - .01
    across = float(np.abs(m['pos'][:, 0]).max()) + .01
    KM[name] = [round(across, 3), round(top, 3), round(bottom, 3)]
    stats[name] = add(name, kit_uv(m, across, top, bottom, band, CZ), g.material(
        name='FooteraKit' if name == 'FooteraShirt' else 'FooteraKitShorts', doubleSided=True,
        pbrMetallicRoughness={'metallicFactor': 0, 'roughnessFactor': .82}))
# Socks: kit UV band like the realistic body.
SOCKS_V = REAL.j['extras']['footera']['kitBands']['socks']
tri = socks['idx']; p = socks['pos']; CENTRE_Z = JOINTS[BONE_INDEX['spine_02'], 2]
front = p[tri][:, :, 2].mean(1) >= CENTRE_Z
keys = tri * 2 + (~front)[:, None]
uniq, first, inv = np.unique(keys.ravel(), return_index=True, return_inverse=True)
src = tri.ravel()[first]; f = front.repeat(3)[first]
a = np.clip(p[src, 0] / .3 * .5 + .5, 0, 1)
u = np.where(f, .5 * a, .5 + .5 * (1 - a))
v = SOCKS_V[0] + np.clip((SOCK_TOP - p[src, 1]) / (SOCK_TOP - SOCK_LOW - .02), 0, 1) * (SOCKS_V[1] - SOCKS_V[0])
socks_k = {'pos': p[src], 'nrm': socks['nrm'][src], 'W': socks['W'][src], 'uv': np.stack([u, v], 1), 'idx': inv.reshape(-1, 3)}
stats['FooteraSocks'] = add('FooteraSocks', socks_k, g.material(name='FooteraSocks', pbrMetallicRoughness={'metallicFactor': 0, 'roughnessFactor': .9}))
bm = boots['material']
stats['FooteraBoots'] = add('FooteraBoots', boots, g.material(name='FooteraBoots', pbrMetallicRoughness={
    'baseColorTexture': {'index': real_tex(bm, 'baseColorTexture')}, 'metallicFactor': 0, 'roughnessFactor': .45},
    normalTexture={'index': real_tex(bm, 'normalTexture')}))

MH_INFO = MHG.j['extras']['footera']
MH_PARTS = ([('FooteraHair-' + h) for h in MH_INFO['hair'] + MH_INFO['hairFemale'] + MH_INFO['hairSpecial']] +
            [('FooteraFacial-' + f) for f in MH_INFO['facial']] + [('FooteraBrows-' + b) for b in MH_INFO['brows']])
mh_tex = {}
HEAD_SKIN = body['W'][:, HEAD] > .3
HS_POS, HS_NRM = body['pos'][HEAD_SKIN], body['nrm'][HEAD_SKIN]


def out_of_skull(m, gap):
    """The MetaHuman skull is wider at the temples than the MakeHuman head the
    cuts were made for: hair sinking into it would leave only the painted
    scalp. Push every part out to at least gap, smoothed so cards stay whole."""
    p1, n1 = nearest(HS_POS, HS_NRM, m['pos'])
    push = np.maximum(gap - np.einsum('ij,ij->i', m['pos'] - p1, n1), 0)[:, None] * n1
    push = smooth(push, m['idx'], 3)
    m['pos'] = m['pos'] + push
    p1, n1 = nearest(HS_POS, HS_NRM, m['pos'])
    m['pos'] = m['pos'] + np.maximum(gap * .5 - np.einsum('ij,ij->i', m['pos'] - p1, n1), 0)[:, None] * n1
    return m


for name in MH_PARTS:
    pm = out_of_skull(mh_part(name), .004 if 'Hair' in name else .0015)
    mat = dict(pm['material']); pbr = dict(mat['pbrMetallicRoughness'])
    t = pbr['baseColorTexture']['index']
    if t not in mh_tex:
        mh_tex[t] = g.image(*MHG.image(t))
    pbr['baseColorTexture'] = {'index': mh_tex[t]}; mat['pbrMetallicRoughness'] = pbr
    stats[name] = add(name, pm, g.material(**mat))

eyes = merge([parts['eyeLeft'], parts['eyeRight']]); follow_face(eyes, eyes['pos'][:, 0] > 0)
stats['FooteraEyes'] = add('FooteraEyes', eyes, g.material(name='FooteraEyes', pbrMetallicRoughness={
    'baseColorTexture': {'index': g.image(*enc(load('Eyes_Color.png', 512)))}, 'metallicFactor': 0, 'roughnessFactor': .25}))
shell = parts['eyeshell']; follow_face(shell, shell['pos'][:, 0] > 0)
stats['FooteraCornea'] = add('FooteraCornea', shell, g.material(name='FooteraCornea', alphaMode='BLEND', pbrMetallicRoughness={
    'baseColorFactor': [1, 1, 1, .06], 'metallicFactor': 0, 'roughnessFactor': .04}))
stats['FooteraDetail'] = add('FooteraDetail', parts['teeth'], g.material(name='FooteraDetail', pbrMetallicRoughness={
    'baseColorTexture': {'index': g.image(*enc(load('Teeth_Color.png', 256), 'JPEG', 84))}, 'metallicFactor': 0, 'roughnessFactor': .4}))
lash = Image.open(os.path.join(MAPS, 'Eyelashes_Color.png')).convert('RGBA').resize((256, 256), Image.LANCZOS)
lash_a = np.asarray(lash).copy(); lash_a[..., :3] = 235
stats['FooteraLashes'] = add('FooteraLashes', follow_face(parts['eyelashes']), g.material(
    name='FooteraLashes', alphaMode='MASK', alphaCutoff=.5, doubleSided=True, pbrMetallicRoughness={
        'baseColorTexture': {'index': g.image(*enc(Image.fromarray(lash_a, 'RGBA'), 'PNG'))},
        'metallicFactor': 0, 'roughnessFactor': .8}))


def captain_band():
    u = JOINTS[BONE_INDEX['upperarm_l']]; d = (JOINTS[BONE_INDEX['lowerarm_l']] - u)[:2]; d /= np.linalg.norm(d)
    return {'shoulder': [round(float(u[0]), 3), round(float(u[1]), 3)], 'dir': [round(float(d[0]), 3), round(float(d[1]), 3)],
            'inner': round(float(u[0]) + .022, 3)}


RI = REAL.j['extras']['footera']
size = g.save(OUT, extras={'footera': {
    'source': 'MetaHuman (Epic Games), made in MetaHuman Creator; kit from Man Player by RiverofCreative, CC-BY-4.0',
    'credit': RI['credit'],
    'metahuman': 'Created with MetaHuman Creator in Unreal Engine 5.8 (MetaHuman is a trademark of Epic Games, Inc.)',
    'morphs': face.FACE_MORPHS, 'hair': MH_INFO['hair'], 'hairFemale': MH_INFO['hairFemale'],
    'hairSpecial': MH_INFO['hairSpecial'], 'facial': MH_INFO['facial'], 'brows': MH_INFO['brows'],
    'skins': {'light': skin_tex, 'dark': skin_dark_tex},
    'skinMean': {'light': skin_mean(light_img).round(3).tolist(), 'dark': skin_mean(dark_img).round(3).tolist()},
    'bones': BONE_NAMES, 'kitBands': RI['kitBands'], 'captainBand': captain_band(), 'kitMetres': {'shirt': KM['FooteraShirt'], 'shorts': KM['FooteraShorts']}}})
print(f'wrote {OUT}: {size / 1e6:.2f} MB')
for k, (v, t) in stats.items():
    print(f'  {k}: {v} verts, {t} tris')
