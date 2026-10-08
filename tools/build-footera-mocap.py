#!/usr/bin/env python3
"""Deterministically bake CC0 humanoid mocap into Footera's lightweight 14-joint rig.

Source: Quaternius Universal Animation Library [Standard], public CC0 release
archived at https://github.com/J-Ponzo/gltf-universal-animation-library
This script fetches only the GitHub-pinned glTF and .bin at BUILD time.
NO downloaded binary or external runtime dependency is added to Footera.
"""
import base64
import bisect
import hashlib
import json
import math
import pathlib
import struct
import urllib.request

SOURCE = "https://raw.githubusercontent.com/J-Ponzo/gltf-universal-animation-library/main/glTF/"
SOURCES = {
    "AnimationLibrary_Godot_Standard.gltf": "d9e132ad1d41089f8f96488775829d220a4beb05",
    "AnimationLibrary_Godot_Standard.bin": "481652b8b1571b15c254b44f4d9b9f702498f948",
}
NAMES = [
    "DEF-spine.002", "DEF-upper_arm.L", "DEF-forearm.L",
    "DEF-upper_arm.R", "DEF-forearm.R", "DEF-thigh.L",
    "DEF-shin.L", "DEF-foot.L", "DEF-thigh.R",
    "DEF-shin.R", "DEF-foot.R",
]
CLIPS = ["Idle_Loop", "Walk_Loop", "Jog_Fwd_Loop", "Sprint_Loop",
         "Jump_Start", "Jump_Loop", "Jump_Land", "Roll"]
RATE = 20
SCALE = 70
OUT = pathlib.Path("3d-mocap-data.mjs")


def download(name):
    with urllib.request.urlopen(SOURCE + name, timeout=45) as stream:
        raw = stream.read()
    gh = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
    if gh != SOURCES[name]:
        raise ValueError("Upstream motion data changed, refusing unverified release: " + name)
    return raw


def mul(a, b):
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return (aw*bx+ax*bw+ay*bz-az*by,
            aw*by-ax*bz+ay*bw+az*bx,
            aw*bz+ax*by-ay*bx+az*bw,
            aw*bw-ax*bx-ay*by-az*bz)


def inv(a):
    n = sum(x*x for x in a)
    return (-a[0]/n, -a[1]/n, -a[2]/n, a[3]/n)


def vec(q):
    # Orientation-invariant canonical world-axis angular displacement.
    q = tuple(-x for x in q) if q[3] < 0 else q
    v = math.sqrt(sum(x*x for x in q[:3]))
    if v < 1e-8:
        return (0.0, 0.0, 0.0)
    s = 2.0 * math.atan2(v, q[3]) / v
    return tuple(x*s for x in q[:3])


def main():
    gltf = json.loads(download("AnimationLibrary_Godot_Standard.gltf"))
    binary = download("AnimationLibrary_Godot_Standard.bin")
    nodes = gltf["nodes"]
    ids = [next(i for i, x in enumerate(nodes) if x.get("name") == name) for name in NAMES]
    parents = {}
    for i, node in enumerate(nodes):
        for child in node.get("children", []):
            parents[child] = i
    identity = (0.0, 0.0, 0.0, 1.0)
    base = [tuple(n.get("rotation", identity)) for n in nodes]
    worlds = {}

    def restworld(i):
        if i not in worlds:
            worlds[i] = mul(restworld(parents[i]), base[i]) if i in parents else base[i]
        return worlds[i]

    # The canonical source-bone delta is transformed into global humanoid space.
    orientations = [restworld(parents[i]) if i in parents else identity for i in ids]
    by_name = {a["name"]: a for a in gltf["animations"]}
    views = gltf["bufferViews"]
    cached = {}

    def accessor(i):
        if i in cached:
            return cached[i]
        a = gltf["accessors"][i]
        assert a["componentType"] == 5126 and a["type"] in ("SCALAR", "VEC4")
        v = views[a["bufferView"]]
        stride = 1 if a["type"] == "SCALAR" else 4
        start = v.get("byteOffset", 0) + a.get("byteOffset", 0)
        step = v.get("byteStride", stride*4)
        result = [struct.unpack_from("<" + "f"*stride, binary, start+j*step)
                  for j in range(a["count"])]
        cached[i] = result
        return result

    output = {}
    for name in CLIPS:
        animation = by_name[name]
        channels = {}
        for item in animation["channels"]:
            target = item["target"]
            if target["node"] in ids and target["path"] == "rotation":
                channels[target["node"]] = animation["samplers"][item["sampler"]]
        assert len(channels) == len(ids), (name, list(channels))
        times = [accessor(channels[i]["input"]) for i in ids]
        quats = [accessor(channels[i]["output"]) for i in ids]
        duration = max(ts[-1][0] for ts in times)
        count = int(math.ceil(duration * RATE)) + 1
        compressed = bytearray()
        for frame in range(count):
            t = min(duration, frame/RATE)
            for j, i in enumerate(ids):
                ts = times[j]
                n = min(len(ts)-1, max(0, bisect.bisect_right(ts, (t,))-1))
                sample = quats[j][n]
                delta = mul(sample, inv(base[i]))
                q = mul(mul(orientations[j], delta), inv(orientations[j]))
                for angle in vec(q):
                    compressed.append(max(-127, min(127, round(angle*SCALE))) & 255)
        assert len(compressed) == count*len(ids)*3
        output[name] = {"duration": round(duration, 5), "frames": count,
                        "bytes": base64.b64encode(compressed).decode("ascii")}
        print(name, count, "frames", round(duration, 2), "sec")
    header = (
        "/* Footera CC0 humanoid motion source: Quaternius, Universal Animation Library Standard.\n"
        " * https://quaternius.itch.io/universal-animation-library (CC0 1.0).\n"
        " * Audited public distribution: https://github.com/J-Ponzo/gltf-universal-animation-library\n"
        " * Build generator: tools/build-footera-mocap.py (verified upstream Git blob hashes).\n"
        " * Quantized bone orientation DIFFERENCES, no external loader/network in the game.\n"
        " */\n"
        "export const FOOTERA_MOCAP_BONES = Object.freeze(" + json.dumps(NAMES, separators=(',', ':')) + ");\n"
        "export const FOOTERA_MOCAP_RATE = " + str(RATE) + ";\n"
        "export const FOOTERA_MOCAP_SCALE = " + str(SCALE) + ";\n"
        "export const FOOTERA_MOCAP_CLIPS = Object.freeze(" +
        json.dumps(output, separators=(',', ':')) + ");\n"
    )
    OUT.write_text(header, encoding="utf-8")
    print("Wrote", OUT, len(header), "bytes")


if __name__ == "__main__":
    main()
