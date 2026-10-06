import { build, defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

// jsPDF's `pdfobjectnewwindow` output mode hardcodes a cdnjs URL and injects it
// as a <script> at runtime — remotely hosted code, which Manifest V3 forbids and
// the Chrome Web Store rejects on static scan (ref "Blue Argon"). We never use
// that output mode (only doc.save()), so the branch is dead code — but its mere
// presence in the bundle trips the scanner. Neutralize the URL in every final
// chunk so dist/ carries no remotely-hosted-code signature.
function stripJsPdfRemoteCode(): Plugin {
  const REMOTE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.1.1/pdfobject.min.js'
  // Any remote-hosted .js URL the Web Store scanner would flag as remote code.
  const REMOTE_JS = /https?:\/\/[^\s"'`]+\.js\b/g
  return {
    name: 'strip-jspdf-remote-code',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== 'chunk') continue
        // Empty string → script src is "", loads nothing; no URL for the scanner.
        if (file.code.includes(REMOTE_URL)) {
          file.code = file.code.split(REMOTE_URL).join('')
        }
        // Guard: if a dep bump changed the URL (e.g. a new pdfobject version) the
        // strip above silently misses it. Fail the build loudly rather than ship a
        // remote-code URL to review. Catches any remote .js URL left in any chunk.
        const leftover = file.code.match(REMOTE_JS)
        if (leftover) {
          this.error(
            `[strip-jspdf-remote-code] ${file.fileName} still contains remote .js URL(s) after stripping: ` +
              `${[...new Set(leftover)].join(', ')}. ` +
              `Manifest V3 forbids remotely hosted code — update the strip rule before building.`,
          )
        }
      }
    },
  }
}

// The scrapers are injected on click with chrome.scripting.executeScript({ files }),
// not declared in manifest.content_scripts, so nothing runs on a page until the
// user opens the popup there. executeScript needs one classic (non-module) file,
// and CRXJS 2.4's `?script&iife` isn't implemented while its `?script` loader
// exposes the chunk to every site via web_accessible_resources. So build
// src/content/index.ts separately as an IIFE at dist/content.js
// (CONTENT_SCRIPT_FILE, used by the background). Extension files injected by
// executeScript don't need to be web-accessible.
export const CONTENT_SCRIPT_FILE = 'content.js'

function contentScriptIife(): Plugin {
  const iifeBuild = (write: boolean) =>
    build({
      configFile: false,
      logLevel: 'warn',
      esbuild: { legalComments: 'none' },
      build: {
        write,
        outDir: 'dist',
        emptyOutDir: false,
        copyPublicDir: false,
        lib: { entry: 'src/content/index.ts', formats: ['iife'], name: 'coverMeContent', fileName: () => CONTENT_SCRIPT_FILE },
      },
    })
  return {
    name: 'content-script-iife',
    async generateBundle() {
      const [out] = (await iifeBuild(false)) as { output: { code: string }[] }[]
      this.emitFile({ type: 'asset', fileName: CONTENT_SCRIPT_FILE, source: out.output[0].code })
    },
    configureServer(server) {
      // Dev (`pnpm dev`): CRXJS serves from dist/, so write the file there and
      // rebuild it when a scraper changes.
      const rebuild = () => iifeBuild(true).catch((e) => server.config.logger.error(String(e)))
      rebuild()
      server.watcher.on('change', (file) => {
        if (file.replace(/\\/g, '/').includes('/src/content/')) rebuild()
      })
    },
  }
}

// `--mode localdb` (pnpm dev / build:local) targets the local Supabase
// stack from .env.localdb, so the service worker also needs host access to it.
// Production builds use manifest.json unchanged.
const LOCAL_SUPABASE = 'http://127.0.0.1:54321/*'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    crx({
      manifest: mode === 'localdb'
        ? { ...manifest, host_permissions: [...manifest.host_permissions, LOCAL_SUPABASE] }
        : manifest,
    }),
    contentScriptIife(),
    stripJsPdfRemoteCode(),
  ],
  // Drop attribution/legal comments from minified output. Some bundled deps
  // (jsPDF's md5 + pdfkit notes) carry comment URLs that, while not executable,
  // are needless remote-URL strings in the package the Web Store scanner sees.
  esbuild: {
    legalComments: 'none',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
  },
}))
