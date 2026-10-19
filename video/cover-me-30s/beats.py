"""Beat grid for the shot list and the animation. Writes JSON to stdout.

  python beats.py track.wav > beats.json          measure a supplied track (pip install numpy librosa soundfile)
  python beats.py --bpm 120 --dur 30 > beats.json  no track yet, or the score is synthesized: an exact grid

beats: state changes go here. downbeats: big moments and cuts. hits: SFX go here.
"""
import json
import sys


def grid(bpm, dur, offset=0.0):
    step = 60.0 / bpm
    beats = [round(offset + i * step, 3) for i in range(int((dur - offset) / step) + 1)]
    return {"bpm": bpm, "beats": beats, "downbeats": beats[::4], "hits": beats}


def measure(path):
    import librosa
    import numpy as np

    y, sr = librosa.load(path, sr=None, mono=True)
    tempo, frames = librosa.beat.beat_track(y=y, sr=sr, units="frames")
    beats = librosa.frames_to_time(frames, sr=sr).round(3).tolist()
    onset = librosa.onset.onset_strength(y=y, sr=sr)
    peaks = librosa.util.peak_pick(onset, pre_max=3, post_max=3, pre_avg=3, post_avg=5, delta=0.5, wait=10)
    return {
        "bpm": float(np.atleast_1d(tempo)[0]),
        "duration": round(len(y) / sr, 3),
        "beats": beats,
        "downbeats": beats[::4],
        "hits": librosa.frames_to_time(peaks, sr=sr).round(3).tolist(),
    }


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--bpm" in args:
        get = lambda k, d: float(args[args.index(k) + 1]) if k in args else d
        out = grid(get("--bpm", 120), get("--dur", 30), get("--offset", 0))
    elif args:
        out = measure(args[0])
    else:
        sys.exit(__doc__)
    json.dump(out, sys.stdout, indent=1)
