import { PatternNote } from '@/components/brand/PatternNote'
import { cn } from '@/lib/utils'
import { COMPARE_COLS, COMPARE_ROWS, type CellVal } from './content'

const SUBTITLES = [null, 'ChatGPT, Claude', 'Jasper, Copy.ai']
const OURS_BG = 'bg-[rgba(196,50,31,0.08)]'

function Cell({ val, ours }: { val: CellVal; ours: boolean }) {
  if (typeof val === 'string') {
    return <span className={ours ? 'font-semibold text-thread-deep' : 'text-ink-2'}>{val}</span>
  }
  return val ? (
    <>
      <span aria-hidden="true" className={ours ? 'text-thread-deep' : 'text-ink'}>✓</span>
      <span className="sr-only">Yes</span>
    </>
  ) : (
    <>
      <span aria-hidden="true" className="text-line">—</span>
      <span className="sr-only">No</span>
    </>
  )
}

// Styled as a garment size chart.
export function Compare() {
  return (
    <section className="py-28 max-md:py-20">
      <div className="container">
        <div className="reveal mb-12 flex max-w-[640px] flex-col gap-4">
          <PatternNote>Compare</PatternNote>
          <h2 className="text-[clamp(34px,4.4vw,58px)] leading-none text-ink">Cover Me vs. the alternatives</h2>
          <p className="text-[16px] leading-[1.7] text-ink-2">
            General AI tools require manual copy-paste and can&apos;t tailor your resume. Cover Me does both — automatically.
          </p>
        </div>
        <div className="reveal overflow-x-auto">
          <table className="w-full min-w-[640px] max-w-[880px] border-collapse text-[14px]">
            <thead>
              <tr className="border-b-[1.5px] border-ink">
                <th scope="col" className="w-[40%] py-4 pr-4 text-left font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-ink-2">
                  Feature
                </th>
                {COMPARE_COLS.map((col, i) => (
                  <th
                    key={col}
                    scope="col"
                    className={cn(
                      'px-4 py-4 text-center font-mono text-[11px] font-normal uppercase tracking-[0.14em]',
                      i === 0 ? cn(OURS_BG, 'text-thread-deep') : 'text-ink-2',
                    )}
                  >
                    {col}
                    {i === 0 && <span className="mt-1 block text-[10px] normal-case tracking-normal">You&apos;re here</span>}
                    {SUBTITLES[i] && <span className="mt-1 block text-[11px] normal-case tracking-normal">{SUBTITLES[i]}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map(({ feature, vals }) => (
                <tr key={feature} className="border-b border-dashed border-line">
                  <th scope="row" className="py-3.5 pr-4 text-left font-normal text-ink">{feature}</th>
                  {vals.map((v, i) => (
                    <td key={i} className={cn('px-4 py-3.5 text-center', i === 0 && OURS_BG)}>
                      <Cell val={v} ours={i === 0} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-2">
            Feature comparison based on publicly available information as of June 2026.
          </p>
        </div>
      </div>
    </section>
  )
}
