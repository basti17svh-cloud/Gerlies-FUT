"""Minimal glTF 2.0 binary reader for the Footera builders (authoring only):
accessors (sparse too), meshes with morph targets, skin weights and images."""
import json, struct
import numpy as np

_CT = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8, 5122: np.int16, 5120: np.int8}
_NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


class GLBRead:
    def __init__(self, path):
        b = open(path, 'rb').read(); n = struct.unpack('<I', b[12:16])[0]
        self.j = json.loads(b[20:20 + n]); self.bin = b[20 + n + 8:]

    def view(self, i):
        v = self.j['bufferViews'][i]; o = v.get('byteOffset', 0)
        return self.bin[o:o + v['byteLength']]

    def acc(self, i):
        a = self.j['accessors'][i]; dt = _CT[a['componentType']]; n = _NC[a['type']]
        if 'bufferView' in a:
            raw = self.view(a['bufferView'])[a.get('byteOffset', 0):]
            out = np.frombuffer(raw, dt, count=a['count'] * n).reshape(a['count'], n).copy()
        else:
            out = np.zeros((a['count'], n), dt)
        if 'sparse' in a:
            s = a['sparse']; ix = np.frombuffer(self.view(s['indices']['bufferView']), _CT[s['indices']['componentType']], count=s['count'])
            out[ix] = np.frombuffer(self.view(s['values']['bufferView']), dt, count=s['count'] * n).reshape(-1, n)
        if a.get('normalized'):
            out = out.astype(np.float32) / np.iinfo(dt).max
        return out

    def mesh(self, name):
        m = next(m for m in self.j['meshes'] if m['name'] == name); p = m['primitives'][0]; at = p['attributes']
        w = self.acc(at['WEIGHTS_0']).astype(np.float64); w /= np.maximum(w.sum(1, keepdims=True), 1e-9)
        out = {'pos': self.acc(at['POSITION']).astype(np.float64), 'nrm': self.acc(at['NORMAL']).astype(np.float64),
               'uv': self.acc(at['TEXCOORD_0']).astype(np.float32), 'j': self.acc(at['JOINTS_0']).astype(np.int64), 'w': w,
               'idx': self.acc(p['indices']).reshape(-1, 3).astype(np.int64), 'material': self.j['materials'][p['material']],
               'morph_names': m.get('extras', {}).get('targetNames', [])}
        out['morphs'] = [self.acc(t['POSITION']).astype(np.float64) for t in p.get('targets', [])]
        return out

    def image(self, texture):
        im = self.j['images'][self.j['textures'][texture]['source']]
        return self.view(im['bufferView']), im['mimeType']

    def names(self):
        return [m['name'] for m in self.j['meshes']]
