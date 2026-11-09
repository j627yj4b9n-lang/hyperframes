#!/usr/bin/env python3
"""Synthesise the episode's horror sound bed and effects with ffmpeg (deterministic),
then write the <audio> tags between the SFX markers in index.html."""
import os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "sfx")
os.makedirs(OUT, exist_ok=True)
SR = 48000


def gen(name, expr, dur, post="", stereo=True):
    out = os.path.join(OUT, name + ".m4a")
    af = post + ("," if post else "") + "alimiter=limit=0.89:level=false"
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i",
           f"aevalsrc=exprs='{expr}':s={SR}:d={dur}" + (":c=stereo" if False else ""),
           "-af", af + (",pan=stereo|c0=c0|c1=c0" if stereo else ""), "-c:a", "aac", "-b:a", "192k", out]
    subprocess.run(cmd, check=True)
    return out


def noise_gen(name, dur, color, post):
    out = os.path.join(OUT, name + ".m4a")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i",
                    f"anoisesrc=d={dur}:c={color}:r={SR}:a=0.5:s=7", "-af", post + ",alimiter=limit=0.89:level=false,pan=stereo|c0=c0|c1=c0",
                    "-c:a", "aac", "-b:a", "192k", out], check=True)


def mix(name, inputs, dur, post=""):
    out = os.path.join(OUT, name + ".m4a")
    args = ["ffmpeg", "-y", "-v", "error"]
    for i in inputs:
        args += ["-i", i]
    f = "".join(f"[{k}]" for k in range(len(inputs))) + f"amix=inputs={len(inputs)}:normalize=0:duration=longest"
    if post:
        f += "," + post
    args += ["-filter_complex", f + ",alimiter=limit=0.89:level=false", "-t", str(dur), "-c:a", "aac", "-b:a", "192k", out]
    subprocess.run(args, check=True)


tmp = os.path.join(ROOT, "scripts", ".raw")
os.makedirs(tmp, exist_ok=True)


def t(name):
    return os.path.join(OUT, name + ".m4a")


# --- drone bed: detuned low cluster + slow beating + dark air -------------
gen("_drone_tone",
    "0.22*sin(2*PI*55*t)+0.16*sin(2*PI*55.7*t)+0.12*sin(2*PI*82.4*t)*(0.6+0.4*sin(2*PI*0.07*t))"
    "+0.08*sin(2*PI*116.5*t)*(0.5+0.5*sin(2*PI*0.11*t+1))+0.05*sin(2*PI*174.6*t)*(0.5+0.5*sin(2*PI*0.05*t))", 60)
noise_gen("_drone_air", 60, "brown", "lowpass=f=420,highpass=f=40,volume=0.7")
mix("drone", [t("_drone_tone"), t("_drone_air")], 60, "afade=t=in:d=2.5")

# --- phone vibration on wood: 3 long buzzes --------------------------------
gen("vibrate",
    "(0.55*sgn(sin(2*PI*172*t))*0.4+0.4*sin(2*PI*172*t)+0.2*sin(2*PI*344*t))*(lt(mod(t,0.62),0.42))*lt(t,1.8)", 1.9,
    "lowpass=f=2400,highpass=f=90,aecho=0.6:0.3:12:0.25")
gen("buzz_short", "(0.5*sin(2*PI*172*t)+0.25*sgn(sin(2*PI*172*t)))*(lt(mod(t,0.22),0.15))*lt(t,0.4)", 0.5, "lowpass=f=2400,highpass=f=90")

# --- knock: wooden thump with body ----------------------------------------
gen("_knock_body", "0.9*sin(2*PI*(78-30*t)*t)*exp(-t*18)+0.5*sin(2*PI*160*t)*exp(-t*30)", 0.7)
noise_gen("_knock_snap", 0.7, "pink", "lowpass=f=1800,highpass=f=200,afade=t=out:st=0:d=0.09,volume=1.4")
mix("knock", [t("_knock_body"), t("_knock_snap")], 0.7, "aecho=0.8:0.5:35|70:0.35|0.18,volume=1.6")

# --- heartbeat (lub-dub ×3) ------------------------------------------------
gen("heartbeat",
    "0.95*(sin(2*PI*52*mod(t,0.9))*exp(-mod(t,0.9)*16)+0.75*sin(2*PI*46*(mod(t,0.9)-0.22))*exp(-max(mod(t,0.9)-0.22,0)*18)*gte(mod(t,0.9),0.22))",
    2.6, "lowpass=f=180,volume=2.2")

# --- photo glitch ------------------------------------------------------------
noise_gen("_glitch_n", 0.55, "white", "acrusher=bits=4:samples=40:mix=1,bandpass=f=2200:w=1800,volume=0.5")
gen("_glitch_g", "lt(mod(t,0.08),0.045)", 0.55)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", t("_glitch_n"), "-i", t("_glitch_g"), "-filter_complex",
                "[0][1]amultiply,afade=t=out:st=0.4:d=0.15", "-c:a", "aac", "-b:a", "192k", t("glitch")], check=True)

# --- riser into the end hit + the hit itself ---------------------------------
noise_gen("_riser_n", 3.0, "pink", "highpass=f=300,lowpass=f=5000,afade=t=in:d=2.9:curve=exp,volume=0.55")
gen("_riser_t", "0.25*sin(2*PI*(60+40*t*t)*t)*t/3", 3.0)
mix("riser", [t("_riser_n"), t("_riser_t")], 3.0)
gen("_boom_sub", "1.0*sin(2*PI*(58-26*t)*t)*exp(-t*1.1)", 4.5)
noise_gen("_boom_n", 4.5, "brown", "lowpass=f=300,afade=t=out:st=0:d=2.5,volume=1.3")
mix("boom", [t("_boom_sub"), t("_boom_n")], 4.5, "aecho=0.7:0.6:120|260:0.3|0.15")

# --- room tone inside Lina's phone video (mic hiss) -------------------------
noise_gen("vidhiss", 14, "pink", "highpass=f=1500,lowpass=f=7000,volume=0.09,afade=t=in:d=0.3,afade=t=out:st=13.6:d=0.4")

# --- vote bed: dark pulse ------------------------------------------------------
gen("votebed", "(0.35*sin(2*PI*41.2*t)+0.2*sin(2*PI*61.7*t))*(0.55+0.45*exp(-mod(t,1.2)*4))", 5.4,
    "afade=t=in:d=0.4,afade=t=out:st=4.6:d=0.8")

for f in os.listdir(OUT):
    if f.startswith("_"):
        os.remove(os.path.join(OUT, f))

# placements: id, file, start, volume
SFX = [
    ("sfx-drone-a", "drone", 0.0, 44.2, 0.55),
    ("sfx-vibrate-1", "vibrate", 0.0, 1.9, 0.9),
    ("sfx-vibrate-2", "vibrate", 1.9, 1.9, 0.8),
    ("sfx-buzz-1", "buzz_short", 6.75, 0.5, 0.7),
    ("sfx-glitch", "glitch", 17.2, 0.55, 0.8),
    ("sfx-heart", "heartbeat", 25.0, 2.6, 0.9),
    ("sfx-buzz-2", "buzz_short", 27.8, 0.5, 0.8),
    ("sfx-vidhiss", "vidhiss", 30.0, 14.0, 0.8),
    ("sfx-knock-1", "knock", 44.25, 0.7, 1.0),
    ("sfx-knock-2", "knock", 44.85, 0.7, 1.0),
    ("sfx-knock-3", "knock", 45.45, 0.7, 1.0),
    ("sfx-drone-b", "drone", 46.4, 7.6, 0.45),
    ("sfx-riser", "riser", 51.0, 3.0, 0.7),
    ("sfx-buzz-3", "buzz_short", 52.65, 0.5, 0.8),
    ("sfx-boom", "boom", 54.0, 4.5, 1.0),
    ("sfx-votebed", "votebed", 54.6, 5.4, 0.6),
]
tags = "\n".join(
    f'      <audio id="{i}" class="clip" src="assets/sfx/{f}.m4a" data-start="{s}" data-duration="{d}" '
    f'data-track-index="{40 + k}" data-volume="{v}"></audio>'
    for k, (i, f, s, d, v) in enumerate(SFX)
)
idx = os.path.join(ROOT, "index.html")
html = open(idx).read()
html = re.sub(r"(<!-- SFX:BEGIN -->).*?(\s*<!-- SFX:END -->)", lambda m: m.group(1) + "\n" + tags + m.group(2), html, flags=re.S)
open(idx, "w").write(html)
print("sfx:", sorted(os.listdir(OUT)))
