#!/usr/bin/env python3
"""Footera Player Evolution 2.0, Step 2: build the independent master GLB.

Uses Footera's existing licensed MetaHuman export as an anatomical reference.
This is a visibly remodeled/finished derivative, NOT a new facial likeness or
a replacement of the original DNA mesh. The original stays byte-for-byte intact.
No downloading external models, and no change to the live 3D pipeline.

Usage:
    python3 tools/build-player-evolution-master.py
    python3 tools/build-player-evolution-master.py source.glb output.glb
"""
import copy
import hashlib
import json
import math
import os
import struct
import sys

import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SOURCE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'assets/footera/models/footera-metahuman.glb')
OUTPUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'assets/footera/models/footera-evolution-master.glb')
TYPES = {5126: np.float32, 5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5122: np.int16}
COMPS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def read_glb(path):
    data = open(path, 'rb').read()
    if len(data) < 28 or struct.unpack_from('<III', data, 0) != (0x46546C67, 2, len(data)):
        raise ValueError('Source is not a valid glTF 2.0 GLB')
    n, kind = struct.unpack_from('<II', data, 12)
    if kind != 0x4e4f534a:
        raise ValueError('Missing GLB JSON chunk')
    meta = json.loads(data[20:20+n])
    offset = 20 + n
    bsize, bkind = struct.unpack_from('<II', data, offset)
    if bkind != 0x004e4942:
        raise ValueError('Missing GLB binary chunk')
    binary = bytearray(data[offset+8:offset+8+bsize])
    return meta, binary


def accessor(meta, binary, index):
    acc = meta['accessors'][index]
    if 'sparse' in acc or 'bufferView' not in acc:
        raise ValueError('Only dense vertex data can be remodeled: accessor '+str(index))
    view = meta['bufferViews'][acc['bufferView']]
    if 'byteStride' in view:
        raise ValueError('Interleaved vertex geometry requires a separate pipeline')
    dtype = TYPES[acc['componentType']]
    count = acc['count'] * COMPS[acc['type']]
    offset = view.get('byteOffset', 0) + acc.get('byteOffset', 0)
    array = np.frombuffer(binary, dtype=dtype, count=count, offset=offset)
    return array.reshape(acc['count'], COMPS[acc['type']]), acc


def gaussian(y, mid, width):
    return np.exp(-0.5*((y-mid)/width)**2)


def sculpt(name, pos, normals):
    # Subtle athletic sculpt, common to skin and fitted clothing to keep the
    # body's surface coherent. The head/face and hands are not deformed.
    p = pos.astype(np.float64, copy=True)
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    torso = gaussian(y, 1.30, .20) * np.clip((.45-np.abs(x))/.20, 0, 1)
    # Athletic rib cage and relaxed upper torso, not ballooned shoulders.
    chest = .015*torso + .009*gaussian(y, 1.45, .10)
    waist = -.013*gaussian(y, 1.03, .10)
    hip = .011*gaussian(y, .93, .09)
    quad = .018*gaussian(y, .69, .10) * (np.abs(x) > .06)
    calf = .011*gaussian(y, .34, .10) * (np.abs(x) > .05)
    radial = chest + waist + hip + quad + calf
    radial *= np.clip((1.70-y)/.12, 0, 1) * np.clip((y-.16)/.11, 0, 1)
    p[:, 0] += x*radial
    p[:, 2] += z*radial
    if name == 'FooteraShirt':
        # Small authored geometric fabric creases; 1-3 mm amplitude, not
        # noisy skin or an unstable real-time soft-body solver.
        waves = (np.sin(y*35 + x*19 + z*9) +
                 .38*np.sin(y*70 - x*23))
        attenuation = np.clip((1.57-y)/.24, 0, 1) * np.clip((y-.99)/.10, 0, 1)
        p += normals.astype(np.float64)*(.00165*waves*attenuation)[:, None]
    elif name == 'FooteraShorts':
        folds = np.sin(y*49 + x*28 + z*10)
        attenuation = np.clip((.97-y)/.12, 0, 1) * np.clip((y-.58)/.10, 0, 1)
        p += normals.astype(np.float64)*(.0016*folds*attenuation)[:, None]
    return p.astype(np.float32)


def normalize_weights(joints, weights):
    # One joint must never reference an unbound index. Keep the ORIGINAL bone
    # assignments – they were retargeted from MetaHuman's joint weights.
    w = weights.astype(np.float64)
    if weights.dtype == np.uint8:
        w /= 255.
    elif weights.dtype != np.float32:
        raise ValueError('Unsupported skin weight format '+str(weights.dtype))
    if not np.isfinite(w).all() or (w < 0).any():
        raise ValueError('Invalid skin weights')
    norm = np.maximum(w.sum(1), 1e-8)
    if (norm < .1).any():
        raise ValueError('Vertices without skinning influence')
    w /= norm[:, None]
    if weights.dtype == np.uint8:
        q = np.round(w*255).astype(np.int16)
        delta = 255-q.sum(axis=1)
        q[np.arange(len(q)), np.argmax(q, axis=1)] += delta
        return np.clip(q, 0, 255).astype(np.uint8)
    return w.astype(np.float32)


def write_glb(meta, binary, out):
    meta['buffers'][0]['byteLength'] = len(binary)
    js = json.dumps(meta, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    js += b' ' * ((-len(js)) % 4)
    binary += b'\0' * ((-len(binary)) % 4)
    total = 12 + 8 + len(js) + 8 + len(binary)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4e4f534a))
        f.write(js)
        f.write(struct.pack('<II', len(binary), 0x004e4942))
        f.write(binary)


def build():
    meta, binary = read_glb(SOURCE)
    names = {mesh['name']: mesh for mesh in meta['meshes']}
    required = ['FooteraBody', 'FooteraShirt', 'FooteraShorts',
                'FooteraSocks', 'FooteraBoots', 'FooteraEyes']
    for name in required:
        if name not in names:
            raise ValueError('Missing MetaHuman surface: '+name)
    bones = meta.get('extras', {}).get('footera', {}).get('bones', [])
    if len(bones) != 52:
        raise ValueError('Expected the existing Footera 52-bone production contract')
    if len(set(bones)) != len(bones):
        raise ValueError('Duplicate source bones')
    if meta.get('extensionsRequired') and any(e not in ['KHR_mesh_quantization'] for e in meta['extensionsRequired']):
        raise ValueError('Unexpected compressed geometry extension')
    report = {'meshes': {}, 'source': os.path.basename(SOURCE),
              'source_sha256': hashlib.sha256(open(SOURCE, 'rb').read()).hexdigest()}
    modified = ['FooteraBody', 'FooteraShirt', 'FooteraShorts', 'FooteraSocks']
    for name in required:
        mesh = names[name]
        primitive = mesh['primitives'][0]
        attrs = primitive['attributes']
        joints, _ = accessor(meta, binary, attrs['JOINTS_0'])
        weights, _ = accessor(meta, binary, attrs['WEIGHTS_0'])
        if (joints >= len(meta['skins'][0]['joints'])).any():
            raise ValueError('Out-of-range joint index in '+name)
        before = weights.copy()
        weights[:] = normalize_weights(joints, weights)
        positions, pos_acc = accessor(meta, binary, attrs['POSITION'])
        triangles = len(accessor(meta, binary, primitive['indices'])[0])//3
        if name in modified:
            normals, _ = accessor(meta, binary, attrs['NORMAL'])
            original = positions.copy()
            positions[:] = sculpt(name, positions, normals)
            pos_acc['min'] = positions.min(0).astype(float).tolist()
            pos_acc['max'] = positions.max(0).astype(float).tolist()
            displacement = np.linalg.norm(positions-original, axis=1)
        else:
            displacement = np.zeros(len(positions))
        report['meshes'][name] = {
            'vertices': int(len(positions)), 'triangles': int(triangles),
            'vertices_sculpted': int((displacement > .0001).sum()),
            'maximum_sculpt_mm': round(float(displacement.max())*1000, 2),
            'weights_corrected': int(np.any(before != weights, axis=1).sum())}
        if not np.isfinite(positions).all() or (weights.sum(axis=1) == 0).any():
            raise ValueError('Invalid generated surface: '+name)
    for name, roughness in [('FooteraSkin', .59), ('FooteraKit', .76),
                            ('FooteraKitShorts', .83), ('FooteraSocks', .88)]:
        for mat in meta.get('materials', []):
            if mat.get('name') == name:
                mat.setdefault('pbrMetallicRoughness', {})['roughnessFactor'] = roughness
    meta['asset']['generator'] = 'Footera Player Evolution 2.0 – Master Sculpt v0.1'
    extra = meta.setdefault('extras', {}).setdefault('footera', {})
    extra['evolution'] = {
        'version': '2.0-step2-master-01',
        'type': 'independent-master-derived-from-authorized-Footera-MetaHuman',
        'model': 'athletic-men-master',
        'bones': 52, 'model_format': 'GLB 2.0',
        'procedures': ['athletic-mesh-sculpt', 'fabric-crease-geometry',
                       'skin-weight-normalization', 'PBR-fabric-materials'],
        'source_sha256': report['source_sha256']}
    if not extra.get('credit') or not extra.get('metahuman'):
        raise ValueError('Asset provenance must be preserved')
    write_glb(meta, binary, OUTPUT)
    again, _ = read_glb(OUTPUT)
    assert again['extras']['footera']['evolution']['bones'] == 52
    assert hashlib.sha256(open(OUTPUT, 'rb').read()).hexdigest() != report['source_sha256']
    report['output_bytes'] = os.path.getsize(OUTPUT)
    report['output_sha256'] = hashlib.sha256(open(OUTPUT, 'rb').read()).hexdigest()
    print(json.dumps(report, indent=2))
    return report


if __name__ == '__main__':
    build()
