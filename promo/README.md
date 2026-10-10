# Sulva Sites promo video

A 30-second promo in two formats: 16:9 for YouTube and the website, 9:16 for Reels, TikTok and WhatsApp Status.
The beat is original (made in code), so there are no music licensing issues.

## Files

| Path | What it is |
| --- | --- |
| `out/promo_16x9.mp4` | Finished 1920×1080 30 fps video with the beat |
| `out/promo_9x16.mp4` | Finished 1080×1920 vertical video with the beat |
| `audio/beat_120.wav` | Full beat mix (120 BPM Afro-house, F minor, 30 s) |
| `audio/stem_*.wav` | Stems for mixing: drums, bass, music, fx |
| `audio/cues.json` | Times of each hit and UI sound |
| `resolve/Sulva Promo Builder.lua` | DaVinci Resolve script that builds the project |

## Timeline (120 BPM, 2 s bars)

| Time | Scene | Sound |
| --- | --- | --- |
| 0–4 s | Hook: search bar, then "Can they find *you?*" | Filtered groove opens up, riser |
| 4–6 s | Logo reveal | Sub boom and crash on 4.0 |
| 6–14 s | Template montage, cutting on every beat from 9 s; wall of 17 at 13 s | Full drop |
| 14–20 s | Editor: name typed, colour changed, dark mode, Publish | UI clicks, typing, pops |
| 20–26 s | "Live in *minutes.*", laptop and phone, feature badges | Groove back in, snare roll, drop-out at 25.5 |
| 26–30 s | "Start *free.*", URL, 7-day trial, launch price | Big hit, ding on the URL, final hit at 29 |

## Finishing in DaVinci Resolve

1. Open Resolve, then **Workspace → Scripts → Sulva Promo Builder**.
   (The script is installed in `%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Fusion\Scripts\Utility`.)
2. It creates the project **Sulva Sites Promo** with the timelines **Promo 16x9** and **Promo 9x16**:
   picture on V1, and the drums, bass, music and fx stems on A1–A4, with markers on every scene and hit.
3. Balance the stems in Fairlight, grade, or add anything you like.
4. Export from **Deliver**: the YouTube preset for 16:9, the TikTok or Instagram preset (1080×1920) for 9:16.

If you don't need changes, upload the files in `out/` as they are.

## Regenerating

Needs Node, Python with `numpy` and `imageio-ffmpeg`, and Playwright's cached Chromium.

```bash
python promo/beat.py                                   # beat, stems, cues
node promo/capture.mjs http://localhost:3000           # app screenshots (dev server must be running)
node promo/render.mjs stills h                         # quick check frames -> out/stills
node promo/render.mjs video h                          # out/promo_16x9.mp4
node promo/render.mjs video v                          # out/promo_9x16.mp4
```

Scenes live in `scenes/promo.html`. Every frame is drawn by `render(t)` from the time alone, so renders are
frame-exact; change copy or timing there. You can open the page in a browser with `?t=17.2` (and `&v=1` for
vertical) to see a single frame.
