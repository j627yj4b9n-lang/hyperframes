"""Synthesise the sound design for « Après le silence » ep. 1 (deterministic, seeded).

Usage: python3 scripts/make_sfx.py   (writes MP3s into assets/audio/; needs numpy, scipy, soundfile, ffmpeg)
"""

import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
OUT = Path(__file__).resolve().parent.parent / "assets" / "audio"
rng = np.random.default_rng(317)


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def bp(x, lo=None, hi=None, order=4):
    if lo and hi:
        sos = butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    elif lo:
        sos = butter(order, lo, btype="high", fs=SR, output="sos")
    else:
        sos = butter(order, hi, btype="low", fs=SR, output="sos")
    return sosfilt(sos, x)


def reverb(x, sec=1.8, wet=0.35, damp=3000):
    n = int(sec * SR)
    ir = rng.standard_normal(n) * np.exp(-6.9 * np.arange(n) / n)
    ir = bp(ir, hi=damp)
    ir /= np.sqrt(np.sum(ir**2))
    y = fftconvolve(x, ir)[: len(x)]
    return (1 - wet) * x + wet * y


def env_ad(n, a, d):
    e = np.ones(n)
    na, nd = int(a * SR), int(d * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nd:
        e[-nd:] *= np.linspace(1, 0, nd)
    return e


def stereo(x, width=0.0):
    if width:
        d = int(0.011 * SR)
        r = np.concatenate([np.zeros(d), x[:-d]])
        return np.stack([x, (1 - width) * x + width * r], axis=1)
    return np.stack([x, x], axis=1)


def write(name, x, peak=0.9):
    m = np.max(np.abs(x)) or 1
    wav = OUT / name
    sf.write(wav, (x / m * peak).astype(np.float32), SR, subtype="PCM_16")
    mp3 = wav.with_suffix(".mp3")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-c:a", "libmp3lame", "-b:a", "192k", str(mp3)], check=True)
    wav.unlink()
    print(name, round(len(x) / SR, 2), "s")


def rain(sec, muffled):
    n = int(sec * SR)

    def layer():
        hiss = bp(rng.standard_normal(n), 900, 9000) * 0.5
        drops = np.zeros(n)
        for i in rng.integers(0, n - 400, int(sec * 140)):
            k = int(rng.integers(60, 300))
            drops[i : i + k] += rng.uniform(0.2, 1) * np.exp(-np.arange(k) / (k / 5)) * rng.standard_normal(k)
        drops = bp(drops, 1500, 7000)
        rumble = bp(rng.standard_normal(n), hi=180) * 2.5
        x = hiss + drops * 0.8 + rumble
        if muffled:
            x = bp(x, hi=700) + drops * 0.05
        return x

    return np.stack([layer(), layer()], axis=1) * env_ad(n, 0.05, 0.05)[:, None]


def drone(sec):
    t = t_axis(sec)
    swell = 0.55 + 0.45 * np.clip(t / sec, 0, 1) ** 1.5
    x = (
        np.sin(2 * np.pi * 36.7 * t) * 0.9
        + np.sin(2 * np.pi * 55.1 * t + 0.3 * np.sin(2 * np.pi * 0.07 * t)) * 0.6
        + np.sin(2 * np.pi * 73.9 * t) * 0.25 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.11 * t))
    )
    x += bp(rng.standard_normal(len(t)), 40, 160) * 0.9
    x += np.sin(2 * np.pi * 1244.5 * t) * 0.012 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * t))
    return stereo(x * swell * env_ad(len(t), 1.5, 1.0), 0.4)


def hum(sec):
    t = t_axis(sec)
    x = sum(np.sin(2 * np.pi * f * t) / (k + 1) for k, f in enumerate([50, 100, 150, 250]))
    x += bp(rng.standard_normal(len(t)), 200, 900) * 0.08
    return stereo(x * env_ad(len(t), 0.3, 0.01))


def boom(sec=2.6):
    t = t_axis(sec)
    f = 32 + 48 * np.exp(-t * 6)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.9)
    x += bp(rng.standard_normal(len(t)), hi=1200) * np.exp(-t * 14) * 0.7
    x[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    return stereo(reverb(x, 2.2, 0.25, 1500), 0.3)


def alert(sec=2.4):
    t = t_axis(sec)
    tone = np.sign(np.sin(2 * np.pi * 853 * t)) * 0.5 + np.sign(np.sin(2 * np.pi * 960 * t)) * 0.5
    gate = ((t % 0.6) < 0.42).astype(float)
    gate = np.convolve(gate, np.ones(240) / 240, mode="same")
    return stereo(bp(tone * gate * env_ad(len(t), 0.01, 0.2), 300, 3800) * 0.6)


def vibrate(sec=1.3):
    t = t_axis(sec)
    buzz = np.sign(np.sin(2 * np.pi * 165 * t)) * 0.6 + np.sin(2 * np.pi * 330 * t) * 0.4
    gate = (((t > 0.0) & (t < 0.42)) | ((t > 0.62) & (t < 1.04))).astype(float)
    gate = np.convolve(gate, np.ones(480) / 480, mode="same")
    rattle = bp(rng.standard_normal(len(t)), 1800, 5000) * (np.sin(2 * np.pi * 82 * t) > 0.6)
    return stereo(bp(buzz, 80, 1600) * gate + rattle * gate * 0.25)


def power_off(sec=2.0):
    t = t_axis(sec)
    click = bp(rng.standard_normal(len(t)), 800, 7000) * np.exp(-t * 90)
    zap = np.sin(2 * np.pi * 50 * t) * np.exp(-t * 7) * 0.8
    zap += bp(rng.standard_normal(len(t)), 2000, 6000) * np.exp(-t * 30) * 0.4
    thump = np.sin(2 * np.pi * (45 + 30 * np.exp(-t * 20)) * t) * np.exp(-t * 6)
    return stereo(reverb(click * 1.2 + zap + thump * 0.9, 1.0, 0.2))


def ringtone(sec=2.8):
    t = t_axis(sec)
    x = np.zeros(len(t))
    for rep in range(3):
        for off, f in [(0.0, 880), (0.18, 1174.7), (0.36, 880), (0.54, 1318.5)]:
            s, k = int((rep * 0.95 + off) * SR), int(0.35 * SR)
            if s + k > len(x):
                continue
            tt = np.arange(k) / SR
            x[s : s + k] += (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)) * np.exp(-tt * 9)
    return stereo(bp(x, 400, 5000) * 0.5)


def breath(sec=1.9):
    t = t_axis(sec)
    noise = rng.standard_normal(len(t))
    e_in = np.sin(np.pi * np.clip((t - 0.05) / 0.7, 0, 1)) ** 2
    e_out = np.sin(np.pi * np.clip((t - 0.85) / 0.95, 0, 1)) ** 1.5
    x = bp(noise, 900, 3200) * e_in * 0.7 + bp(noise, 300, 1600) * e_out
    x *= 1 + 0.25 * np.sin(2 * np.pi * 23 * t)
    return np.stack([x * 0.85, x], axis=1)


def riser(sec=4.2):
    t = t_axis(sec)
    p = t / sec
    f = 60 * (1 + 5 * p**2)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 + np.sin(2 * np.pi * np.cumsum(f * 1.059) / SR) * 0.4
    x += bp(rng.standard_normal(len(t)), 300, 6000) * p**3 * 0.8
    creak = np.zeros(len(t))
    for i in range(int(0.3 * SR), int(2.4 * SR), int(0.021 * SR)):
        creak[i : i + 60] += np.exp(-np.arange(60) / 12) * rng.uniform(0.3, 1)
    x = x * p**1.6 + bp(creak, 300, 2500) * 1.5 * np.clip(1 - p * 1.2, 0, 1)
    x[-int(0.02 * SR) :] *= np.linspace(1, 0, int(0.02 * SR))
    return stereo(x, 0.5)


def cluster(sec=4.2):
    t = t_axis(sec)
    x = np.zeros(len(t))
    for f in [207.65, 220.0, 233.1, 311.1, 466.2, 493.9]:
        for det in (-0.4, 0.4):
            ph = (f + det) * t + rng.uniform(0, 1)
            x += 2 * (ph % 1) - 1
    x = bp(x, 150, 2600) * (t / sec) ** 1.8 * (1 + 0.15 * np.sin(2 * np.pi * 5.5 * t))
    x[-int(0.01 * SR) :] *= np.linspace(1, 0, int(0.01 * SR))
    return stereo(reverb(x, 2.5, 0.4), 0.6)


def footsteps(sec=7.0):
    t = t_axis(sec)
    x = np.zeros(len(t))
    k = int(0.12 * SR)
    tt = np.arange(k) / SR
    for s in np.arange(0.1, sec - 0.3, 0.29):
        i0 = int(s * SR)
        slap = bp(rng.standard_normal(k), 300, 4000) * np.exp(-tt * 45)
        x[i0 : i0 + k] += (slap + 0.6 * np.sin(2 * np.pi * 90 * tt) * np.exp(-tt * 40)) * rng.uniform(0.7, 1)
    vol = np.clip(np.sin(np.pi * np.clip(t / sec * 1.1, 0, 1)), 0.05, 1)
    return stereo(reverb(bp(x, hi=3000) * vol, 1.6, 0.5, 2500), 0.4)


if __name__ == "__main__":
    write("amb-rain-out.wav", rain(20, False), 0.7)
    write("amb-rain-in.wav", rain(42, True), 0.7)
    write("amb-drone.wav", drone(60), 0.8)
    write("amb-hum.wav", hum(10.5), 0.6)
    write("sfx-boom.wav", boom())
    write("sfx-alert.wav", alert(), 0.7)
    write("sfx-vibrate.wav", vibrate(), 0.8)
    write("sfx-power-off.wav", power_off())
    write("sfx-ringtone.wav", ringtone(), 0.7)
    write("sfx-breath.wav", breath(), 0.9)
    write("sfx-riser.wav", riser(), 0.85)
    write("sfx-cluster.wav", cluster(), 0.8)
    write("sfx-footsteps.wav", footsteps(), 0.85)
