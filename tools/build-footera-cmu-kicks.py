#!/usr/bin/env python3
"""Bake real captured football kicks (CMU Graphics Lab Motion Capture Database)
into Footera's 3d-mocap-cmu-data.mjs.

Source: CMU mocap, subjects 10 and 11 "kick soccer ball", BVH conversion by
Bruce Hahne, mirrored at https://github.com/una-dinosauria/cmu-mocap.
CMU: "free for use in research and commercial projects"; no restrictions.
Only the GitHub-pinned BVH files are fetched at BUILD time (sha checked);
Footera ships the reduced quaternion tracks, no runtime download.

Each frame stores, per mapped bone, the capture's world rotation away from
its T-pose rest, in Footera player space (facing -Z, the run-up direction
of the kick turned onto it). The runtime turns these onto our own rest pose.
"""
import base64
import hashlib
import json
import math
import pathlib
import sys
import urllib.request

import numpy as np

SOURCE = "https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data/"
# clip name -> (file, git blob sha, contact frame at 120 fps: kicking toe beside the support toe)
CLIPS = {
    "normal": ("011/11_01.bvh", "33b5e4f725cc674f316f88e5d420453f71ec6116", 409),
    "power": ("010/10_05.bvh", "9bbdf7802f269983db18fe57b1d841988ef3d1a3", 302),
    "low_driven": ("010/10_03.bvh", "2fcb456f8ba5f1c54a665370aa8eba9edb87242a", 139),
    "finesse": ("010/10_06.bvh", "2a4fce887e73aa0ec17b4cc2a36695cc23eba18b", 411),
}
BEFORE, AFTER, RATE = 0.95, 0.95, 30
# Footera bone <- (CMU joint, CMU joint whose offset gives the bone direction)
MAP = [
    ("pelvis", "Hips", "Spine"), ("spine_01", "LowerBack", "Spine"),
    ("spine_02", "Spine", "Spine1"), ("spine_03", "Spine1", "Neck1"),
    ("neck_01", "Neck1", "Head"), ("Head", "Head", None),
    ("clavicle_l", "LeftShoulder", "LeftArm"), ("upperarm_l", "LeftArm", "LeftForeArm"),
    ("lowerarm_l", "LeftForeArm", "LeftHand"), ("hand_l", "LeftHand", "LeftHandIndex1"),
    ("clavicle_r", "RightShoulder", "RightArm"), ("upperarm_r", "RightArm", "RightForeArm"),
    ("lowerarm_r", "RightForeArm", "RightHand"), ("hand_r", "RightHand", "RightHandIndex1"),
    ("thigh_l", "LeftUpLeg", "LeftLeg"), ("calf_l", "LeftLeg", "LeftFoot"), ("foot_l", "LeftFoot", "LeftToeBase"),
    ("thigh_r", "RightUpLeg", "RightLeg"), ("calf_r", "RightLeg", "RightFoot"), ("foot_r", "RightFoot", "RightToeBase"),
]
OUT = pathlib.Path("3d-mocap-cmu-data.mjs")
UNIT = 0.056
  # CMU BVH units to metres (hip height ~0.99 m)


def qmul(a, b):
    ax, ay, az, aw = np.moveaxis(a, -1, 0)
    bx, by, bz, bw = np.moveaxis(b, -1, 0)
    return np.stack([aw*bx+ax*bw+ay*bz-az*by, aw*by-ax*bz+ay*bw+az*bx,
                     aw*bz+ax*by-ay*bx+az*bw, aw*bw-ax*bx-ay*by-az*bz], -1)


def qinv(q):
    return q*np.array([-1, -1, -1, 1.0])


def qrot(q, v):
    qv = np.concatenate([v, np.zeros(v.shape[:-1]+(1,))], -1)
    return qmul(qmul(q, qv), qinv(q))[..., :3]


def axis_angle(axis, deg):
    a = np.radians(deg)/2
    out = np.zeros(np.shape(deg)+(4,))
    out[..., "XYZ".index(axis)] = np.sin(a)
    out[..., 3] = np.cos(a)
    return out


def parse(text):
    head, motion = text.split("MOTION")
    toks, joints, stack, i, pending = head.split(), [], [], 0, None
    while i < len(toks):
        t = toks[i]
        if t in ("ROOT", "JOINT"):
            joints.append(dict(name=toks[i+1], parent=stack[-1] if stack else -1, channels=[], offset=None))
            pending = len(joints)-1
            i += 2
        elif t == "End":
            pending = ("end", stack[-1])
            i += 2
        elif t == "{":
            stack.append(pending)
            i += 1
        elif t == "}":
            stack.pop()
            i += 1
        elif t == "OFFSET":
            if not isinstance(stack[-1], tuple):
                joints[stack[-1]]["offset"] = np.array(list(map(float, toks[i+1:i+4])))
            i += 4
        elif t == "CHANNELS":
            n = int(toks[i+1])
            joints[stack[-1]]["channels"] = toks[i+2:i+2+n]
            i += 2+n
        else:
            i += 1
    lines = motion.strip().split("\n")
    frames, dt = int(lines[0].split()[1]), float(lines[1].split()[2])
    data = np.array([list(map(float, l.split())) for l in lines[2:2+frames]])
    return joints, data, dt


def forward_kinematics(joints, data):
    F, col = len(data), 0
    pos, rot = np.zeros((F, len(joints), 3)), np.zeros((F, len(joints), 4))
    for ji, j in enumerate(joints):
        q = np.tile([0, 0, 0, 1.0], (F, 1))
        for k, c in enumerate(j["channels"]):
            if c.endswith("rotation"):
                q = qmul(q, axis_angle(c[0], data[:, col+k]))
        p = j["parent"]
        if p < 0:
            rot[:, ji], pos[:, ji] = q, data[:, col:col+3]
        else:
            rot[:, ji] = qmul(rot[:, p], q)
            pos[:, ji] = pos[:, p]+qrot(rot[:, p], np.tile(j["offset"], (F, 1)))
        col += len(j["channels"])
    return pos*UNIT, rot


def fetch(path, sha, cache):
    local = pathlib.Path(cache)/pathlib.Path(path).name if cache else None
    raw = local.read_bytes() if local and local.exists() else urllib.request.urlopen(SOURCE+path, timeout=60).read()
    gh = hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()
    if gh != sha:
        raise ValueError("Upstream motion data changed, refusing unverified release: "+path)
    return raw.decode("ascii")


def pack(quats):
    q = quats/np.linalg.norm(quats, axis=-1, keepdims=True)
    q = np.where(q[..., 3:4] < 0, -q, q)
    return base64.b64encode(np.round(q[..., :3]*32767).astype("<i2").tobytes()).decode("ascii")


def main():
    cache = sys.argv[1] if len(sys.argv) > 1 else None
    clips = {}
    for name, (path, sha, contact) in CLIPS.items():
        joints, data, dt = parse(fetch(path, sha, cache))
        names = [j["name"] for j in joints]
        pos, rot = forward_kinematics(joints, data)
        hips = names.index("Hips")
        run = pos[contact, hips]-pos[contact-60, hips]
        yaw = math.atan2(run[0], run[2])
        # Capture faces +Z after removing the run-up yaw (the runtime turns +Z
        # onto the model's own forward).
        turn = axis_angle("Y", np.degrees(-yaw))
        step = 1/(RATE*dt)
        picks = np.arange(contact-BEFORE/dt, contact+AFTER/dt+1e-6, step)
        track = []
        for f in picks:
            f0 = int(math.floor(f))
            u = f-f0
            row = []
            for _, joint, _ in MAP:
                a, b = rot[f0, names.index(joint)], rot[min(f0+1, len(rot)-1), names.index(joint)]
                if np.dot(a, b) < 0:
                    b = -b
                q = a*(1-u)+b*u
                q /= np.linalg.norm(q)
                # Rest directions are shared (unturned), so the clip's own
                # run-up yaw is folded into the rotation itself.
                row.append(qmul(turn, q))
            track.append(row)
        track = np.array(track)
        # Support-foot dip of the hips around the plant, relative to the run-up.
        hip_y = np.interp(picks, np.arange(len(pos)), pos[:, hips, 1])
        clips[name] = {"frames": len(picks), "rate": RATE, "contact": BEFORE,
                       "source": "CMU "+pathlib.Path(path).stem,
                       "hipDrop": [round(float(v), 3) for v in hip_y-hip_y[0]],
                       "bytes": pack(track)}
    rest_dirs = []
    joints, data, dt = parse(fetch(*CLIPS["normal"][:2], cache))
    names = [j["name"] for j in joints]
    for _, joint, child in MAP:
        v = joints[names.index(child)]["offset"] if child else np.array([0, 1.0, 0])
        v = v/np.linalg.norm(v)
        rest_dirs.append([round(float(x), 4) for x in v])
    body = {"bones": [m[0] for m in MAP], "restDirs": rest_dirs, "kickFoot": "r", "clips": clips}
    OUT.write_text(
        "/* Footera: real captured football kicks, CMU Graphics Lab Motion Capture\n"
        " * Database (subjects 10/11, free for research and commercial use), baked by\n"
        " * tools/build-footera-cmu-kicks.py. World rotation away from the T-pose per\n"
        " * bone, capture facing +Z, 30 fps, contact at clip time `contact`. Do not edit. */\n"
        "export const FOOTERA_CMU_KICKS="+json.dumps(body, separators=(",", ":"))+";\n")
    print("wrote", OUT, OUT.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
