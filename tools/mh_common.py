"""Readers for the MakeHuman 1.x system assets (CC0) as packaged in the npm
module `makehuman-data` (three.js JSON format 3.1 + a dense Int16 target bin).
Used only by tools/build-footera-humans.py at authoring time; nothing here
ships to players."""
import json, os
import numpy as np


def load_json(path):
    with open(path) as f:
        return json.load(f)


def parse_faces(model):
    """Return (tris[N,3], tri_uvs[N,3], tri_material[N]) from three.js JSON 3.1 faces.
    Quads are split into two triangles."""
    faces = model['faces']
    n_uv_layers = len(model.get('uvs') or [])
    tris, tuv, tmat = [], [], []
    i = 0
    while i < len(faces):
        t = faces[i]; i += 1
        quad = t & 1; has_mat = t & 2; face_uv = t & 4; vert_uv = t & 8
        face_n = t & 16; vert_n = t & 32; face_c = t & 64; vert_c = t & 128
        nv = 4 if quad else 3
        v = faces[i:i + nv]; i += nv
        mat = 0
        if has_mat:
            mat = faces[i]; i += 1
        uv = None
        if face_uv:
            i += n_uv_layers
        if vert_uv:
            uv = faces[i:i + nv]  # first layer only
            i += nv * n_uv_layers
        if face_n: i += 1
        if vert_n: i += nv
        if face_c: i += 1
        if vert_c: i += nv
        uv = uv or [0] * nv
        if quad:
            tris += [[v[0], v[1], v[3]], [v[1], v[2], v[3]]]
            tuv += [[uv[0], uv[1], uv[3]], [uv[1], uv[2], uv[3]]]
            tmat += [mat, mat]
        else:
            tris.append(v); tuv.append(uv); tmat.append(mat)
    return np.array(tris, np.int32), np.array(tuv, np.int32), np.array(tmat, np.int32)


class Targets:
    """Dense MakeHuman targets: alphabetical by path, nb_vertices*3 Int16, x1e-3."""
    def __init__(self, root, n_vertices):
        names = sorted(load_json(os.path.join(root, 'src/json/targets/target-list.json'))['targets'].keys())
        self.index = {n.replace('data/targets/', '').replace('.target', ''): k for k, n in enumerate(names)}
        self.data = np.memmap(os.path.join(root, 'public/data/targets/targets.bin'), dtype='<i2', mode='r')
        self.n = n_vertices
        assert self.data.size == len(names) * n_vertices * 3, 'unexpected targets.bin size'

    def delta(self, name):
        k = self.index[name]
        m = self.n * 3
        return np.asarray(self.data[k * m:(k + 1) * m], np.float32).reshape(-1, 3) * 1e-3

    def names(self, prefix=''):
        return [n for n in self.index if n.startswith(prefix)]
