// Mixes the score and the UI sounds under a rendered video, normalized to -14 LUFS (YouTube's target).
//   node mix.mjs out/16x9/silent.mp4 out/16x9/draft.mp4
import { execFileSync } from 'node:child_process'

const [video = 'out/16x9/silent.mp4', out = 'out/16x9/final.mp4'] = process.argv.slice(2)
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-i', 'out/music.wav', '-i', 'out/sfx.wav', '-filter_complex',
  '[1:a]volume=0.8[m];[2:a]volume=0.6[s];[m][s]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]',
  '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' })
console.log('mixed →', out)
