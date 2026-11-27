import { pathToFileURL } from 'node:url'
const esbuild = await import(pathToFileURL('F:/worktrees/cover-me/feat-346-generate-job-c-52a42573a8488441/extension/node_modules/.pnpm/esbuild@0.21.5/node_modules/esbuild/lib/main.js').href)
const r = await esbuild.build({ entryPoints: ['entry.ts'], bundle: true, format: 'iife', globalName: '__cm', write: false, minify: true, target: 'chrome120' })
const fs = await import('node:fs')
fs.writeFileSync('probe.js', r.outputFiles[0].text + '\n__cm.read()\n')
console.log('bytes', r.outputFiles[0].text.length)
