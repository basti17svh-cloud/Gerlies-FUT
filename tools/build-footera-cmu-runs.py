#!/usr/bin/env python3
"""Bake a real captured running stride (CMU Graphics Lab Motion Capture
Database, subject 16 "run", free for research and commercial projects) into
Footera's 3d-mocap-cmu-run-data.mjs, same format as the CMU kicks.

One clean stride cycle (left foot forward to left foot forward) is resampled
to 30 fps; the last frame repeats the first so the loop is seamless.
Usage: python3 tools/build-footera-cmu-runs.py [folder with cached .bvh]
"""
import importlib.util
import json
import math
import pathlib
import sys

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("kicks", HERE/"build-footera-cmu-kicks.py")
kicks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kicks)

# clip -> (file, git blob sha, first and next "left foot most forward" frame at 120 fps)
CLIPS = {
    "run": ("016/16_45.bvh", "82629c987b51862680eee970a58296c144a32d9f", 50, 132),
}
RATE = 30
OUT = pathlib.Path("3d-mocap-cmu-run-data.mjs")


def main():
    cache = sys.argv[1] if len(sys.argv) > 1 else None
    clips, rest_dirs = {}, None
    for name, (path, sha, start, end) in CLIPS.items():
        joints, data, dt = kicks.parse(kicks.fetch(path, sha, cache))
        names = [j["name"] for j in joints]
        pos, rot = kicks.forward_kinematics(joints, data)
        hips = names.index("Hips")
        run = pos[end, hips]-pos[start, hips]
        yaw = math.atan2(run[0], run[2])
        turn = kicks.axis_angle("Y", np.degrees(-yaw))
        n = max(2, round((end-start)*dt*RATE))
        picks = np.linspace(start, end, n+1)
        track = []
        for f in picks:
            f0 = int(math.floor(f))
            u = f-f0
            row = []
            for _, joint, _ in kicks.MAP:
                a, b = rot[f0, names.index(joint)], rot[min(f0+1, len(rot)-1), names.index(joint)]
                if np.dot(a, b) < 0:
                    b = -b
                q = a*(1-u)+b*u
                q /= np.linalg.norm(q)
                row.append(kicks.qmul(turn, q))
            track.append(row)
        track[-1] = track[0]
        clips[name] = {"frames": len(picks), "rate": RATE, "loop": True, "keys": {"leftForward": 0},
                       "speed": round(float(np.linalg.norm(run[[0, 2]])/((end-start)*dt)), 2),
                       "source": "CMU "+pathlib.Path(path).stem, "bytes": kicks.pack(np.array(track))}
        if rest_dirs is None:
            rest_dirs = []
            for _, joint, child in kicks.MAP:
                v = joints[names.index(child)]["offset"] if child else np.array([0, 1.0, 0])
                v = v/np.linalg.norm(v)
                rest_dirs.append([round(float(x), 4) for x in v])
    body = {"bones": [m[0] for m in kicks.MAP], "restDirs": rest_dirs, "clips": clips}
    OUT.write_text(
        "/* Footera: a real captured running stride, CMU Graphics Lab Motion Capture\n"
        " * Database (subject 16, free for research and commercial use), baked by\n"
        " * tools/build-footera-cmu-runs.py. World rotation away from the T-pose per\n"
        " * bone, capture facing +Z, 30 fps, one seamless stride cycle. Do not edit. */\n"
        "export const FOOTERA_CMU_RUN="+json.dumps(body, separators=(",", ":"))+";\n")
    print("wrote", OUT, OUT.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
