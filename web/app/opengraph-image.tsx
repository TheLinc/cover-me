import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const alt = 'Cover Me: one resume doesn’t fit every job'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// `spec` is a Google Fonts css2 family spec, e.g. "Bodoni Moda:ital,wght@1,500".
// No User-Agent → Google Fonts returns TTF, which satori requires (it can't parse woff2).
async function fetchFont(spec: string): Promise<ArrayBuffer> {
  const css = await fetch(`https://fonts.googleapis.com/css2?${new URLSearchParams({ family: spec })}`).then((r) => r.text())
  const url = css.match(/src: url\(([^)]+)\) format\('truetype'\)/)?.[1]
  if (!url) throw new Error(`Font not found: ${spec}`)
  return fetch(url).then((r) => r.arrayBuffer())
}

export default async function Image() {
  const [display, displayItalic, mono, scene] = await Promise.all([
    fetchFont('Bodoni Moda:wght@500'),
    fetchFont('Bodoni Moda:ital,wght@1,500'),
    fetchFont('IBM Plex Mono:wght@500'),
    readFile(join(process.cwd(), 'public/brand/hero-scene.svg')),
  ])
  const sceneSrc = `data:image/svg+xml;base64,${scene.toString('base64')}`

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#F2EADB', color: '#1C1A17' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 640, padding: '64px 40px 56px 72px' }}>
          <div style={{ display: 'flex', fontFamily: 'Plex Mono', fontSize: 16, letterSpacing: 3, color: '#5E574C' }}>
            COVER ME · CHROME EXTENSION
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'Bodoni', fontSize: 84, lineHeight: 1, letterSpacing: -1.5 }}>
            <span>One resume</span>
            <span style={{ display: 'flex' }}>
              doesn’t fit&nbsp;<span style={{ fontStyle: 'italic', color: '#C4321F' }}>every</span>
            </span>
            <span>job.</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'Plex Mono',
              fontSize: 16,
              letterSpacing: 2,
              color: '#5E574C',
              borderTop: '2px dashed #B3A489',
              paddingTop: 18,
            }}
          >
            <span>TAILORED TO EVERY POSTING</span>
            <span>COVER-ME.DEV</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 560 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sceneSrc} width={540} height={383} alt="" />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Bodoni', data: display, weight: 500, style: 'normal' },
        { name: 'Bodoni', data: displayItalic, weight: 500, style: 'italic' },
        { name: 'Plex Mono', data: mono, weight: 500, style: 'normal' },
      ],
    },
  )
}
