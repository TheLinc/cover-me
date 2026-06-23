import { defineConfig, type Plugin } from 'vite'
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

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
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
})
