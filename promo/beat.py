"""Original Afro-house beat for the Sulva Sites promo. 120 BPM, 30 s, F minor, 44.1 kHz stereo.

Writes audio/beat_120.wav (full mix) and stems (drums, bass, music, fx) to audio/.
Every hit sits on the 120 BPM grid so it lines up with the scene cuts:
  bars are 2 s:  hook 0-4 | logo 4-6 | montage 6-14 | editor 14-20 | live 20-26 | CTA 26-30
"""
import json
import wave
from pathlib import Path

import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
BAR = BEAT * 4
STEP = BEAT / 4
DUR = 30.0
N = int(SR * (DUR + 0.0))
OUT = Path(__file__).parent / "audio"
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(7)


def stereo():
    return np.zeros((N, 2))


drums, bass, music, fx = stereo(), stereo(), stereo(), stereo()


def t_of(n):
    return np.arange(n) / SR


def place(bus, sig, at, gain=1.0, pan=0.0):
    """Add mono or stereo sig to bus at time `at` (s), equal-power pan -1..1."""
    i = int(round(at * SR))
    if i >= N or i + len(sig) <= 0:
        return
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        sig = np.stack([sig * np.cos(a), sig * np.sin(a)], axis=1)
    j = min(N, i + len(sig))
    s0 = max(0, -i)
    bus[max(i, 0):j] += sig[s0:j - i] * gain


def fft_filter(sig, lo=None, hi=None):
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR)
    mask = np.ones_like(f)
    if lo:
        mask *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi:
        mask *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(spec * mask, len(sig))


def env(n, attack, decay):
    t = t_of(n)
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-t / decay)


def onepole_lp(sig, cutoffs):
    """Time-varying one-pole lowpass; cutoffs is per-sample Hz array."""
    out = np.empty_like(sig)
    a = 1 - np.exp(-2 * np.pi * cutoffs / SR)
    y = 0.0
    for k in range(len(sig)):
        y += a[k] * (sig[k] - y)
        out[k] = y
    return out


# ---------- instruments ----------
def kick(n=int(0.45 * SR)):
    t = t_of(n)
    f = 48 + 110 * np.exp(-t / 0.03)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.18)
    click = fft_filter(rng.standard_normal(n), lo=2000) * np.exp(-t / 0.004) * 0.3
    return np.tanh(1.6 * (body + click))


def clap():
    n = int(0.3 * SR)
    noise = fft_filter(rng.standard_normal(n), lo=900, hi=5000)
    e = np.zeros(n)
    for off in (0, 0.011, 0.022):
        i = int(off * SR)
        e[i:] += np.exp(-t_of(n - i) / (0.008 if off < 0.02 else 0.09))
    return noise * e * 0.6


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    noise = fft_filter(rng.standard_normal(n), lo=7000)
    return noise * env(n, 0.001, 0.07 if open_ else 0.015) * 0.5


def shaker():
    n = int(0.08 * SR)
    noise = fft_filter(rng.standard_normal(n), lo=5000, hi=12000)
    return noise * env(n, 0.012, 0.025) * 0.35


def conga(freq):
    n = int(0.25 * SR)
    t = t_of(n)
    f = freq * (1 + 0.3 * np.exp(-t / 0.01))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09)
    slap = fft_filter(rng.standard_normal(n), lo=1500, hi=6000) * np.exp(-t / 0.006) * 0.25
    return (s + slap) * 0.5


def snare():
    n = int(0.18 * SR)
    t = t_of(n)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.04)
    noise = fft_filter(rng.standard_normal(n), lo=1500) * np.exp(-t / 0.06)
    return (0.5 * tone + 0.6 * noise) * 0.6


def log_drum(freq, length=0.42):
    """Amapiano-style log drum: pitch glide down into the note, saturated."""
    n = int(length * SR)
    t = t_of(n)
    f = freq * (1 + 0.9 * np.exp(-t / 0.025))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    s *= env(n, 0.002, length * 0.45)
    return np.tanh(2.2 * s) * 0.55


def chord_stab(freqs, length=0.32, bright=1.0):
    n = int(length * SR)
    t = t_of(n)
    s = np.zeros(n)
    for f0 in freqs:
        for det in (-0.12, 0.0, 0.12):  # cents-ish detune in Hz-scaled form
            f = f0 * (1 + det / 100)
            for h in range(1, 9):
                s += np.sin(2 * np.pi * f * h * t + h) / h * np.exp(-h / (2.5 * bright))
    s /= np.max(np.abs(s)) + 1e-9
    return s * env(n, 0.004, length * 0.35)


def pad(freqs, length, attack=0.6):
    n = int(length * SR)
    t = t_of(n)
    s = np.zeros(n)
    for f0 in freqs:
        for det in (-0.3, 0.3):
            f = f0 * (1 + det / 100)
            for h in range(1, 6):
                s += np.sin(2 * np.pi * f * h * t + rng.uniform(0, 6)) / (h * h)
    s /= np.max(np.abs(s)) + 1e-9
    e = np.clip(t / attack, 0, 1) * np.clip((length - t) / 0.4, 0, 1)
    return s * e


def crash():
    n = int(2.0 * SR)
    noise = fft_filter(rng.standard_normal(n), lo=4000)
    return noise * env(n, 0.002, 0.6) * 0.35


def riser(length):
    n = int(length * SR)
    t = t_of(n)
    noise = fft_filter(rng.standard_normal(n), lo=1200)
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1400 * (t / length) ** 2) / SR)
    e = (t / length) ** 2.2
    return (noise * 0.5 + sweep * 0.25) * e


def impact():
    n = int(2.2 * SR)
    t = t_of(n)
    f = 30 + 60 * np.exp(-t / 0.08)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.7)
    hit = fft_filter(rng.standard_normal(n), hi=3000) * np.exp(-t / 0.05) * 0.6
    return np.tanh(1.5 * (boom + hit))


def whoosh(length=0.6, rising=True):
    n = int(length * SR)
    t = t_of(n)
    noise = rng.standard_normal(n)
    cut = (500 + 6000 * (t / length) ** 1.5) if rising else (6500 - 6000 * (t / length) ** 0.7)
    s = onepole_lp(noise, cut) - onepole_lp(noise, cut * 0.35)
    shape = np.sin(np.pi * t / length) ** 2
    return s * shape * 1.2


def click():
    n = int(0.03 * SR)
    t = t_of(n)
    return np.sin(2 * np.pi * 2200 * t) * np.exp(-t / 0.004) * 0.5


def key_tap():
    n = int(0.04 * SR)
    return fft_filter(rng.standard_normal(n), lo=2500, hi=9000) * env(n, 0.0005, 0.006) * 0.4


def pop(up=True):
    n = int(0.12 * SR)
    t = t_of(n)
    f = (500 + 900 * (t / 0.12)) if up else (1400 - 800 * (t / 0.12))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.04) * 0.6


def ding():
    n = int(2.5 * SR)
    t = t_of(n)
    f0 = 1046.5  # C6
    s = sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / d)
            for r, a, d in ((1, 1, 1.2), (2.76, 0.4, 0.5), (5.4, 0.2, 0.25), (8.93, 0.1, 0.12)))
    return s * 0.35


def reverb(sig, length=1.6, mix=0.25):
    n = int(length * SR)
    ir = rng.standard_normal((n, 2)) * np.exp(-t_of(n) / (length / 5))[:, None]
    ir[:, 0] = fft_filter(ir[:, 0], hi=6000)
    ir[:, 1] = fft_filter(ir[:, 1], hi=6000)
    out = np.empty_like(sig)
    m = len(sig) + n
    for c in range(2):
        out[:, c] = np.fft.irfft(np.fft.rfft(sig[:, c], m) * np.fft.rfft(ir[:, c], m), m)[: len(sig)]
    out /= np.max(np.abs(out)) + 1e-9
    return sig + out * mix * np.max(np.abs(sig))


# ---------- harmony ----------
def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


CHORDS = [  # per bar, cycling: Fm9, Dbmaj7, Ebsus/Eb, Cm7
    (41, [65, 68, 72, 75, 79]),   # F: F Ab C Eb G
    (37, [65, 68, 72, 77]),       # Db: F Ab C F (Dbmaj7 voicing over Db root)
    (39, [67, 70, 72, 75]),       # Eb: G Bb C Eb
    (36, [67, 70, 72, 75]),       # C: G Bb C Eb (Cm7)
]
LOG_PATTERN = [(3, 12), (6, 0), (10, 7), (11, 12), (14, 0)]  # (16th step, semitone offset from root+12)
CONGA_PATTERN = [(2, 330), (7, 220), (10, 330), (12, 220), (15, 260)]
STAB_PATTERN = [2, 6, 11, 14]


def swing(step):
    return 0.018 if step % 2 == 1 else 0.0


def bar_time(b, step=0):
    return b * BAR + step * STEP + swing(step)


# ---------- arrangement ----------
K, CL = kick(), clap()
HO, HC, SH = hat(True), hat(False), shaker()
SN = snare()

sections = {
    "hook": range(0, 2), "logo": range(2, 3), "montage": range(3, 7),
    "editor": range(7, 10), "live": range(10, 13), "cta": range(13, 15),
}
intro_drums = stereo()

for b in range(15):
    root, notes = CHORDS[b % 4]
    full = b in sections["montage"] or b in sections["live"]
    light = b in sections["editor"] or b in sections["cta"]
    hook = b in sections["hook"]
    for beat in range(4):
        t = b * BAR + beat * BEAT
        if b == 2:
            continue  # logo bar breathes on the impact
        if b == 1 and beat == 3:
            continue  # drop-out before the impact
        if b == 12 and beat == 3:
            continue  # drop-out before the CTA hit
        if b == 14 and beat >= 2:
            continue  # ending
        place(intro_drums if hook else drums, K, t, 0.95)
        if (full or light or b == 1) and beat in (1, 3):
            place(intro_drums if hook else drums, CL, t, 0.55 if light else 0.7, 0.05)
        if full or (light and b < 14):
            place(drums, HO, t + BEAT / 2, 0.45 if full else 0.25, 0.25)
    for step in range(16):
        if b == 2 or (b == 14 and step >= 8) or (b in (1, 12) and step >= 12):
            continue
        acc = 1.0 if step % 4 == 2 else 0.6
        place(intro_drums if hook else drums, SH, bar_time(b, step), 0.5 * acc, -0.35)
        if full and step % 2 == 1:
            place(drums, HC, bar_time(b, step), 0.25, 0.4)
    if full:
        for step, f in CONGA_PATTERN:
            place(drums, conga(f), bar_time(b, step), 0.55, -0.5 if f > 250 else 0.3)
    if full or light:
        for step, semi in LOG_PATTERN:
            if (b == 12 and step >= 12) or (b == 14 and step >= 8):
                continue
            place(bass, log_drum(hz(root + 12 + semi)), bar_time(b, step), 0.9 if full else 0.65)
        # sub root on the one
        if not (b == 14):
            n = int(BAR * 0.9 * SR)
            sub = np.sin(2 * np.pi * hz(root) * t_of(n)) * env(n, 0.01, 0.6) * 0.45
            place(bass, sub, b * BAR)
    if full:
        bright = 1.0 if b in sections["montage"] else 1.6
        for step in STAB_PATTERN:
            if b == 12 and step >= 12:
                continue
            place(music, chord_stab([hz(m) for m in notes], bright=bright), bar_time(b, step), 0.32, 0.2 if step % 2 else -0.2)

# intro lowpass opening (hook 0-4s): 300 Hz -> 16 kHz
hook_n = int(2 * BAR * SR)
cut = 300 * (16000 / 300) ** (np.linspace(0, 1, hook_n) ** 1.6)
for c in range(2):
    intro_drums[:hook_n, c] = onepole_lp(intro_drums[:hook_n, c], cut)
drums += intro_drums

# pads: logo swell, editor bed, cta bed
place(music, np.stack([pad([hz(m) for m in CHORDS[0][1]], 2.6)] * 2, axis=1), 3.9, 0.35)
for b in sections["editor"]:
    root, notes = CHORDS[b % 4]
    place(music, np.stack([pad([hz(m) for m in notes], BAR + 0.1, 0.3)] * 2, axis=1), b * BAR, 0.18)
place(music, np.stack([pad([hz(m) for m in CHORDS[0][1]], 4.0, 0.05)] * 2, axis=1), 26.0, 0.3)

# ---------- fx ----------
cues = {}
place(fx, riser(2.0), 2.0, 0.55)
place(fx, impact(), 4.0, 0.9); cues["impact_logo"] = 4.0
place(fx, crash(), 4.0, 0.6, 0.3)
place(fx, riser(1.0), 5.0, 0.35)
place(fx, crash(), 6.0, 0.5, -0.3); cues["drop"] = 6.0
# montage whooshes on every bar line plus first cuts
for t in (6.0, 8.0, 10.0, 12.0):
    place(fx, whoosh(0.5), t - 0.25, 0.35, rng.uniform(-0.6, 0.6))
place(fx, whoosh(0.7, rising=False), 13.75, 0.4)
# editor UI sounds (scene choreography uses the same cue times)
editor_cues = {"cursor_click": 14.5, "type_start": 15.0, "type_end": 16.5, "colour_swap": 17.0,
               "colour_swap_2": 17.5, "dark_toggle": 18.0, "publish_click": 19.0}
cues.update(editor_cues)
place(fx, click(), 14.5, 0.6)
tt = 15.0
while tt < 16.5:
    place(fx, key_tap(), tt + rng.uniform(-0.01, 0.01), rng.uniform(0.35, 0.6), rng.uniform(-0.2, 0.2))
    tt += STEP / 2 * rng.choice([1, 1, 2])
place(fx, pop(True), 17.0, 0.5); place(fx, pop(True), 17.5, 0.45)
place(fx, click(), 18.0, 0.6); place(fx, whoosh(0.4, rising=False), 18.0, 0.3)
place(fx, click(), 19.0, 0.6); place(fx, riser(1.0), 19.0, 0.35)
place(fx, crash(), 20.0, 0.5); cues["live"] = 20.0
place(fx, whoosh(0.5), 21.75, 0.3); place(fx, whoosh(0.5), 23.75, 0.3)
# snare roll bar 12 (24-26): 16ths then 32nds, crescendo, stops before the hit
roll_t, k = 24.0, 0
while roll_t < 25.5:
    g = 0.15 + 0.6 * ((roll_t - 24) / 1.5) ** 1.5
    place(drums, SN, roll_t, g, 0.1)
    roll_t += STEP if roll_t < 25.0 else STEP / 2
place(fx, riser(2.0), 24.0, 0.5)
# CTA hit
place(fx, impact(), 26.0, 0.85); place(fx, crash(), 26.0, 0.6); place(drums, K, 26.0, 1.0)
place(music, chord_stab([hz(m) for m in CHORDS[0][1]], 1.2, 1.4), 26.0, 0.45)
place(fx, ding(), 26.5, 0.55, 0.15); cues["cta_hit"] = 26.0; cues["url_ding"] = 26.5
place(fx, impact(), 29.0, 0.5)
place(music, chord_stab([hz(m) for m in CHORDS[0][1]], 1.0, 1.2), 29.0, 0.4); cues["final_hit"] = 29.0
place(drums, K, 29.0, 0.9)

# ---------- mix ----------
fx = reverb(fx, 1.4, 0.3)
music = reverb(music, 1.8, 0.35)

# sidechain duck bass + music on each kick
duck = np.ones(N)
for b in range(15):
    for beat in range(4):
        i = int((b * BAR + beat * BEAT) * SR)
        n = int(0.22 * SR)
        j = min(N, i + n)
        duck[i:j] = np.minimum(duck[i:j], 1 - 0.55 * np.exp(-t_of(j - i) / 0.07))
bass *= duck[:, None]
music *= duck[:, None]

stems = {"drums": drums * 0.8, "bass": bass * 0.75, "music": music * 0.55, "fx": fx * 0.6}
mix = sum(stems.values())
mix = np.tanh(mix * 1.1)
# fade final tail
fade_n = int(0.8 * SR)
mix[-fade_n:] *= np.linspace(1, 0, fade_n)[:, None]
peak = np.max(np.abs(mix))
scale = 0.89 / peak  # about -1 dBFS


def write(path, sig):
    data = np.clip(sig, -1, 1)
    pcm = (data * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


write(OUT / "beat_120.wav", mix * scale)
for name, s in stems.items():
    write(OUT / f"stem_{name}.wav", s * scale)
(OUT / "cues.json").write_text(json.dumps({"bpm": BPM, "bar": BAR, "duration": DUR, "cues": cues}, indent=2))
print("ok peak", round(float(peak), 3), "->", OUT)
