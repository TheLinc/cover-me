'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { CopyIcon, ShieldIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const DEMO_PARAS = [
  `Having spent five years building fintech products at scale, the Senior Frontend Engineer role at Stripe stopped my scroll.`,
  `At Relay, I led a React migration that improved LCP by 40% and cut bundle size by 30% — precisely the engineering rigour Stripe's infrastructure demands.`,
  `I'd love to bring that focus to your team. Happy to connect at your convenience.`,
];

export function WorkflowDemo() {
  const [phase, setPhase] = useState(0);
  const [cursorRight, setCursorRight] = useState(11);
  const [cursorTop, setCursorTop] = useState(17);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorClicking, setCursorClicking] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reduced motion: skip the choreography and show the finished letter.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase(6);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          obs.disconnect();
          // Cursor appears at extension icon (top-right of browser chrome)
          timers.push(setTimeout(() => setCursorVisible(true), 400));
          // Click extension icon → popup opens (phase 1 = idle)
          timers.push(setTimeout(() => setCursorClicking(true), 1000));
          timers.push(setTimeout(() => { setCursorClicking(false); setPhase(1); }, 1260));
          // Idle visible for ~1.4s — cursor moves down to "Tailor Resume to Job" (bottom stacked button, centered)
          timers.push(setTimeout(() => { setCursorRight(132); setCursorTop(342); }, 2700));
          // Click "Tailor Resume to Job" → loading (phase 2)
          timers.push(setTimeout(() => setCursorClicking(true), 3500));
          timers.push(setTimeout(() => { setCursorClicking(false); setPhase(2); }, 3750));
          // ATS score appears (phase 3) after ~1.8s loading
          timers.push(setTimeout(() => setPhase(3), 5600));
          // Cursor moves to "New" ghost button (right side of phase-3 action row)
          timers.push(setTimeout(() => { setCursorRight(27); setCursorTop(310); }, 6350));
          // Click "New" → idle reset (phase 4)
          timers.push(setTimeout(() => setCursorClicking(true), 7100));
          timers.push(setTimeout(() => { setCursorClicking(false); setPhase(4); }, 7350));
          // Cursor moves to "Generate Cover Letter" (top stacked button, centered)
          timers.push(setTimeout(() => { setCursorRight(132); setCursorTop(310); }, 7900));
          // Click "Generate Cover Letter" → loading (phase 5)
          timers.push(setTimeout(() => setCursorClicking(true), 8650));
          timers.push(setTimeout(() => { setCursorClicking(false); setPhase(5); }, 8900));
          // Cover letter result (phase 6) after ~2s loading
          timers.push(setTimeout(() => setPhase(6), 10900));
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="relative border border-border rounded-[10px] overflow-hidden shadow-[0_28px_60px_-24px_rgba(28,26,23,0.35)]"
      aria-hidden="true"
      inert
      style={{ animation: "fadeUp 0.65s ease 0.25s both" }}
    >
      {/* Browser chrome */}
      <div className="h-9 bg-elevated border-b border-border flex items-center px-3 gap-2.5 shrink-0">
        <div className="flex gap-[5px] shrink-0">
          <span className="w-2.5 h-2.5 rounded-full block bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full block bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full block bg-[#28c840]" />
        </div>
        <div className="flex-1 bg-[rgba(28,26,23,0.06)] border border-border rounded-[4px] h-[22px] flex items-center gap-1.5 px-2.5 text-[10.5px] text-dim overflow-hidden whitespace-nowrap text-ellipsis tracking-[0.01em]">
          <ShieldIcon size={9} />
          linkedin.com/jobs/view/senior-frontend-engineer-stripe-2847019234
        </div>
        <div className="w-[26px] h-[26px] bg-surface border border-border rounded-[4px] flex items-center justify-center shrink-0">
          <Image src="/logo.png" width={14} height={14} alt="" />
        </div>
      </div>

      {/* Browser content */}
      <div className="flex h-[390px] bg-surface relative overflow-hidden max-[768px]:h-80 max-[540px]:h-[300px]">
        {/* Job listing */}
        <div className="flex-1 px-9 py-7 overflow-hidden max-[1100px]:px-6 max-[768px]:px-5 max-[540px]:px-4 max-[540px]:py-5">
          <div className="flex items-center gap-3.5 pb-5 border-b border-border mb-5">
            <div className="w-[42px] h-[42px] rounded-[6px] bg-gradient-to-br from-[#635bff] to-[#3b82f6] text-white text-[18px] font-extrabold flex items-center justify-center shrink-0">
              S
            </div>
            <div>
              <p className="text-[15px] font-bold text-foreground tracking-[-0.3px]">
                Senior Frontend Engineer
              </p>
              <p className="text-[11.5px] text-dim mt-[3px]">
                Stripe · San Francisco, CA · Remote · $180K–$240K
              </p>
            </div>
            <button className="ml-auto shrink-0 bg-thread text-tissue border-none rounded-[4px] px-4 py-2 text-xs font-semibold cursor-default">
              Easy Apply
            </button>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-dim mb-2 mt-0">
              About the role
            </p>
            <p className="text-xs text-muted-foreground leading-[1.75] mb-2 max-[768px]:text-[11px]">
              We&apos;re looking for a frontend engineer to help build the tools
              that power the internet economy. You&apos;ll work on our developer
              dashboard, improve our React component library, and ship features
              used by millions of businesses worldwide.
            </p>
            <p className="text-xs text-muted-foreground leading-[1.75] mb-2 max-[768px]:text-[11px]">
              You have strong opinions about performance, accessibility, and
              developer experience. You move fast and care about quality.
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-dim mb-2 mt-3.5">
              Qualifications
            </p>
            <p className="text-xs text-muted-foreground leading-[1.75] max-[768px]:text-[11px]">
              5+ years of React experience, strong TypeScript, experience with
              large-scale web applications.
            </p>
          </div>
        </div>

        {/* Extension popup */}
        <div
          className={cn(
            "absolute top-[14px] right-[14px] w-[264px] bg-background border border-border rounded-[8px] shadow-[0_24px_72px_rgba(28,26,23,0.16),0_0_0_1px_rgba(196,50,31,0.12)] overflow-hidden opacity-0 translate-y-[14px] scale-[0.96] transition-[opacity,transform] [transition-duration:400ms] ease-out",
            "max-[900px]:w-[220px] max-[768px]:w-[200px] max-[768px]:top-2.5 max-[768px]:right-2.5",
            "max-[540px]:right-3 max-[540px]:w-[200px] max-[540px]:top-1",
          )}
          style={
            phase >= 1
              ? { opacity: 1, transform: "translateY(0) scale(1)" }
              : undefined
          }
        >
          <div className="h-[34px] px-3 border-b border-border flex items-center gap-[7px] text-xs font-bold text-foreground tracking-[-0.1px]">
            <Image src="/logo.png" width={14} height={14} alt="" />
            <span>Cover Me</span>
          </div>

          {/* Fixed-height body — four slides stacked */}
          <div className="h-[204px] relative overflow-hidden">
            {/* Slide 1: Generate page idle (phases 1 and 4) */}
            <div
              className={cn(
                "absolute inset-0 p-[14px] flex flex-col gap-[8px] transition-opacity [transition-duration:350ms]",
                !(phase === 1 || phase === 4) && "opacity-0 pointer-events-none",
              )}
            >
              <p className="text-[9px] font-medium text-dim">Add context (optional)</p>
              <div className="rounded-[4px] border border-[rgba(28,26,23,0.07)] bg-[rgba(28,26,23,0.02)] px-[8px] py-[6px] h-[42px] overflow-hidden">
                <p className="text-[9.5px] text-[rgba(28,26,23,0.18)] leading-[1.5]">
                  e.g. &ldquo;Referred by Jane Chen&rdquo; &middot; &ldquo;emphasize leadership&rdquo;
                </p>
              </div>
              <div className="flex-1" />
              <p className="text-[9.5px] text-dim leading-[1.55]">
                Open a job posting on LinkedIn, Indeed, or any careers page, then click Generate.
              </p>
            </div>

            {/* Slide 2: Skeleton — loading (phases 2 and 4) */}
            <div
              className={cn(
                "absolute inset-0 p-[14px] flex flex-col gap-[14px] transition-opacity [transition-duration:350ms]",
                !(phase === 2 || phase === 5) && "opacity-0 pointer-events-none",
              )}
            >
              {[
                [91, 84, 67],
                [88, 96, 58],
                [76, 42],
              ].map((widths, gi) => (
                <div key={gi} className="flex flex-col gap-1.5">
                  {widths.map((w, li) => (
                    <div
                      key={li}
                      className="skeleton-line h-[9px]"
                      style={{ width: `${w}%` }}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Slide 3: ATS score (phase 3) */}
            <div
              className={cn(
                "absolute inset-0 p-[14px] flex flex-col gap-[10px] opacity-0 transition-opacity [transition-duration:450ms]",
                phase === 3 && "opacity-100",
              )}
            >
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.09em] text-dim mb-[7px]">
                  ATS Match Score
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-[5px] rounded-full bg-[rgba(28,26,23,0.06)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-tape transition-[width] [transition-duration:900ms] ease-out"
                      style={{ width: phase === 3 ? "78%" : "0%" }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-ink shrink-0">78%</span>
                </div>
              </div>
              <div className="flex flex-col gap-[7px]">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-dim">
                  Requirements
                </p>
                {[
                  { label: "React 5+ years", matched: true },
                  { label: "TypeScript", matched: true },
                  { label: "Perf optimization", matched: false },
                  { label: "CI/CD pipelines", matched: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-[6px]">
                    {item.matched ? (
                      <span className="w-[12px] h-[12px] rounded-full bg-[rgba(59,91,143,0.12)] border border-[rgba(59,91,143,0.28)] flex items-center justify-center shrink-0">
                        <svg width="6" height="4" viewBox="0 0 6 4" fill="none">
                          <path d="M0.75 2L2.25 3.25L5.25 0.75" stroke="#3B5B8F" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    ) : (
                      <span className="w-[12px] h-[12px] rounded-full bg-[rgba(196,50,31,0.1)] border border-[rgba(196,50,31,0.22)] flex items-center justify-center shrink-0">
                        <svg width="5" height="5" viewBox="0 0 5 5" fill="none">
                          <path d="M1 1L4 4M4 1L1 4" stroke="#C4321F" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      </span>
                    )}
                    <span className={cn("text-[10px] flex-1", item.matched ? "text-foreground" : "text-muted-foreground")}>
                      {item.label}
                    </span>
                    {!item.matched && (
                      <span className="text-[8px] font-semibold text-[#C4321F] bg-[rgba(196,50,31,0.08)] px-[5px] py-[1px] rounded-[2px]">
                        Gap
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Slide 4: Cover letter (phase 6) */}
            <div
              className={cn(
                "absolute inset-0 p-[14px] flex flex-col gap-[9px] overflow-hidden opacity-0 transition-opacity [transition-duration:450ms]",
                phase >= 6 && "opacity-100",
              )}
            >
              {DEMO_PARAS.map((p, i) => (
                <p key={i} className="text-[10.5px] leading-[1.75] text-foreground">
                  {p}
                </p>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="px-3 py-[9px] border-t border-border flex gap-1.5 items-center">
            {(phase <= 1 || phase === 4) ? (
              <div className="flex flex-col gap-1.5 w-full">
                <button className="w-full inline-flex items-center justify-center gap-[5px] bg-thread text-tissue border-none rounded-[4px] py-[7px] px-3 text-[10.5px] font-semibold cursor-default">
                  <svg width="8" height="10" viewBox="0 0 8 10" fill="none"><path d="M4.5 1L1 5.5H4L3.5 9L7 4.5H4L4.5 1Z" fill="white"/></svg>
                  Generate Cover Letter
                </button>
                <button className="w-full inline-flex items-center justify-center bg-elevated text-muted-foreground border border-border rounded-[4px] py-[7px] px-3 text-[10.5px] font-semibold cursor-default">
                  Tailor Resume to Job
                </button>
              </div>
            ) : phase === 2 || phase === 5 ? (
              <button className="ml-auto text-[10px] font-medium text-muted-foreground cursor-default">
                Cancel
              </button>
            ) : phase === 3 ? (
              <>
                <button className="flex-1 inline-flex items-center justify-center gap-[4px] bg-thread text-tissue border-none rounded-[4px] py-[7px] px-2.5 text-[10.5px] font-semibold cursor-default">
                  <svg width="9" height="10" viewBox="0 0 9 10" fill="none"><path d="M1 7.5V9H2.5L7.25 4.25L5.75 2.75L1 7.5ZM8.5 3L6 0.5L5.5 1L8 3.5L8.5 3Z" fill="white"/><path d="M1.5 1H5.5L7.5 3V8.5H4V9.5H7.5C8.05 9.5 8.5 9.05 8.5 8.5V2.75L5.75 0H1.5C0.95 0 0.5 0.45 0.5 1V6H1.5V1Z" fill="white"/></svg>
                  Download PDF
                </button>
                <button className="text-[10px] font-medium text-muted-foreground cursor-default px-1">
                  New
                </button>
              </>
            ) : (
              <>
                <button className="flex-1 inline-flex items-center justify-center gap-[5px] bg-thread text-tissue border-none rounded-[4px] py-[7px] px-2.5 text-[10.5px] font-semibold cursor-default">
                  <CopyIcon size={10} />
                  Copy
                </button>
                <button className="bg-elevated text-muted-foreground border border-border rounded-[4px] py-[7px] px-2.5 text-[10.5px] font-semibold cursor-default">
                  PDF
                </button>
                <button className="text-[9.5px] font-medium text-[rgba(28,26,23,0.2)] cursor-default px-1 whitespace-nowrap">
                  Regenerate
                </button>
                <button className="text-[10px] font-medium text-muted-foreground cursor-default px-1">
                  New
                </button>
              </>
            )}
          </div>

          {/* Tab bar */}
          <div className="flex border-t border-border">
            {[
              { label: "Generate", icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6.5 1L2 6.5H5.5L5 11L9.5 5.5H6L6.5 1Z" fill="currentColor"/></svg>, active: true },
              { label: "Resume", icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="1" width="8" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/><line x1="4" y1="4" x2="8" y2="4" stroke="currentColor" strokeWidth="1"/><line x1="4" y1="6" x2="8" y2="6" stroke="currentColor" strokeWidth="1"/><line x1="4" y1="8" x2="6" y2="8" stroke="currentColor" strokeWidth="1"/></svg>, active: false },
              { label: "Settings", icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M6 1.5V2.5M6 9.5V10.5M1.5 6H2.5M9.5 6H10.5M2.9 2.9L3.6 3.6M8.4 8.4L9.1 9.1M9.1 2.9L8.4 3.6M3.6 8.4L2.9 9.1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>, active: false },
              { label: "History", icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.1"/><path d="M6 3.5V6L7.5 7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>, active: false },
            ].map((tab) => (
              <div
                key={tab.label}
                className={cn(
                  "flex-1 flex flex-col items-center py-[5px] gap-[2px]",
                  tab.active ? "text-brand-light" : "text-[rgba(28,26,23,0.25)]",
                )}
              >
                {tab.icon}
                <span className="text-[7.5px] font-semibold">{tab.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Caption */}
      <div className="h-9 bg-elevated border-t border-border flex items-center justify-center text-[12px] text-muted-foreground tracking-[0.01em]">
        {phase === 0 && (
          <span key="0" style={{ animation: "fadeIn 0.4s ease both" }}>
            Open a job posting on any board&hellip;
          </span>
        )}
        {(phase === 1 || phase === 4) && (
          <span key="idle" style={{ animation: "fadeIn 0.4s ease both" }}>
            Cover Me reads the page &mdash; choose what to generate.
          </span>
        )}
        {phase === 2 && (
          <span key="2" style={{ animation: "fadeIn 0.4s ease both" }}>
            Tailoring your resume to the role&hellip;
          </span>
        )}
        {phase === 3 && (
          <span key="3" style={{ animation: "fadeIn 0.4s ease both" }}>
            78% ATS match &mdash; 2 gaps identified.
          </span>
        )}
        {phase === 5 && (
          <span key="5" style={{ animation: "fadeIn 0.4s ease both" }}>
            Generating your cover letter&hellip;
          </span>
        )}
        {phase >= 6 && (
          <span key="6" style={{ animation: "fadeIn 0.4s ease both" }}>
            Done in under 10 seconds &mdash; edit, copy, or download.
          </span>
        )}
      </div>

      {/* Animated cursor — hidden on mobile */}
      {cursorVisible && (
        <div
          className="absolute pointer-events-none z-50 max-[768px]:hidden"
          style={{
            right: cursorRight,
            top: cursorTop,
            transition:
              "right 0.5s cubic-bezier(0.4,0,0.2,1), top 0.5s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {cursorClicking && (
            <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-white/20 animate-ping" />
          )}
          <svg
            width="16"
            height="20"
            viewBox="0 0 16 20"
            fill="none"
            style={{
              transform: cursorClicking ? "scale(0.78)" : "scale(1)",
              transition: "transform 0.12s ease",
              filter: "drop-shadow(0 1px 4px rgba(28,26,23,0.16))",
            }}
          >
            <path
              d="M2 1.5L2 16L6 12.5L9 19.2L11.2 18.3L8.2 11.5L14.5 11.5L2 1.5Z"
              fill="white"
              stroke="rgba(28,26,23,0.06)"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
