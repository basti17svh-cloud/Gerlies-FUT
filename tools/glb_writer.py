"""Minimal glTF 2.0 binary writer for the Footera human builder (authoring only)."""
import json, struct
import numpy as np

FLOAT, USHORT, UINT, UBYTE, SHORT = 5126, 5123, 5125, 5121, 5122
_TYPES = {1: 'SCALAR', 2: 'VEC2', 3: 'VEC3', 4: 'VEC4', 16: 'MAT4'}
_CT = {np.float32: FLOAT, np.uint16: USHORT, np.uint32: UINT, np.uint8: UBYTE, np.int16: SHORT}


class GLB:
    def __init__(self):
        self.j = {'asset': {'version': '2.0', 'generator': 'Footera build-footera-humans'},
                  'scenes': [{'nodes': []}], 'scene': 0, 'nodes': [], 'meshes': [],
                  'accessors': [], 'bufferViews': [], 'buffers': [{'byteLength': 0}],
                  'materials': [], 'textures': [], 'images': [], 'samplers': [
                      {'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]}
        self.bin = bytearray()

    def _view(self, data, target=None):
        while len(self.bin) % 4:
            self.bin += b'\0'
        view = {'buffer': 0, 'byteOffset': len(self.bin), 'byteLength': len(data)}
        if target:
            view['target'] = target
        self.bin += data
        self.j['bufferViews'].append(view)
        return len(self.j['bufferViews']) - 1

    def accessor(self, arr, target=None, normalized=False, minmax=False):
        arr = np.ascontiguousarray(arr)
        comps = 1 if arr.ndim == 1 else arr.shape[1]
        acc = {'bufferView': self._view(arr.tobytes(), target), 'componentType': _CT[arr.dtype.type],
               'count': int(arr.shape[0]), 'type': _TYPES[comps]}
        if normalized:
            acc['normalized'] = True
        if minmax:
            a = arr.reshape(arr.shape[0], -1)
            acc['min'] = a.min(0).tolist(); acc['max'] = a.max(0).tolist()
        self.j['accessors'].append(acc)
        return len(self.j['accessors']) - 1

    def sparse_accessor(self, delta, count):
        """Morph target delta stored sparsely (only moved vertices)."""
        moved = np.where(np.abs(delta).max(1) > 2e-4)[0].astype(np.uint32)  # under 0.2 mm is invisible
        vals = np.ascontiguousarray(delta[moved].astype(np.float32))
        acc = {'componentType': FLOAT, 'count': int(count), 'type': 'VEC3',
               'min': (vals.min(0) if len(vals) else np.zeros(3)).tolist(),
               'max': (vals.max(0) if len(vals) else np.zeros(3)).tolist()}
        if len(moved):
            acc['sparse'] = {'count': int(len(moved)),
                             'indices': {'bufferView': self._view(moved.tobytes()), 'componentType': UINT},
                             'values': {'bufferView': self._view(vals.tobytes())}}
        self.j['accessors'].append(acc)
        return len(self.j['accessors']) - 1

    def image(self, data, mime):
        self.j['images'].append({'bufferView': self._view(data), 'mimeType': mime})
        self.j['textures'].append({'source': len(self.j['images']) - 1, 'sampler': 0})
        return len(self.j['textures']) - 1

    def material(self, **m):
        self.j['materials'].append(m)
        return len(self.j['materials']) - 1

    def node(self, **n):
        self.j['nodes'].append(n)
        return len(self.j['nodes']) - 1

    def mesh(self, name, prim, morph_names=None):
        m = {'name': name, 'primitives': [prim]}
        if morph_names:
            m['extras'] = {'targetNames': morph_names}
            m['weights'] = [0.0] * len(morph_names)
        self.j['meshes'].append(m)
        return len(self.j['meshes']) - 1

    def save(self, path, extras=None):
        if extras:
            self.j['extras'] = extras
        while len(self.bin) % 4:
            self.bin += b'\0'
        self.j['buffers'][0]['byteLength'] = len(self.bin)
        for k in ('textures', 'images', 'materials'):
            if not self.j[k]:
                del self.j[k]
        js = json.dumps(self.j, separators=(',', ':')).encode()
        while len(js) % 4:
            js += b' '
        total = 12 + 8 + len(js) + 8 + len(self.bin)
        with open(path, 'wb') as f:
            f.write(struct.pack('<III', 0x46546C67, 2, total))
            f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
            f.write(struct.pack('<II', len(self.bin), 0x004E4942)); f.write(self.bin)
        return total
