#!/usr/bin/env python3
"""Build assets/footera/models/footera-real.glb, Footera's realistic player
body, from the Sketchfab model "Man Player" by RiverofCreative
(https://sketchfab.com/3d-models/man-player-4c7133dbb06e4136891d59231372d818),
licensed CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). The credit
travels in the GLB (extras.footera.credit) and in the game's credits.

Download the model as glTF from Sketchfab, unzip it, then run:

  python3 tools/build-footera-real.py <unzipped folder> [out.glb]

The output follows the same contract as footera-humans.glb (see
tools/build-footera-humans.py and 3d-player-human.mjs): the same 52 bone
names and Quaternius-matched bone frames, so the Mixamo/CMU/UAL mocap layers
and the foot IK drive it unchanged; the body is first posed from the source's
T-pose into the A-pose of the MakeHuman body, so every rest-pose assumption
(kit projection, captain band, sway) holds. Shirt and shorts get the
per-player kit canvas UV (TEXCOORD_0, source UV in TEXCOORD_1 for the cloth
normal map), socks are a shell grown from the shin, skin hidden under the kit
is removed, and the four skin textures share one atlas so the body is a
single draw call. The raw source files are never committed.
"""
import io, os, sys, json, struct
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from glb_writer import GLB

SRC = sys.argv[1]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'assets/footera/models/footera-real.glb')

# ------------------------------------------------------------------ glTF read
G = json.load(open(os.path.join(SRC, 'scene.gltf')))
BIN = open(os.path.join(SRC, G['buffers'][0]['uri']), 'rb').read()
CT = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8, 5122: np.int16, 5120: np.int8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def acc(i):
    a = G['accessors'][i]; v = G['bufferViews'][a['bufferView']]
    dt = np.dtype(CT[a['componentType']]); n = NC[a['type']]
    off = v.get('byteOffset', 0) + a.get('byteOffset', 0); stride = v.get('byteStride', dt.itemsize * n)
    raw = np.frombuffer(BIN, np.uint8, count=stride * (a['count'] - 1) + dt.itemsize * n, offset=off)
    out = np.lib.stride_tricks.as_strided(raw, (a['count'], dt.itemsize * n), (stride, 1)).copy().view(dt).reshape(a['count'], n)
    if a.get('normalized'):
        out = out.astype(np.float32) / np.iinfo(dt).max
    return out


def qmat(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def local(n):
    if 'matrix' in n:
        return np.array(n['matrix'], float).reshape(4, 4).T
    m = np.eye(4); m[:3, :3] = qmat(n.get('rotation', [0, 0, 0, 1])) * np.array(n.get('scale', [1, 1, 1]))
    m[:3, 3] = n.get('translation', [0, 0, 0]); return m


NODES = G['nodes']
PARENT = {c: i for i, n in enumerate(NODES) for c in n.get('children', [])}


def world(i):
    m = local(NODES[i])
    while i in PARENT:
        i = PARENT[i]; m = local(NODES[i]) @ m
    return m


SKIN = G['skins'][0]
CCJ = SKIN['joints']
CCNAME = [NODES[j]['name'].rsplit('_', 1)[0] if NODES[j]['name'][-1].isdigit() else NODES[j]['name'] for j in CCJ]
CCINDEX = {n: i for i, n in enumerate(CCNAME)}
IBM = acc(SKIN['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
WR = np.array([world(j) for j in CCJ])           # rest world matrices
BIND = WR @ IBM                                  # mesh space -> world, per joint


def joint_parent(j):
    """Nearest ancestor that is a skin joint (FBX exports put
    *_scaleCompensation nodes in between)."""
    while j in PARENT:
        j = PARENT[j]
        if j in CCJ:
            return CCJ.index(j)
    return -1


CCPAR = [joint_parent(j) for j in CCJ]


def read_mesh(name):
    m = next(m for m in G['meshes'] if m['name'] == name)
    p = m['primitives'][0]; at = p['attributes']
    pos = acc(at['POSITION']).astype(np.float64); nrm = acc(at['NORMAL']).astype(np.float64)
    j = acc(at['JOINTS_0']).astype(np.int64); w = acc(at['WEIGHTS_0']).astype(np.float64)
    w /= np.maximum(w.sum(1, keepdims=True), 1e-9)
    # World rest position through the skin (bind matrices may carry FBX scale).
    M = np.einsum('vk,vkab->vab', w, BIND[j])
    wpos = np.einsum('vab,vb->va', M[:, :3, :3], pos) + M[:, :3, 3]
    wn = np.einsum('vab,vb->va', M[:, :3, :3], nrm); wn /= np.linalg.norm(wn, axis=1, keepdims=True)
    return {'pos': wpos, 'nrm': wn, 'uv': acc(at['TEXCOORD_0']).astype(np.float32), 'j': j, 'w': w,
            'idx': acc(p['indices']).reshape(-1, 3).astype(np.int64),
            'mat': G['materials'][p['material']]['name']}


# ------------------------------------------------------------------ target rest pose
def glb_json(path):
    b = open(path, 'rb').read(); n = struct.unpack('<I', b[12:16])[0]
    return json.loads(b[20:20 + n])


def glb_frames(path):
    nodes = glb_json(path)['nodes']; par = {c: i for i, nd in enumerate(nodes) for c in nd.get('children', [])}
    out = {}
    for i, nd in enumerate(nodes):
        m = local(nd); k = i
        while k in par:
            k = par[k]; m = local(nodes[k]) @ m
        r = m[:3, :3] / np.linalg.norm(m[:3, :3], axis=0)
        out[nd.get('name')] = (m[:3, 3], r)
    return out


MH = glb_frames(os.path.join(ROOT, 'assets/footera/models/footera-humans.glb'))
Q = glb_frames(os.path.join(ROOT, 'assets/footera/models/footballer-prototype.glb'))


def turn(a, b):
    a = a / np.linalg.norm(a); b = b / np.linalg.norm(b)
    v = np.cross(a, b); c = float(a @ b)
    if c < -.9999:
        return -np.eye(3)
    k = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + k + k @ k / (1 + c)


# Turn the source T-pose limbs onto the MakeHuman A-pose directions.
POSE = []
for s, S in (('l', 'L'), ('r', 'R')):
    POSE += [(f'CC_Base_{S}_Upperarm', f'CC_Base_{S}_Forearm', f'upperarm_{s}', f'lowerarm_{s}'),
             (f'CC_Base_{S}_Forearm', f'CC_Base_{S}_Hand', f'lowerarm_{s}', f'hand_{s}'),
             (f'CC_Base_{S}_Thigh', f'CC_Base_{S}_Calf', f'thigh_{s}', f'calf_{s}'),
             (f'CC_Base_{S}_Calf', f'CC_Base_{S}_Foot', f'calf_{s}', f'foot_{s}')]
WN = WR.copy()
for i in range(len(CCJ)):
    p = CCPAR[i]
    if p >= 0:
        WN[i] = WN[p] @ np.linalg.inv(WR[p]) @ WR[i]
    for cc, cc_kid, mh, mh_kid in POSE:
        if CCNAME[i] == cc:
            # Children follow from WN[i] below; aim from the child's would-be position.
            kid = CCINDEX[cc_kid]
            kid_pos = (WN[i] @ np.linalg.inv(WR[i]) @ WR[kid])[:3, 3]
            R = turn(kid_pos - WN[i][:3, 3], MH[mh_kid][0] - MH[mh][0])
            WN[i][:3, :3] = R @ WN[i][:3, :3]
SKIN_M = WN @ np.linalg.inv(WR)                  # world rest -> world A-pose, per joint


def pose(m):
    M = np.einsum('vk,vkab->vab', m['w'], SKIN_M[m['j']])
    m['pos'] = np.einsum('vab,vb->va', M[:, :3, :3], m['pos']) + M[:, :3, 3]
    n = np.einsum('vab,vb->va', M[:, :3, :3], m['nrm']); m['nrm'] = n / np.linalg.norm(n, axis=1, keepdims=True)
    return m


# ------------------------------------------------------------------ skeleton
FINGERS = ('thumb', 'index', 'middle', 'ring', 'pinky')
CC_FINGER = {'thumb': 'Thumb', 'index': 'Index', 'middle': 'Mid', 'ring': 'Ring', 'pinky': 'Pinky'}
BONES = [('pelvis', None, 'CC_Base_Hip'), ('spine_01', 'pelvis', 'CC_Base_Waist'), ('spine_02', 'spine_01', 'CC_Base_Spine01'),
         ('spine_03', 'spine_02', 'CC_Base_Spine02'), ('neck_01', 'spine_03', 'CC_Base_NeckTwist01'), ('Head', 'neck_01', 'CC_Base_Head')]
for s, S in (('l', 'L'), ('r', 'R')):
    BONES += [(f'clavicle_{s}', 'spine_03', f'CC_Base_{S}_Clavicle'), (f'upperarm_{s}', f'clavicle_{s}', f'CC_Base_{S}_Upperarm'),
              (f'lowerarm_{s}', f'upperarm_{s}', f'CC_Base_{S}_Forearm'), (f'hand_{s}', f'lowerarm_{s}', f'CC_Base_{S}_Hand'),
              (f'thigh_{s}', 'pelvis', f'CC_Base_{S}_Thigh'), (f'calf_{s}', f'thigh_{s}', f'CC_Base_{S}_Calf'),
              (f'foot_{s}', f'calf_{s}', f'CC_Base_{S}_Foot'), (f'ball_{s}', f'foot_{s}', f'CC_Base_{S}_ToeBase')]
    for finger in FINGERS:
        BONES += [(f'{finger}_0{k}_{s}', f'{finger}_0{k - 1}_{s}' if k > 1 else f'hand_{s}', f'CC_Base_{S}_{CC_FINGER[finger]}{k}')
                  for k in (1, 2, 3)]
BONE_INDEX = {b[0]: i for i, b in enumerate(BONES)}
assert [b[0] for b in BONES] == glb_json(os.path.join(ROOT, 'assets/footera/models/footera-humans.glb'))['extras']['footera']['bones']
JOINTS = np.array([WN[CCINDEX[b[2]]][:3, 3] for b in BONES])


def aim_point(i):
    name = BONES[i][0]
    if name.startswith(FINGERS):
        k = int(name[-3])
        if k < 3:
            return JOINTS[BONE_INDEX[f'{name[:-3]}{k + 1}_{name[-1]}']]
        return JOINTS[i] + (JOINTS[i] - JOINTS[i - 1]) * .8  # fingertip beyond the last joint
    if name.startswith('hand'):
        return JOINTS[BONE_INDEX['middle_01_' + name[-1]]]
    kids = [k for k, b in enumerate(BONES) if b[1] == name and not b[0].startswith(('thigh', 'clavicle'))]
    return JOINTS[kids[0]] if kids else None


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
    aim = aim_point(i)
    if name == 'Head' or aim is None or q_kid not in Q:
        ROT[i] = ROT[BONE_INDEX[parent]] @ Q[parent][1].T @ q_rot if parent else q_rot
    else:
        ROT[i] = turn(Q[q_kid][0] - q_pos, aim - JOINTS[i]) @ q_rot


def game_bone(cc):
    """Every source joint folds into one Footera bone (twist and share bones
    into their limb, face, jaw, eyes and teeth into the head)."""
    n = cc.replace('CC_Base_', '')
    side = '_l' if n.startswith('L_') else '_r' if n.startswith('R_') else ''
    b = n[2:] if side else n
    if b in ('BoneRoot', 'Hip', 'Pelvis') or cc == '_rootJoint': return 'pelvis'
    if b == 'Waist': return 'spine_01'
    if b == 'Spine01': return 'spine_02'
    if b == 'Spine02': return 'spine_03'
    if b.startswith('NeckTwist'): return 'neck_01'
    if b == 'Clavicle': return 'clavicle' + side
    if b.startswith('Upperarm'): return 'upperarm' + side
    if b.startswith(('Forearm', 'Elbow')): return 'lowerarm' + side
    if b == 'Hand': return 'hand' + side
    for f, c in CC_FINGER.items():
        if b.startswith(c) and b[len(c):].isdigit():
            return f'{f}_0{b[len(c):]}{side}'
    if b.startswith('Thigh'): return 'thigh' + side
    if b.startswith(('Calf', 'Knee')): return 'calf' + side
    if b == 'Foot': return 'foot' + side
    if 'Toe' in b: return 'ball' + side
    return 'Head'


CC_TO_GAME = np.array([BONE_INDEX[game_bone(n)] for n in CCNAME])


def game_weights(m):
    W = np.zeros((len(m['pos']), len(BONES)))
    for k in range(m['j'].shape[1]):
        np.add.at(W, (np.arange(len(W)), CC_TO_GAME[m['j'][:, k]]), m['w'][:, k])
    return W / np.maximum(W.sum(1, keepdims=True), 1e-9)


def top4(W):
    idx = np.argsort(-W, axis=1)[:, :4]
    val = np.take_along_axis(W, idx, 1); val /= np.maximum(val.sum(1, keepdims=True), 1e-8)
    q = np.round(val * 255).astype(np.int32); q[:, 0] += 255 - q.sum(1)
    return idx.astype(np.uint8), q.astype(np.uint8)


# ------------------------------------------------------------------ meshes
SRCM = {m['name']: m['name'] for m in G['meshes']}
mesh_by_mat = {}
for m in G['meshes']:
    mat = G['materials'][m['primitives'][0]['material']]['name']
    mesh_by_mat[mat] = pose(read_mesh(m['name']))
FLOOR = min(mesh_by_mat['Boots']['pos'][:, 1].min(), mesh_by_mat['Std_Skin_Leg']['pos'][:, 1].min())
for m in mesh_by_mat.values():
    m['pos'][:, 1] -= FLOOR
JOINTS[:, 1] -= FLOOR
for m in mesh_by_mat.values():
    m['W'] = game_weights(m)


def drop_unused(m):
    used = np.unique(m['idx']); remap = -np.ones(len(m['pos']), np.int64); remap[used] = np.arange(len(used))
    r = {k: (v[used] if isinstance(v, np.ndarray) and len(v) == len(m['pos']) else v) for k, v in m.items()}
    r['idx'] = remap[m['idx']]; return r


def merge(parts, atlas=None):
    """Concatenate meshes; atlas: per part (u0, v0, scale) into a shared texture."""
    out = {k: [] for k in ('pos', 'nrm', 'uv', 'W', 'idx')}; base = 0
    for n, m in enumerate(parts):
        uv = m['uv'].copy()
        if atlas:
            u0, v0, s = atlas[n]; uv = np.stack([u0 + np.mod(uv[:, 0], 1) * s, v0 + np.mod(uv[:, 1], 1) * s], 1)
        for k in ('pos', 'nrm', 'W'):
            out[k].append(m[k])
        out['uv'].append(uv); out['idx'].append(m['idx'] + base); base += len(m['pos'])
    return {k: np.concatenate(v) for k, v in out.items()}


shirt = mesh_by_mat['T_shirt']; shorts = mesh_by_mat['Classic_Shorts']; boots = mesh_by_mat['Boots']


def cut_below(m, y, keep_above=True):
    """Football cut: drop triangles wholly on the far side of y and move the
    corners that cross it onto the line, for a straight hem."""
    ty = m['pos'][m['idx']][:, :, 1]
    keep = ty.max(1) > y if keep_above else ty.min(1) < y
    m['idx'] = m['idx'][keep]
    m = drop_unused(m)
    if keep_above:
        m['pos'][:, 1] = np.maximum(m['pos'][:, 1], y)
    else:
        m['pos'][:, 1] = np.minimum(m['pos'][:, 1], y)
    return m


# The source wears high-top boots: footballers wear low ones. (The shorts keep
# their length: the source body has no skin on the thighs under them.)
boots = cut_below(boots, JOINTS[BONE_INDEX['foot_l'], 1] + .05, keep_above=False)
SKINS = ['Std_Skin_Head', 'Std_Skin_Body', 'Std_Skin_Arm', 'Std_Skin_Leg']
body = merge([mesh_by_mat[n] for n in SKINS], atlas=[(0, 0, .5), (.5, 0, .5), (0, .5, .5), (.5, .5, .5)])


# Skin hidden under the shirt and shorts never shows and only pokes through
# in motion: a body triangle goes when all its corners sit under the cloth.
def covered_by(cloth, pts, margin):
    hit = np.zeros(len(pts), bool)
    for a in range(0, len(pts), 2048):
        p = pts[a:a + 2048]
        d = np.linalg.norm(p[:, None, :] - cloth['pos'][None, :, :], axis=2)
        k = d.argmin(1); near = d[np.arange(len(p)), k] < margin
        inside = np.einsum('ij,ij->i', p - cloth['pos'][k], cloth['nrm'][k]) < .002
        hit[a:a + 2048] = near & inside
    return hit


SHORTS_HEM = float(shorts['pos'][:, 1].min())
under = covered_by(shirt, body['pos'], .05) | (covered_by(shorts, body['pos'], .05) & (body['pos'][:, 1] > SHORTS_HEM + .025))
Y_KNEE = JOINTS[BONE_INDEX['calf_l'], 1]
BOOT_TOP = boots['pos'][:, 1].max()
in_boot = (body['pos'][:, 1] < BOOT_TOP - .015) & (body['W'][:, [BONE_INDEX['foot_l'], BONE_INDEX['foot_r'], BONE_INDEX['ball_l'], BONE_INDEX['ball_r']]].sum(1) > .5)
gone = (under | in_boot)[body['idx']].all(1)
print(f'skin under kit removed: {gone.sum()} of {len(gone)} triangles')
# Socks (as on the MakeHuman body): a shell 2 mm off the shin, from the boot
# collar to just under the knee, with a straight top edge.
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

# ------------------------------------------------------------------ kit UV
SHIRT_V, SHORTS_V, SOCKS_V = (0., .62), (.64, .86), (.88, 1.)


def band(v, lo_hi):
    return lo_hi[0] + np.clip(v, 0, 1) * (lo_hi[1] - lo_hi[0])


def kit_uv(m, across, top, bottom, rows, centre_z):
    """Per-vertex kit UV, the front half left, the back half right (mirrored,
    so back prints read from behind). Corners are split by facing first."""
    tri = m['idx']; p = m['pos']
    front = p[tri][:, :, 2].mean(1) >= centre_z
    keys = tri * 2 + (~front)[:, None]
    uniq, first, inv = np.unique(keys.ravel(), return_index=True, return_inverse=True)
    src = tri.ravel()[first]; f = front.repeat(3)[first]
    a = np.clip(p[src, 0] / across * .5 + .5, 0, 1)
    u = np.where(f, .5 * a, .5 + .5 * (1 - a)); v = band((top - p[src, 1]) / (top - bottom), rows)
    out = {k: (val[src] if isinstance(val, np.ndarray) and len(val) == len(p) else val) for k, val in m.items()}
    out['uv2'] = m['uv'][src]; out['uv'] = np.stack([u, v], 1).astype(np.float32); out['idx'] = inv.reshape(-1, 3)
    return out


CENTRE_Z = JOINTS[BONE_INDEX['spine_02'], 2]
s_top = float(shirt['pos'][:, 1].max()) + .01; s_bottom = float(shirt['pos'][:, 1].min()) - .01
s_across = float(np.abs(shirt['pos'][:, 0]).max()) + .01
h_top = float(shorts['pos'][:, 1].max()) + .01; h_bottom = float(shorts['pos'][:, 1].min()) - .01
h_across = float(np.abs(shorts['pos'][:, 0]).max()) + .01
shirt_k = kit_uv(shirt, s_across, s_top, s_bottom, SHIRT_V, CENTRE_Z)
shorts_k = kit_uv(shorts, h_across, h_top, h_bottom, SHORTS_V, CENTRE_Z)
socks_k = kit_uv(socks, .3, SOCK_TOP, SOCK_LOW + .02, SOCKS_V, CENTRE_Z)

# ------------------------------------------------------------------ textures


def png(path, size=None, fmt='PNG', quality=88, mode=None):
    im = Image.open(path)
    if size and im.size[0] != size:
        im = im.resize((size, size), Image.LANCZOS)
    if mode:
        a = np.asarray(im.convert('RGBA')).astype(np.float32)
        lum = a[..., :3] @ np.array([.299, .587, .114]); seen = a[..., 3] > 128
        lum = lum / max(1., np.percentile(lum[seen] if seen.any() else lum, 90))
        if mode == 'flat':
            lum = .78 + .35 * (lum - lum[seen].mean()) if seen.any() else lum
        g = np.clip(lum * 255, 0, 255).astype(np.uint8)
        im = Image.fromarray(np.dstack([g, a[..., 3].astype(np.uint8)]), 'LA') if fmt == 'PNG' else Image.fromarray(g, 'L')
    if fmt == 'JPEG':
        im = im.convert('L' if mode else 'RGB')
    b = io.BytesIO(); im.save(b, fmt, quality=quality, optimize=True)
    return b.getvalue(), 'image/png' if fmt == 'PNG' else 'image/jpeg'


TEX = os.path.join(SRC, 'textures')


def atlas(names, suffix, size=1024):
    img = Image.new('RGB', (size, size)); h = size // 2
    for n, (x, y) in zip(names, [(0, 0), (h, 0), (0, h), (h, h)]):
        img.paste(Image.open(os.path.join(TEX, f'{n}_{suffix}.png')).convert('RGB').resize((h, h), Image.LANCZOS), (x, y))
    return img


def enc(img, fmt='JPEG', quality=86):
    b = io.BytesIO(); img.save(b, fmt, quality=quality, optimize=True)
    return b.getvalue(), 'image/jpeg' if fmt == 'JPEG' else 'image/png'


g = GLB()
skin_img = atlas(SKINS, 'baseColor')
skin_tex = g.image(*enc(skin_img))
skin_nrm = g.image(*enc(atlas(SKINS, 'normal'), 'JPEG', 90))
pix = np.asarray(skin_img.resize((64, 64))).reshape(-1, 3).astype(np.float32)
mean = (np.median(pix[pix.sum(1) > 60], 0) / 255).round(3).tolist()

# ------------------------------------------------------------------ assemble


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
for i, (name, parent, _) in enumerate(BONES):
    pw = ROT[BONE_INDEX[parent]] if parent else np.eye(3)
    loc = JOINTS[i] - (JOINTS[BONE_INDEX[parent]] if parent else 0)
    joint_nodes.append(g.node(name=name, translation=(pw.T @ loc).tolist(), rotation=quat(pw.T @ ROT[i])))
for i, (name, parent, _) in enumerate(BONES):
    if parent:
        g.j['nodes'][joint_nodes[BONE_INDEX[parent]]].setdefault('children', []).append(joint_nodes[i])
ibm = np.zeros((len(BONES), 16), np.float32)
for i in range(len(BONES)):
    m = np.eye(4); m[:3, :3] = ROT[i]; m[:3, 3] = JOINTS[i]
    ibm[i] = np.linalg.inv(m).T.ravel()
g.j['skins'] = [{'joints': joint_nodes, 'skeleton': joint_nodes[0], 'inverseBindMatrices': g.accessor(ibm)}]
root = g.node(name='FooteraReal', children=[joint_nodes[0]])
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
    n = g.node(name=name, mesh=g.mesh(name, prim), skin=0)
    g.j['nodes'][root]['children'].append(n)
    return len(m['pos']), len(idx) // 3


stats = {}
stats['FooteraBody'] = add('FooteraBody', body, g.material(name='FooteraSkin', pbrMetallicRoughness={
    'baseColorTexture': {'index': skin_tex}, 'metallicFactor': 0, 'roughnessFactor': .6},
    normalTexture={'index': skin_nrm, 'scale': 1}))
kit_mat = g.material(name='FooteraKit', doubleSided=True, pbrMetallicRoughness={'metallicFactor': 0, 'roughnessFactor': .82},
                     normalTexture={'index': g.image(*png(os.path.join(TEX, 'T_shirt_normal.png'), 512)), 'texCoord': 1})
shorts_mat = g.material(name='FooteraKitShorts', doubleSided=True, pbrMetallicRoughness={'metallicFactor': 0, 'roughnessFactor': .82},
                        normalTexture={'index': g.image(*png(os.path.join(TEX, 'Classic_Shorts_normal.png'), 512)), 'texCoord': 1})
stats['FooteraShirt'] = add('FooteraShirt', shirt_k, kit_mat)
stats['FooteraShorts'] = add('FooteraShorts', shorts_k, shorts_mat)
socks_k.pop('uv2')
stats['FooteraSocks'] = add('FooteraSocks', socks_k, g.material(name='FooteraSocks', pbrMetallicRoughness={'metallicFactor': 0, 'roughnessFactor': .9}))
stats['FooteraBoots'] = add('FooteraBoots', boots, g.material(name='FooteraBoots', pbrMetallicRoughness={
    'baseColorTexture': {'index': g.image(*png(os.path.join(TEX, 'Boots_baseColor.png'), 512, 'JPEG', mode='flat'))},
    'metallicFactor': 0, 'roughnessFactor': .45}, normalTexture={'index': g.image(*png(os.path.join(TEX, 'Boots_normal.png'), 256, 'JPEG'))}))
HAIR = 'ccshort'
stats['FooteraHair-' + HAIR] = add('FooteraHair-' + HAIR, mesh_by_mat['embed_hair_male'], g.material(
    name='Footera-' + HAIR, alphaMode='MASK', alphaCutoff=.3, doubleSided=True,
    pbrMetallicRoughness={'baseColorTexture': {'index': g.image(*png(os.path.join(TEX, 'embed_hair_male_baseColor.png'), 512, mode='tint'))},
                          'metallicFactor': 0, 'roughnessFactor': .78}))
eyes = merge([mesh_by_mat['Std_Eye_L'], mesh_by_mat['Std_Eye_R']])
stats['FooteraEyes'] = add('FooteraEyes', eyes, g.material(name='FooteraEyes', pbrMetallicRoughness={
    'baseColorTexture': {'index': g.image(*png(os.path.join(TEX, 'Std_Eye_L_baseColor.png'), 256, 'JPEG'))},
    'metallicFactor': 0, 'roughnessFactor': .25}))
cornea = merge([mesh_by_mat['Std_Cornea_L'], mesh_by_mat['Std_Cornea_R']])
stats['FooteraCornea'] = add('FooteraCornea', cornea, g.material(name='FooteraCornea', alphaMode='BLEND', pbrMetallicRoughness={
    'baseColorFactor': [1, 1, 1, .08], 'metallicFactor': 0, 'roughnessFactor': .04}))
detail_parts = ['Std_Upper_Teeth', 'Std_Lower_Teeth', 'Std_Tongue', 'Std_Nails']
det = Image.new('RGB', (512, 512))
for n, (x, y) in zip(detail_parts, [(0, 0), (256, 0), (0, 256), (256, 256)]):
    det.paste(Image.open(os.path.join(TEX, f'{n}_baseColor.jpeg')).convert('RGB').resize((256, 256), Image.LANCZOS), (x, y))
detail = merge([mesh_by_mat[n] for n in detail_parts], atlas=[(0, 0, .5), (.5, 0, .5), (0, .5, .5), (.5, .5, .5)])
stats['FooteraDetail'] = add('FooteraDetail', detail, g.material(name='FooteraDetail', pbrMetallicRoughness={
    'baseColorTexture': {'index': g.image(*enc(det, 'JPEG', 84))}, 'metallicFactor': 0, 'roughnessFactor': .4}))
stats['FooteraLashes'] = add('FooteraLashes', mesh_by_mat['Std_Eyelash'], g.material(
    name='FooteraLashes', alphaMode='MASK', alphaCutoff=.5, doubleSided=True, pbrMetallicRoughness={
        'baseColorTexture': {'index': g.image(*png(os.path.join(TEX, 'Std_Eyelash_baseColor.png'), 256, mode='tint'))},
        'metallicFactor': 0, 'roughnessFactor': .8}))



def captain_band():
    """Left upper arm in the bind pose, metres, for the painted captain band."""
    u = JOINTS[BONE_INDEX['upperarm_l']]; d = (JOINTS[BONE_INDEX['lowerarm_l']] - u)[:2]; d /= np.linalg.norm(d)
    return {'shoulder': [round(float(u[0]), 3), round(float(u[1]), 3)], 'dir': [round(float(d[0]), 3), round(float(d[1]), 3)],
            'inner': round(float(u[0]) + .022, 3)}


size = g.save(OUT, extras={'footera': {
    'source': 'Man Player by RiverofCreative, CC-BY-4.0',
    'credit': 'This work is based on "Man Player" (https://sketchfab.com/3d-models/man-player-4c7133dbb06e4136891d59231372d818) by RiverofCreative (https://sketchfab.com/RiverofCreative) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)',
    'morphs': [], 'hair': [HAIR], 'hairFemale': [], 'hairSpecial': [], 'facial': [], 'brows': [],
    'skins': {'light': skin_tex, 'dark': skin_tex}, 'skinMean': {'light': mean, 'dark': mean},
    'bones': [b[0] for b in BONES], 'kitBands': {'shirt': SHIRT_V, 'shorts': SHORTS_V, 'socks': SOCKS_V},
    'captainBand': captain_band(),
    'kitMetres': {'shirt': [round(s_across, 3), round(s_top, 3), round(s_bottom, 3)],
                  'shorts': [round(h_across, 3), round(h_top, 3), round(h_bottom, 3)]}}})
print(f'wrote {OUT}: {size / 1e6:.2f} MB')
for k, (v, t) in stats.items():
    print(f'  {k}: {v} verts, {t} tris')
