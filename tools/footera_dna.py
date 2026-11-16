"""Reader for MetaHuman DNA files (authoring only), as written by the
MetaHuman Creator DCC export of Unreal Engine 5.6+ (head.dna, body.dna).

Big-endian. Header: 'DNA', u16 generation, u16 version, u32 section count,
then per section a 4-char tag, u16 version x2, u32 offset, u32 size. The
sections used here ('defn' and 'geom') keep the layout of Epic's DNACalib
(RawDefinition, RawMesh): strings and arrays are u32 count + data, vectors
of three floats are stored as three arrays (xs, ys, zs).

Joint transforms are local: translation in the parent's frame (centimetres),
rotation as XYZ Euler degrees; the root turns the Z-up rig to Y-up, so world
positions come out Y-up in centimetres like the meshes.
"""
import struct
import numpy as np


class _R:
    def __init__(self, d, p):
        self.d = d; self.p = p

    def u16(self):
        v = struct.unpack_from('>H', self.d, self.p)[0]; self.p += 2; return v

    def u32(self):
        v = struct.unpack_from('>I', self.d, self.p)[0]; self.p += 4; return v

    def arr(self, fmt, size):
        n = self.u32(); a = np.frombuffer(self.d, dtype='>' + fmt, count=n, offset=self.p).astype(fmt); self.p += n * size
        return a

    def f32s(self): return self.arr('f4', 4)
    def u16s(self): return self.arr('u2', 2)
    def u32s(self): return self.arr('u4', 4)

    def text(self):
        n = self.u32(); v = self.d[self.p:self.p + n].decode(); self.p += n; return v

    def texts(self): return [self.text() for _ in range(self.u32())]
    def v3(self): return np.stack([self.f32s(), self.f32s(), self.f32s()], 1)


def sections(d):
    assert d[:3] == b'DNA', 'not a DNA file'
    n = struct.unpack('>I', d[7:11])[0]; out = {}
    for i in range(n):
        p = 11 + 16 * i; out[d[p:p + 4].decode()] = struct.unpack('>HHII', d[p + 4:p + 16])[2:]
    return out


def _lodmap(r):
    return r.u16s(), [r.u16s() for _ in range(r.u32())]


def euler(e):
    x, y, z = np.radians(e)
    rx = np.array([[1, 0, 0], [0, np.cos(x), -np.sin(x)], [0, np.sin(x), np.cos(x)]])
    ry = np.array([[np.cos(y), 0, np.sin(y)], [0, 1, 0], [-np.sin(y), 0, np.cos(y)]])
    rz = np.array([[np.cos(z), -np.sin(z), 0], [np.sin(z), np.cos(z), 0], [0, 0, 1]])
    return rz @ ry @ rx


class DNA:
    def __init__(self, path):
        d = open(path, 'rb').read(); s = sections(d)
        r = _R(d, s['defn'][0])
        for _ in range(4):
            _lodmap(r)
        r.texts(); r.texts()         # gui and raw control names
        self.joints = r.texts(); self.blend_shapes = r.texts(); self.animated_maps = r.texts(); self.mesh_names = r.texts()
        r.u16s(); r.u16s()           # mesh -> blend shape channel mapping
        self.parent = r.u16s().astype(int); t = r.v3(); e = r.v3()
        n = len(self.joints); self.world = np.zeros((n, 4, 4))
        for i in range(n):
            m = np.eye(4); m[:3, :3] = euler(e[i]); m[:3, 3] = t[i]
            self.world[i] = m if self.parent[i] == i else self.world[self.parent[i]] @ m
        self.d = d; self.geom = s['geom'][0]; self._meshes = None

    def meshes(self):
        """Every mesh in file order: positions, uvs and normals are indexed by
        per-corner layouts; faces are polygons of layout indices."""
        if self._meshes is None:
            r = _R(self.d, self.geom); out = []
            for _ in range(r.u32()):
                r.u32()                    # end offset (relative), unused
                m = {'pos': r.v3()}; m['uv'] = np.stack([r.f32s(), r.f32s()], 1); m['nrm'] = r.v3()
                m['lp'] = r.u32s(); m['lt'] = r.u32s(); m['ln'] = r.u32s()
                m['faces'] = [r.u32s() for _ in range(r.u32())]
                m['maxinf'] = r.u16()
                m['skin'] = [(r.f32s(), r.u16s()) for _ in range(r.u32())]
                for _ in range(r.u32()):   # blend shape targets (none in a joints-only rig)
                    r.v3(); r.u32s(); r.u16()
                out.append(m)
            self._meshes = dict(zip(self.mesh_names, out))
        return self._meshes

    def mesh(self, name):
        """One mesh unwelded per layout (corner): pos/nrm in metres, uv with
        v flipped for glTF, dense joint weights over this file's joints."""
        m = self.meshes()[name]
        lp, lt, ln = m['lp'], m['lt'], m['ln']
        tris = []
        for f in m['faces']:
            for k in range(1, len(f) - 1):
                tris.append((f[0], f[k], f[k + 1]))
        W = np.zeros((len(m['pos']), len(self.joints)), np.float32)
        for v, (w, j) in enumerate(m['skin']):
            W[v, j] = w
        uv = m['uv'][lt].astype(np.float32); uv[:, 1] = 1 - uv[:, 1]
        nrm = m['nrm'][ln].astype(np.float64); nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
        return {'pos': m['pos'][lp].astype(np.float64) / 100, 'nrm': nrm, 'uv': uv, 'Wsrc': W[lp], 'vid': lp,
                'idx': np.array(tris, np.int64)}
