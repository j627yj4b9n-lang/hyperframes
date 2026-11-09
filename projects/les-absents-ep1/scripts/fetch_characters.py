#!/usr/bin/env python3
"""Download the four Microsoft Rocketbox avatars (MIT) used by the episode and
convert their TGA textures to the JPG/PNG files assets/scene.js loads.

  python3 scripts/fetch_characters.py

Writes assets/characters/<noe|lina|mere|pere>/{model.fbx, head_color.jpg, head_normal.jpg,
body_color.jpg, body_normal.jpg, opacity_color.png}. Needs Pillow.
"""
import io, os, ssl, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/master/Assets/Avatars/Adults"
CAST = {
    "noe": ("Male_Adult_10", "m024"),
    "lina": ("Female_Adult_12", "f012"),
    "mere": ("Female_Adult_14", "f017"),
    "pere": ("Male_Adult_03", "m004"),
}
CA = "/root/.ccr/ca-bundle.crt"
CTX = ssl.create_default_context(cafile=CA) if os.path.exists(CA) else ssl.create_default_context()


def get(url):
    with urllib.request.urlopen(url, context=CTX, timeout=300) as r:
        return r.read()


for key, (avatar, prefix) in CAST.items():
    out = os.path.join(ROOT, "assets", "characters", key)
    os.makedirs(out, exist_ok=True)
    fbx = os.path.join(out, "model.fbx")
    if not os.path.exists(fbx):
        open(fbx, "wb").write(get(f"{BASE}/{avatar}/Export/{avatar}_facial.fbx"))
    for part in ("head_color", "head_normal", "body_color", "body_normal", "opacity_color"):
        ext = "png" if part == "opacity_color" else "jpg"
        dst = os.path.join(out, f"{part}.{ext}")
        if os.path.exists(dst):
            continue
        try:
            im = Image.open(io.BytesIO(get(f"{BASE}/{avatar}/Textures/{prefix}_{part}.tga")))
        except Exception as e:  # some avatars have no opacity map
            print(f"  {key}: no {part} ({e})")
            continue
        if ext == "png":
            im.convert("RGBA").resize((1024, 1024)).save(dst)
        else:
            im.convert("RGB").resize((1024, 1024)).save(dst, quality=88)
    print(key, sorted(os.listdir(out)))
