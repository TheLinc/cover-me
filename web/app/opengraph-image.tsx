import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const alt         = 'Cover Me — AI cover letters in seconds'
export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function fetchFont(family: string, weight: number): Promise<ArrayBuffer> {
  // No User-Agent → Google Fonts returns TTF (truetype), which is what satori
  // requires. A modern browser UA triggers woff2, which satori cannot parse.
  const params = new URLSearchParams({ family: `${family}:wght@${weight}` })
  const css    = await fetch(`https://fonts.googleapis.com/css2?${params}`)
    .then((r) => r.text())

  const url = css.match(/src: url\(([^)]+)\) format\('truetype'\)/)?.[1]
  if (!url) throw new Error(`Font not found: ${family} ${weight}`)
  return fetch(url).then((r) => r.arrayBuffer())
}

export default async function Image() {
  const [bold, extrabold, logoData] = await Promise.all([
    fetchFont('Plus Jakarta Sans', 700),
    fetchFont('Plus Jakarta Sans', 800),
    readFile(join(process.cwd(), 'public/logo.png')),
  ])

  const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#0d1117',
          padding: '72px 80px',
          position: 'relative',
          fontFamily: '"Plus Jakarta Sans"',
          overflow: 'hidden',
        }}
      >
        {/* Background glow — top right */}
        <div
          style={{
            position: 'absolute',
            top: -160,
            right: -120,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 65%)',
          }}
        />
        {/* Background glow — bottom left */}
        <div
          style={{
            position: 'absolute',
            bottom: -200,
            left: -100,
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 65%)',
          }}
        />

        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={34} height={34} alt="" style={{ borderRadius: 6 }} />
          <span style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px' }}>
            Cover Me
          </span>
        </div>

        {/* Main headline */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', gap: 0 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              color: '#e2e8f0',
              lineHeight: 1.05,
              letterSpacing: '-3px',
            }}
          >
            The cover letter
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              color: '#e2e8f0',
              lineHeight: 1.05,
              letterSpacing: '-3px',
            }}
          >
            that gets you
          </div>
          {/* "hired." in brand gradient */}
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-3px',
              background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 55%, #4338ca 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            hired.
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginTop: 40,
          }}
        >
          <p
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: '-0.2px',
              margin: 0,
            }}
          >
            One click per posting.{' '}
            <span style={{ color: '#e2e8f0' }}>Keywords matched. Letter built from your resume.</span>
          </p>
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: '#475569',
            }}
          >
            cover-me.dev
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Plus Jakarta Sans', data: bold,      weight: 700, style: 'normal' },
        { name: 'Plus Jakarta Sans', data: extrabold, weight: 800, style: 'normal' },
      ],
    },
  )
}
