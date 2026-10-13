#!/usr/bin/env python3
"""Render a vertical product video using FFmpeg only."""
import json, os, re, subprocess, math, wave, struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTDIR = ROOT
OUT = ROOT / "mukhallat-product-video.mp4"
AUDIO = ROOT / "voiceover.mp3"
IMAGE = ROOT / "product.jpg"
BRAND = json.loads((ROOT / "brand.json").read_text(encoding="utf-8"))
SOURCE = ROOT / "subtitles.srt"
if not SOURCE.exists():
    SOURCE = ROOT / "subtitles_source.txt"

def run(cmd):
    print("+", " ".join(map(str, cmd)))
    subprocess.run(list(map(str, cmd)), check=True)

def probe_duration(path):
    raw = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(path)
    ], text=True).strip()
    return float(raw)

def parse_time(t):
    h, m, rest = t.split(":")
    s, ms = rest.split(",")
    return int(h)*3600 + int(m)*60 + int(s) + int(ms)/1000

def fmt_time(t):
    t = max(0.0, t)
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"

def read_subtitles(path, duration):
    text = path.read_text(encoding="utf-8-sig")
    blocks = re.split(r"\n\s*\n", text.strip())
    items = []
    for block in blocks:
        lines = block.strip().splitlines()
        timing = next((line for line in lines if "-->" in line), None)
        if not timing:
            continue
        left, right = [x.strip().split()[0] for x in timing.split("-->")]
        try:
            start, end = parse_time(left), parse_time(right)
        except Exception:
            continue
        caption_lines = lines[lines.index(timing)+1:]
        caption = "\n".join(caption_lines).strip()
        if caption:
            items.append((start, end, caption))
    if not items:
        print("No valid timestamped subtitles found; continuing without captions.")
        return None
    source_end = max(end for _, end, _ in items)
    # The supplied timestamp file is 67 s, while the voice recording is ~60.4 s.
    scale = duration / source_end if source_end > duration else 1.0
    out = ROOT / "captions_rendered.srt"
    with out.open("w", encoding="utf-8") as f:
        for i, (start, end, caption) in enumerate(items, 1):
            start = min(duration, start * scale)
            end = min(duration, max(start + 0.15, end * scale))
            safe_caption = caption.replace("\r", "").strip()
            f.write(f"{i}\n{fmt_time(start)} --> {fmt_time(end)}\n{safe_caption}\n\n")
    return out

def make_sfx(path, duration=0.85, kind="whoosh"):
    # Small synthesized sound effect; no external downloads or emoji assets.
    sr = 44100
    n = int(sr * duration)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        data = bytearray()
        for i in range(n):
            t = i / sr
            p = i / max(1, n-1)
            if kind == "impact":
                env = math.exp(-t*8)
                freq = 105 - 35*p
                val = (math.sin(2*math.pi*freq*t) * 0.55 +
                       math.sin(2*math.pi*freq*2.03*t) * 0.16) * env
            else:
                env = (math.sin(math.pi*p) ** 1.4) * (0.3 + 0.7*p)
                # layered smooth tones create a short cinematic sweep
                val = (math.sin(2*math.pi*(180+720*p)*t) * 0.38 +
                       math.sin(2*math.pi*(360+1100*p)*t) * 0.18) * env
            data.extend(struct.pack("<h", int(max(-1, min(1, val*0.65))*32767)))
        w.writeframes(data)

for p in (AUDIO, IMAGE, SOURCE):
    if not p.exists():
        raise SystemExit(f"Required input missing: {p}")

duration = probe_duration(AUDIO)
captions = read_subtitles(SOURCE, duration)
hook = ROOT / "sfx_hook.wav"
whoosh = ROOT / "sfx_whoosh.wav"
if not hook.exists(): make_sfx(hook, 0.75, "impact")
if not whoosh.exists(): make_sfx(whoosh, 0.65, "whoosh")

# Text overlays are generated as UTF-8 files so FFmpeg safely reads brand strings.
text_specs = [
    ("product", BRAND.get("product_title", "MUKHALLAT AL EMIRATES")),
    ("subtitle", BRAND.get("subtitle", "PREMIUM PERFUME OIL")),
    ("brand", BRAND.get("brand", "ELANCE FRAGRANCES")),
    ("cta", BRAND.get("cta", "ORDER NOW")),
    ("website", BRAND.get("website", ""))
]
for key, value in text_specs:
    (OUTDIR / f"{key}.txt").write_text(str(value), encoding="utf-8")

# Background is a softened, darkened fill; the product remains crisp in the foreground.
# Zoompan produces a subtle slow push-in across the complete voiceover.
filters = [
    "[0:v]split=2[bgsrc][prodsrc]",
    "[bgsrc]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
    "boxblur=28:12,eq=brightness=-0.48:saturation=0.72[bg]",
    "[prodsrc]scale=850:850:force_original_aspect_ratio=decrease,"
    "pad=850:850:(ow-iw)/2:(oh-ih)/2:color=black@0,"
    "zoompan=z='min(zoom+0.00018,1.12)':d=1:x='iw/2-(iw/zoom/2)':"
    "y='ih/2-(ih/zoom/2)':s=850x850:fps=30,format=rgba,colorchannelmixer=aa=1[prod]",
    "[bg][prod]overlay=(W-w)/2:(H-h)/2-40:shortest=1[base]"
]
# Luxurious gold hairline and title overlays. Timing is relative to narration.
accent = BRAND.get("accent", "#D9AD55").lstrip("#")
filters += [
    f"[base]drawbox=x=100:y=150:w=880:h=2:color=0x{accent}@0.9:t=fill,"
    f"drawbox=x=100:y=1770:w=880:h=2:color=0x{accent}@0.9:t=fill[v0]"
]
font_candidates = [
    "/usr/share/fonts/truetype/noto/NotoSans-Bengali-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
]
font = next((p for p in font_candidates if os.path.exists(p)), font_candidates[-1])
def esc(p):
    return str(p).replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
def drawtext(key, y, size, start, end, prev, nxt):
    filters.append(
        f"[{prev}]drawtext=fontfile='{esc(font)}':textfile='{esc(OUTDIR/(key+'.txt'))}':"
        f"fontcolor=white:fontsize={size}:x=(w-text_w)/2:y={y}:"
        f"shadowcolor=black@0.75:shadowx=2:shadowy=3:"
        f"enable='between(t,{start:.3f},{end:.3f})'[{nxt}]"
    )
drawtext("brand", 215, 30, 0, duration, "v0", "v1")
drawtext("product", 300, 44, 0, min(8.5,duration), "v1", "v2")
drawtext("subtitle", 365, 24, 0, min(8.5,duration), "v2", "v3")
drawtext("cta", 1590, 42, max(0,duration-7), duration, "v3", "v4")
drawtext("website", 1650, 22, max(0,duration-7), duration, "v4", "v5")
video_label = "v5"
if captions:
    # libass subtitle renderer supports Bengali when Noto fonts are installed.
    filters.append(f"[{video_label}]subtitles='{esc(captions)}':fontsdir='/usr/share/fonts/truetype/noto':"
                   "force_style='FontName=Noto Sans Bengali,FontSize=20,PrimaryColour=&H00FFFFFF,"
                   "OutlineColour=&HAA000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=250'[vout]")
    video_label = "vout"

# Audio: narration remains dominant; optional background music is gently ducked.
music = ROOT / "music.mp3"
if music.exists():
    # Inputs: 0 image, 1 voice, 2 hook, 3 whoosh, 4 music
    cmd = ["ffmpeg","-y","-loop","1","-i",str(IMAGE),"-i",str(AUDIO),
           "-i",str(hook),"-i",str(whoosh),"-stream_loop","-1","-i",str(music),
           "-filter_complex",
           ";".join(filters) +
           f";[1:a]volume=1.0[voice];"
           f"[2:a]adelay=350|350,volume=0.45[hit];"
           f"[3:a]adelay=1800|1800,volume=0.20[sweep];"
           f"[4:a]volume=0.10,afade=t=out:st={max(0,duration-2):.2f}:d=2[music];"
           f"[voice][hit][sweep][music]amix=inputs=4:duration=first:dropout_transition=2[aout]",
           "-map",f"[{video_label}]","-map","[aout]","-t",str(duration),
           "-r","30","-c:v","libx264","-preset","medium","-crf","19",
           "-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-movflags","+faststart",str(OUT)]
else:
    cmd = ["ffmpeg","-y","-loop","1","-i",str(IMAGE),"-i",str(AUDIO),
           "-i",str(hook),"-i",str(whoosh),
           "-filter_complex",
           ";".join(filters) +
           f";[1:a]volume=1.0[voice];"
           f"[2:a]adelay=350|350,volume=0.45[hit];"
           f"[3:a]adelay=1800|1800,volume=0.20[sweep];"
           f"[voice][hit][sweep]amix=inputs=3:duration=first:dropout_transition=2[aout]",
           "-map",f"[{video_label}]","-map","[aout]","-t",str(duration),
           "-r","30","-c:v","libx264","-preset","medium","-crf","19",
           "-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-movflags","+faststart",str(OUT)]
run(cmd)
print(f"Done: {OUT} ({duration:.2f}s)")
