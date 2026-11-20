#!/usr/bin/env python3
"""Prototype 60-joint Footera rig from the isolated Step-2 master.

Adds 8 real skinning twist joints without reparenting any of the original
52 animation joints. Expands inverse-bind matrices and redistributes selected
limb vertex influences. Original master GLB remains byte-identical.

This is NOT the live exporter. Review the physical deformation tests and
the new model's appearance before shipping anything.
"""
import hashlib
import json
import os
import struct
import sys

import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'assets/footera/models/footera-evolution-master.glb')
DST = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'assets/footera/models/footera-evolution-twist-prototype.glb')
PAIRS = [('upperarm', 'lowerarm'), ('lowerarm', 'hand'), ('thigh', 'calf'), ('calf', 'foot')]
PARTS = ['FooteraBody', 'FooteraShirt', 'FooteraShorts', 'FooteraSocks']
DT = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32, 5122: np.int16}
COMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def read_glb(path):
    b = open(path, 'rb').read()
    magic, version, length = struct.unpack_from('<III', b, 0)
    if (magic, version, length) != (0x46546c67, 2, len(b)):
        raise ValueError('Invalid GLB 2.0')
    size, kind = struct.unpack_from('<II', b, 12)
    if kind != 0x4e4f534a:
        raise ValueError('GLB JSON chunk not found')
    obj = json.loads(b[20:20+size])
    offset = 20+size
    bin_len, bin_kind = struct.unpack_from('<II', b, offset)
    if bin_kind != 0x004e4942:
        raise ValueError('GLB binary chunk not found')
    return obj, bytearray(b[offset+8:offset+8+bin_len]), b


def array_at(j, blob, index):
    acc = j['accessors'][index]
    if acc.get('sparse') or 'bufferView' not in acc:
        raise ValueError('Unsupported sparse base attribute: '+str(index))
    v = j['bufferViews'][acc['bufferView']]
    if v.get('byteStride'):
        raise ValueError('Interleaved buffer not supported')
    dtype = DT[acc['componentType']]
    n = COMP[acc['type']]
    offset = v.get('byteOffset', 0)+acc.get('byteOffset', 0)
    return np.frombuffer(blob, dtype=dtype, count=acc['count']*n, offset=offset).reshape(-1, n).copy(), acc


def append_array(j, blob, arr, component_type, kind, normalized=False, target=None):
    arr = np.ascontiguousarray(arr)
    while len(blob)%4:
        blob.append(0)
    view = {'buffer':0,'byteOffset':len(blob),'byteLength':arr.nbytes}
    if target is not None:
        view['target'] = target
    blob.extend(arr.tobytes())
    j['bufferViews'].append(view)
    acc = {'bufferView':len(j['bufferViews'])-1,'componentType':component_type,
           'count':int(arr.shape[0]),'type':kind}
    if normalized:
        acc['normalized'] = True
    j['accessors'].append(acc)
    return len(j['accessors'])-1


def local_matrix(node):
    if 'matrix' in node:
        return np.asarray(node['matrix'],np.float64).reshape(4,4).T
    x,y,z,w = node.get('rotation',[0,0,0,1])
    r = np.array([
      [1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
      [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
      [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]
    ], dtype=np.float64)
    scale = np.array(node.get('scale',[1,1,1]))
    out=np.eye(4)
    out[:3,:3]=r*scale
    out[:3,3]=node.get('translation',[0,0,0])
    return out


def world_matrices(nodes):
    parents={}
    for i,node in enumerate(nodes):
        for child in node.get('children',[]):
            if child in parents:
                raise ValueError('Duplicate skeleton parent')
            parents[child]=i
    cache={}
    def world(i):
        if i not in cache:
            cache[i] = (world(parents[i]) if i in parents else np.eye(4)) @ local_matrix(nodes[i])
        return cache[i]
    return [world(i) for i in range(len(nodes))]


def modify_weights(pos, weights, joints, descriptors):
    initial=weights.copy()
    if weights.dtype == np.uint8:
        w=weights.astype(np.float64)/255.0
    elif weights.dtype == np.float32:
        w=weights.astype(np.float64)
    else:
        raise ValueError('Unsupported weights '+str(weights.dtype))
    idx=joints.astype(np.int64)
    affected={d['name']:0 for d in descriptors}
    # The source contract uses four influences per vertex. Never truncate a
    # strong unrelated influence to make room for a twist bone.
    for d in descriptors:
        a,b=d['segment']
        vector=b-a
        length=float(np.linalg.norm(vector))
        if length<.02:
            raise ValueError('Zero-length twist segment: '+d['name'])
        direction=vector/length
        progress=((pos-a)@direction)/length
        distance=np.linalg.norm((pos-a)-((pos-a)@direction)[:,None]*direction,axis=1)
        fade=np.clip((progress-.12)/.73,0,1)
        fade=fade*fade*(3-2*fade)
        parent_slots=np.where(idx==d['parent_skin_index'],w,0.)
        primary=parent_slots.max(axis=1)>.07
        # MetaHuman's authored pivot axes are not centered in the fitted
        # garment volume. Prefer vertices ACTUALLY weighted to this bone over
        # an unrealistically tight fixed-radius heuristic.
        local=primary&(progress>.08)&(progress<1.08)
        if np.any(local):
            adaptive=min(max(d['radius'],float(np.percentile(distance[local],85))*1.08),
                         .34 if 'thigh' in d['name'] or 'calf' in d['name'] else .25)
        else:
            adaptive=d['radius']
        candidate=np.where(local&(distance<adaptive))[0]
        if len(candidate)==0:
            print('Twist diagnostic',d['name'],'parent-vertices',int(primary.sum()),
                  'projected',int(local.sum()),'length',round(length,4),
                  'progress-range',[round(float(np.min(progress[primary])),2),
                                    round(float(np.max(progress[primary])),2)] if np.any(primary) else None,
                  file=sys.stderr)
        for vi in candidate:
            slots=np.where(idx[vi]==d['parent_skin_index'])[0]
            if len(slots)==0: continue
            parent=int(slots[np.argmax(w[vi,slots])])
            if w[vi,parent]<.07:
                continue
            transfer=float(w[vi,parent] * .47 * fade[vi])
            if transfer<.009:
                continue
            other=[s for s in range(4) if s!=parent]
            unused=[s for s in other if w[vi,s]<1e-7]
            if unused:
                slot=unused[0]
            else:
                slot=min(other,key=lambda s: w[vi,s])
                if w[vi,slot]>.015 or transfer<w[vi,slot]*2:
                    continue
                # Account for tiny discarded weight by merging into parent.
                w[vi,parent] += w[vi,slot]
            w[vi,parent] -= transfer
            w[vi,slot] = transfer
            idx[vi,slot] = d['twist_skin_index']
            affected[d['name']]+=1
    w /= np.maximum(w.sum(axis=1,keepdims=True),1e-8)
    if weights.dtype == np.uint8:
        q=np.floor(w*255+.5).astype(np.int16)
        delta=255-q.sum(axis=1)
        q[np.arange(len(q)),np.argmax(q,axis=1)] += delta
        if q.min()<0 or q.max()>255: raise ValueError('Invalid packed weights')
        weights_out=q.astype(np.uint8)
    else:
        weights_out=w.astype(np.float32)
    if np.max(idx)>np.iinfo(joints.dtype).max:
        raise ValueError('Joint indices exceed component type')
    if not np.allclose(weights_out.sum(axis=1),
        255 if weights.dtype==np.uint8 else 1,atol=1e-4):
        raise ValueError('Weights not normalized')
    return idx.astype(joints.dtype),weights_out,affected,int(np.any(initial!=weights_out,axis=1).sum())


def build():
    j,blob,source=read_glb(SRC)
    orig=j['extras']['footera']['bones']
    if len(orig)!=52 or len(set(orig))!=52:
        raise ValueError('Expected the original 52-bone export')
    skins=j.get('skins')
    if not skins or len(skins)!=1:
        raise ValueError('Expected one shared Footera skin')
    skin=skins[0]
    originals=list(skin['joints'])
    if [j['nodes'][i]['name'] for i in originals]!=orig:
        raise ValueError('Skin bone order does not match Footera')
    nodes=j['nodes']
    original_world=world_matrices(nodes)
    ibm,old_acc=array_at(j,blob,skin['inverseBindMatrices'])
    if len(ibm)!=52 or old_acc['componentType']!=5126:
        raise ValueError('Invalid inverse bind matrices')
    bone_id={name:originals[i] for i,name in enumerate(orig)}
    descriptors=[]
    new_ibm=[]
    for side in 'lr':
        for parent,child in PAIRS:
            p, c=parent+'_'+side,child+'_'+side
            parent_idx,child_idx=bone_id[p],bone_id[c]
            pworld=original_world[parent_idx]
            cworld=original_world[child_idx]
            start=pworld[:3,3].copy()
            stop=cworld[:3,3].copy()
            offset=np.linalg.inv(pworld) @ np.append(start+(stop-start)*.55,1.)
            twist_name=parent+'_twist_'+side
            twist_id=len(nodes)
            nodes.append({'name':twist_name,'translation':offset[:3].round(9).tolist()})
            nodes[parent_idx].setdefault('children',[]).append(twist_id)
            bind=pworld@local_matrix(nodes[twist_id])
            new_ibm.append(np.linalg.inv(bind).T.ravel().astype(np.float32))
            skin['joints'].append(twist_id)
            descriptors.append({'name':twist_name,'segment':(start,stop),
              'parent_skin_index':orig.index(p),
              'twist_skin_index':len(skin['joints'])-1,
              'radius': .24 if parent in ('thigh','calf') else .18})
    matrices=np.vstack([ibm.astype(np.float32),np.array(new_ibm,dtype=np.float32)])
    skin['inverseBindMatrices']=append_array(j,blob,matrices,5126,'MAT4')
    report={'source_sha256':hashlib.sha256(source).hexdigest(),'bones_before':52,
            'bones_after':60,'twist_influence_vertices':{},'mesh_weight_changes':{}}
    for mesh in j['meshes']:
        name=mesh['name']
        if name not in PARTS: continue
        p=mesh['primitives'][0]
        at=p['attributes']
        if not all(k in at for k in ('POSITION','JOINTS_0','WEIGHTS_0')):
            raise ValueError('Incomplete skinned mesh '+name)
        pos,_=array_at(j,blob,at['POSITION'])
        joints,ja=array_at(j,blob,at['JOINTS_0'])
        weights,wa=array_at(j,blob,at['WEIGHTS_0'])
        # Read-only provenance diagnostics: diagnose source bone/mesh misalignment.
        basew=weights.astype(np.float64)/(255 if weights.dtype==np.uint8 else 1)
        for d in descriptors:
            weights_for_bone=np.where(joints==d['parent_skin_index'],basew,0).max(1)
            mask=weights_for_bone>.07
            if mask.any():
                a,b=d['segment'];vec=b-a;length=float(np.linalg.norm(vec))
                proj=((pos[mask]-a)@vec)/(length*length)
                vals=np.percentile(proj,[0,25,50,75,100])
                center=pos[mask].mean(0).round(3).tolist()
                print('SKIN_SOURCE',name,d['name'],'joint',a.round(3).tolist(),'end',b.round(3).tolist(),
                      'vertexCount',int(mask.sum()),'meanPosition',center,
                      'progressPercentiles',np.round(vals,3).tolist(),file=sys.stderr)
        joint_new,weight_new,affected,changed=modify_weights(pos,joints,weights,descriptors)
        at['JOINTS_0']=append_array(j,blob,joint_new,ja['componentType'],'VEC4',target=34962)
        at['WEIGHTS_0']=append_array(j,blob,weight_new,wa['componentType'],'VEC4',
            normalized=wa.get('normalized',False),target=34962)
        report['twist_influence_vertices'][name]=affected
        report['mesh_weight_changes'][name]=changed
    # The source deliberately removes body triangles hidden beneath the kit.
    # A calf lives mainly in FooteraSocks and a thigh in FooteraShorts.
    # Requiring 20 *body-only* vertices is an invalid skinning acceptance test.
    # Count real, nonzero influences on all visible, actually skinned surfaces.
    coverage={}
    for d in descriptors:
        key=d['name']
        part=key.split('_twist_')[0]
        preferred={'upperarm':'FooteraShirt','lowerarm':'FooteraBody',
                   'thigh':'FooteraShorts','calf':'FooteraSocks'}[part]
        per_mesh={m:report['twist_influence_vertices'][m][key] for m in PARTS}
        total=sum(per_mesh.values())
        coverage[key]={'visible_mesh':preferred,'per_mesh':per_mesh,'total':total}
        if total<20:
            raise ValueError('Unweighted twist '+key+': '+str(total)+
                             ' vertices across body+kit; distribution='+str(per_mesh))
        if per_mesh[preferred]<8:
            raise ValueError('Missing anatomical surface '+key+': only '+
                             str(per_mesh[preferred])+' '+preferred+' vertices')
    report['coverage']=coverage
    info=j['extras']['footera']
    info['bones']=orig+[d['name'] for d in descriptors]
    info['evolutionTwist']={'stage':'experimental',
       'twist_bones':[d['name'] for d in descriptors],
       'bind_and_weights':'Eight real skinned joints, no hierarchy changes to the 52 primary joints',
       'runtime':'Requires the isolated twist-only animation solver (not integrated in live renderer)'}
    j['asset']['generator']='Footera Player Evolution – 60-bone twist prototype'
    while len(blob)%4:blob.append(0)
    j['buffers'][0]['byteLength']=len(blob)
    js=json.dumps(j,ensure_ascii=False,separators=(',',':')).encode('utf-8')
    js+=b' '*((-len(js))%4)
    total=12+8+len(js)+8+len(blob)
    os.makedirs(os.path.dirname(os.path.abspath(DST)),exist_ok=True)
    with open(DST,'wb') as f:
        f.write(struct.pack('<III',0x46546c67,2,total))
        f.write(struct.pack('<II',len(js),0x4e4f534a));f.write(js)
        f.write(struct.pack('<II',len(blob),0x004e4942));f.write(blob)
    report['output_bytes']=os.path.getsize(DST)
    print(json.dumps(report,indent=2))
    return report


if __name__=='__main__':
    build()
