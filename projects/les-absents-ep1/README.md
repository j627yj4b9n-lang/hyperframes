# LES ABSENTS — Épisode 1 « 03:17 »

Vertical (1080×1920) 60-second horror short, made with HyperFrames + three.js.

- `docs/01_BIBLE_SERIE.md` — series bible (concept, rules, characters, twists, ending)
- `docs/02_EPISODE_01_03h17.md` — episode 1 shot list, AI-video prompts, sound plan, vote texts, both episode 2 branches
- `docs/03_EPISODES_02_A_14.md` — full scripts of episodes 3–14 and the clue map

## Rebuild the media (not committed: large binaries)

```bash
python3 scripts/fetch_characters.py   # Microsoft Rocketbox avatars (MIT) + textures
python3 scripts/build_audio.py        # dialogue: ElevenLabs voices (fallback: Edge neural voices) + lip-sync data
python3 scripts/build_sfx.py          # horror drone and effects (ffmpeg, deterministic)
npx hyperframes render -o renders/les-absents-ep01.mp4
```

`build_audio.py` needs a valid ElevenLabs key on the proxy; with `--force-eleven` it fails instead of falling back.
