import { ImageResponse } from 'next/og'

export const alt = 'Cover Me: your resume and cover letter, tailored to every job'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// `spec` is a Google Fonts css2 family spec, e.g. "Geist:wght@600".
// No User-Agent → Google Fonts returns TTF, which satori requires (it can't parse woff2).
async function fetchFont(spec: string): Promise<ArrayBuffer> {
  const css = await fetch(`https://fonts.googleapis.com/css2?${new URLSearchParams({ family: spec })}`).then((r) => r.text())
  const url = css.match(/src: url\(([^)]+)\) format\('truetype'\)/)?.[1]
  if (!url) throw new Error(`Font not found: ${spec}`)
  return fetch(url).then((r) => r.arrayBuffer())
}

const chip = (label: string, gap = false) => (
  <div
    key={label}
    style={{
      display: 'flex',
      padding: '6px 12px',
      borderRadius: 999,
      fontSize: 15,
      background: gap ? '#3B2416' : '#262B55',
      color: gap ? '#FDBA74' : '#C7D2FE',
    }}
  >
    {label}
  </div>
)

export default async function Image() {
  const [semibold, regular, mono] = await Promise.all([
    fetchFont('Geist:wght@600'),
    fetchFont('Geist:wght@400'),
    fetchFont('Geist Mono:wght@500'),
  ])

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', background: '#F5F3F2', padding: '0 72px', gap: 56 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 28 }}>
          <div style={{ display: 'flex', fontFamily: 'Geist Mono', fontSize: 17, letterSpacing: 2, color: '#4F46E5' }}>COVER ME · CHROME EXTENSION</div>
          <div style={{ display: 'flex', fontFamily: 'Geist', fontWeight: 600, fontSize: 68, lineHeight: 1.04, letterSpacing: -2.5, color: '#1E1B4B' }}>
            Your resume and cover letter, tailored to every job.
          </div>
          <div style={{ display: 'flex', fontFamily: 'Geist', fontSize: 24, color: '#5A534D' }}>One click on any job posting. Free to start.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', width: 380, borderRadius: 24, background: '#11131F', padding: 32, gap: 20, color: '#E6E8F4', fontFamily: 'Geist' }}>
          <div style={{ display: 'flex', fontSize: 18, fontWeight: 600 }}>Cover Me</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <div style={{ display: 'flex', fontSize: 96, fontWeight: 600, letterSpacing: -4, lineHeight: 1 }}>86</div>
            <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'Geist Mono', fontSize: 14, color: '#94A3C8', letterSpacing: 1.5 }}>
              <span>% ATS MATCH</span>
              <span style={{ color: '#8B9CF8' }}>+32 AFTER TAILORING</span>
            </div>
          </div>
          <div style={{ display: 'flex', height: 12, borderRadius: 999, background: '#262B55' }}>
            <div style={{ display: 'flex', width: '86%', borderRadius: 999, background: '#6366F1' }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {chip('SEO')}
            {chip('Google Analytics')}
            {chip('Budget management')}
            {chip('HubSpot', true)}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Geist', data: semibold, weight: 600, style: 'normal' },
        { name: 'Geist', data: regular, weight: 400, style: 'normal' },
        { name: 'Geist Mono', data: mono, weight: 500, style: 'normal' },
      ],
    },
  )
}
