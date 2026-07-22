"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn, CHROME_STORE_URL } from "@/lib/utils";
import { jsonLdApp, jsonLdHowTo, jsonLdSpeakable, STORE_RATING } from "@/lib/structured-data";
import {
  ArrowUpRightIcon,
  CheckIcon,
  GoogleChromeLogoIcon,
  CopyIcon,
  ShieldIcon,
} from "@phosphor-icons/react";

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] py-[18px] transition-[background,border-color,backdrop-filter] [transition-duration:250ms] border-b border-transparent",
        scrolled &&
          "bg-[rgba(13,17,23,0.92)] backdrop-blur-2xl [-webkit-backdrop-filter:blur(24px)] border-border",
      )}
    >
      <div className="container">
        <div className="flex items-center gap-8">
          <a
            href="/"
            className="flex items-center gap-[9px] text-[15px] font-bold text-foreground tracking-[-0.3px] shrink-0"
          >
            <Image src="/logo.png" width={26} height={26} alt="Cover Me" />
            <span>Cover Me</span>
          </a>
          <div className="flex gap-7 flex-1 max-md:hidden">
            <a
              href="#how-it-works"
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors tracking-[0.01em]"
            >
              How it works
            </a>
            <a
              href="#features"
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors tracking-[0.01em]"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors tracking-[0.01em]"
            >
              Pricing
            </a>
            <a
              href="/about"
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors tracking-[0.01em]"
            >
              About
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="/auth">Sign in</a>
            </Button>
            <Button asChild size="sm">
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noreferrer"
              >
                Install free
              </a>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ── Workflow demo ─────────────────────────────────────────────────────────────

const DEMO_PARAS = [
  `Having spent five years building fintech products at scale, the Senior Frontend Engineer role at Stripe stopped my scroll.`,
  `At Relay, I led a React migration that improved LCP by 40% and cut bundle size by 30% — precisely the engineering rigour Stripe's infrastructure demands.`,
  `I'd love to bring that focus to your team. Happy to connect at your convenience.`,
];

function WorkflowDemo() {
  const [phase, setPhase] = useState(0);
  const [cursorRight, setCursorRight] = useState(11);
  const [cursorTop, setCursorTop] = useState(17);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorClicking, setCursorClicking] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
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
      className="relative mt-16 border border-border rounded-[10px] overflow-hidden shadow-[0_48px_120px_rgba(0,0,0,0.55),0_0_0_1px_rgba(99,102,241,0.06)]"
      aria-hidden="true"
      style={{ animation: "fadeUp 0.65s ease 0.25s both" }}
    >
      {/* Browser chrome */}
      <div className="h-9 bg-elevated border-b border-border flex items-center px-3 gap-2.5 shrink-0">
        <div className="flex gap-[5px] shrink-0">
          <span className="w-2.5 h-2.5 rounded-full block bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full block bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full block bg-[#28c840]" />
        </div>
        <div className="flex-1 bg-[rgba(0,0,0,0.25)] border border-border rounded-[4px] h-[22px] flex items-center gap-1.5 px-2.5 text-[10.5px] text-dim overflow-hidden whitespace-nowrap text-ellipsis tracking-[0.01em]">
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
            <button className="ml-auto shrink-0 bg-brand text-white border-none rounded-[4px] px-4 py-2 text-xs font-semibold cursor-default">
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
            "absolute top-[14px] right-[14px] w-[264px] bg-background border border-border rounded-[8px] shadow-[0_24px_72px_rgba(0,0,0,0.65),0_0_0_1px_rgba(99,102,241,0.12)] overflow-hidden opacity-0 translate-y-[14px] scale-[0.96] transition-[opacity,transform] [transition-duration:400ms] ease-out",
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
              <div className="rounded-[4px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] px-[8px] py-[6px] h-[42px] overflow-hidden">
                <p className="text-[9.5px] text-[rgba(255,255,255,0.18)] leading-[1.5]">
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
                  <div className="flex-1 h-[5px] rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#f59e0b] transition-[width] [transition-duration:900ms] ease-out"
                      style={{ width: phase === 3 ? "78%" : "0%" }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[#f59e0b] shrink-0">78%</span>
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
                      <span className="w-[12px] h-[12px] rounded-full bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.28)] flex items-center justify-center shrink-0">
                        <svg width="6" height="4" viewBox="0 0 6 4" fill="none">
                          <path d="M0.75 2L2.25 3.25L5.25 0.75" stroke="#22c55e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    ) : (
                      <span className="w-[12px] h-[12px] rounded-full bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.22)] flex items-center justify-center shrink-0">
                        <svg width="5" height="5" viewBox="0 0 5 5" fill="none">
                          <path d="M1 1L4 4M4 1L1 4" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      </span>
                    )}
                    <span className={cn("text-[10px] flex-1", item.matched ? "text-foreground" : "text-muted-foreground")}>
                      {item.label}
                    </span>
                    {!item.matched && (
                      <span className="text-[8px] font-semibold text-[#ef4444] bg-[rgba(239,68,68,0.08)] px-[5px] py-[1px] rounded-[2px]">
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
                <button className="w-full inline-flex items-center justify-center gap-[5px] bg-brand text-white border-none rounded-[4px] py-[7px] px-3 text-[10.5px] font-semibold cursor-default">
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
                <button className="flex-1 inline-flex items-center justify-center gap-[4px] bg-brand text-white border-none rounded-[4px] py-[7px] px-2.5 text-[10.5px] font-semibold cursor-default">
                  <svg width="9" height="10" viewBox="0 0 9 10" fill="none"><path d="M1 7.5V9H2.5L7.25 4.25L5.75 2.75L1 7.5ZM8.5 3L6 0.5L5.5 1L8 3.5L8.5 3Z" fill="white"/><path d="M1.5 1H5.5L7.5 3V8.5H4V9.5H7.5C8.05 9.5 8.5 9.05 8.5 8.5V2.75L5.75 0H1.5C0.95 0 0.5 0.45 0.5 1V6H1.5V1Z" fill="white"/></svg>
                  Download PDF
                </button>
                <button className="text-[10px] font-medium text-muted-foreground cursor-default px-1">
                  New
                </button>
              </>
            ) : (
              <>
                <button className="flex-1 inline-flex items-center justify-center gap-[5px] bg-brand text-white border-none rounded-[4px] py-[7px] px-2.5 text-[10.5px] font-semibold cursor-default">
                  <CopyIcon size={10} />
                  Copy
                </button>
                <button className="bg-elevated text-muted-foreground border border-border rounded-[4px] py-[7px] px-2.5 text-[10.5px] font-semibold cursor-default">
                  PDF
                </button>
                <button className="text-[9.5px] font-medium text-[rgba(255,255,255,0.2)] cursor-default px-1 whitespace-nowrap">
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
                  tab.active ? "text-brand-light" : "text-[rgba(255,255,255,0.25)]",
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
              filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.8))",
            }}
          >
            <path
              d="M2 1.5L2 16L6 12.5L9 19.2L11.2 18.3L8.2 11.5L14.5 11.5L2 1.5Z"
              fill="white"
              stroke="rgba(0,0,0,0.3)"
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

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="pt-[160px] pb-20 relative overflow-hidden">
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-[radial-gradient(ellipse,rgba(99,102,241,0.07)_0%,transparent_65%)] pointer-events-none" />
      <div className="container">
        <div
          className="text-center flex flex-col items-center gap-[18px] max-w-[700px] mx-auto"
          style={{ animation: "fadeUp 0.65s ease both" }}
        >
          <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-brand">
            AI cover letter generator &amp; resume tailor
          </span>
          <h1 className="text-[clamp(34px,4.8vw,64px)] font-extrabold leading-[0.98] tracking-[-2.5px] text-foreground max-[768px]:tracking-[-1.5px]">
            The job application
            <br />
            that gets you <span className="hero-hired">hired.</span>
          </h1>
          <p className="text-[16px] leading-[1.65] text-muted-foreground max-w-[560px] mt-1.5">
            Cover Me reads the posting, extracts the ATS keywords, and builds a
            tailored cover letter and resume from your experience — in seconds.
          </p>
          {/* Before → After stat */}
          <div className="flex items-center gap-3 mt-2">
            <div className="px-3.5 py-2 rounded-[8px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)]">
              <p className="text-[19px] font-bold text-muted-foreground line-through decoration-2 leading-none">45 min</p>
              <p className="text-[11px] font-medium text-muted-foreground opacity-50 tracking-[0.06em] uppercase mt-[5px]">per application</p>
            </div>
            <svg width="26" height="14" viewBox="0 0 26 14" fill="none" className="text-brand shrink-0">
              <path d="M0 7H22M17 1.5L23.5 7L17 12.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="px-3.5 py-2 rounded-[8px] border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.1)] shadow-[0_0_18px_rgba(99,102,241,0.18)]">
              <p className="text-[19px] font-bold text-[#a5b4fc] leading-none">10 sec</p>
              <p className="text-[11px] font-medium text-[#818cf8] tracking-[0.06em] uppercase mt-[5px]">per application</p>
            </div>
          </div>
          <div className="flex gap-2.5 flex-wrap justify-center mt-2">
            <Button asChild size="lg">
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noreferrer"
              >
                <GoogleChromeLogoIcon size={15} />
                Install free · Chrome
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#pricing">See pricing</a>
            </Button>
          </div>
          <p className="flex items-center gap-2.5 text-[12px] text-muted-foreground tracking-[0.01em] flex-wrap justify-center">
            <span className="flex items-center gap-1">
              <span className="text-[#f59e0b]" aria-hidden="true">★</span>
              {STORE_RATING.value.toFixed(1)} on Chrome Web Store
            </span>
            <span className="inline-block w-[3px] h-[3px] rounded-full bg-border" />
            Free forever
            <span className="inline-block w-[3px] h-[3px] rounded-full bg-border" />
            BYOK or hosted
            <span className="inline-block w-[3px] h-[3px] rounded-full bg-border" />
            Open source · MIT
          </p>
        </div>
        <WorkflowDemo />
      </div>
    </section>
  );
}

// ── Works on ──────────────────────────────────────────────────────────────────

function WorksOn() {
  const boards: { name: string; href?: string }[] = [
    { name: "LinkedIn", href: "/for/linkedin" },
    { name: "Indeed", href: "/for/indeed" },
    { name: "Greenhouse", href: "/for/greenhouse" },
    { name: "Lever", href: "/for/lever" },
    { name: "Workday", href: "/for/workday" },
    { name: "Ashby", href: "/for/ashby" },
    { name: "Any job board" },
  ];
  return (
    <div className="py-[18px] border-t border-b border-border">
      <div className="container">
        <div className="flex items-center gap-[18px] flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground whitespace-nowrap">
            Works on
          </span>
          <div className="flex items-center gap-2.5 flex-wrap">
            {boards.map((b, i) => (
              <span key={b.name} className="flex items-center gap-2.5">
                {b.href ? (
                  <a
                    href={b.href}
                    className="text-[12.5px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {b.name}
                  </a>
                ) : (
                  <span className="text-[12.5px] font-medium text-muted-foreground">
                    {b.name}
                  </span>
                )}
                {i < boards.length - 1 && (
                  <span className="inline-block w-[3px] h-[3px] rounded-full bg-border" />
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: "01",
    title: "Install and configure in 60 seconds",
    body: "Add the extension from the Chrome Web Store. Upload your resume — PDF or DOCX, text is extracted locally on your device and never stored raw. Choose BYOK with your own Claude or OpenAI key for unlimited free use, or sign up for 5 free hosted letters per day. No credit card required.",
  },
  {
    n: "02",
    title: "Navigate to any job posting",
    body: "Open a job on LinkedIn, Indeed, Greenhouse, Lever, Workday, or Ashby. Cover Me reads the page automatically. If the scraper doesn't catch it, paste the description manually — it takes five seconds and works on any page.",
  },
  {
    n: "03",
    title: "Generate, edit, and apply",
    body: "Click Generate Cover Letter for an ATS-optimized letter, or Tailor Resume to Job to have AI rewrite your resume bullets to match the role's keywords — then see your ATS match score and the exact gaps the role demands. Edit the result directly inside the extension with no round-trips to a text editor, copy to clipboard, or download either document as a formatted PDF instantly.",
  },
];

// ── Step graphics ─────────────────────────────────────────────────────────────

function InstallGraphic() {
  return (
    <div className="relative flex items-center justify-center w-[160px] h-[104px]">
      {/* Aura rings */}
      <div className="absolute w-[96px] h-[96px] rounded-full bg-[radial-gradient(ellipse,rgba(99,102,241,0.08)_0%,transparent_70%)]" />
      <div className="absolute w-[68px] h-[68px] rounded-full border border-[rgba(99,102,241,0.14)]" />
      <div className="absolute w-[52px] h-[52px] rounded-full border border-[rgba(99,102,241,0.2)]" />
      {/* Extension icon */}
      <div className="relative w-[40px] h-[40px] rounded-[9px] bg-gradient-to-br from-[#818cf8] to-[#4338ca] shadow-[0_0_22px_rgba(99,102,241,0.5)] flex items-center justify-center">
        <Image src="/logo.png" width={22} height={22} alt="" />
      </div>
      {/* Success badge */}
      <div className="absolute bottom-[14px] right-[30px] w-[18px] h-[18px] rounded-full bg-[#22c55e] border-[2px] border-[#0d1117] flex items-center justify-center shadow-[0_0_8px_rgba(34,197,94,0.45)]">
        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
          <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {/* Sparkle dots */}
      <div className="absolute top-[16px] left-[28px] w-[3px] h-[3px] rounded-full bg-[rgba(129,140,248,0.5)]" />
      <div className="absolute top-[22px] right-[22px] w-[2px] h-[2px] rounded-full bg-[rgba(129,140,248,0.4)]" />
      <div className="absolute bottom-[22px] left-[20px] w-[2px] h-[2px] rounded-full bg-[rgba(129,140,248,0.3)]" />
    </div>
  );
}

function NavigateGraphic() {
  return (
    <div className="w-[160px] h-[104px] rounded-[8px] border border-[rgba(255,255,255,0.07)] bg-[#0d1117] overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.45)] relative">
      {/* Job listing header */}
      <div className="px-3 py-2.5 flex items-center gap-2 border-b border-[rgba(255,255,255,0.05)]">
        <div className="w-[26px] h-[26px] rounded-[5px] bg-gradient-to-br from-[#635bff] to-[#3b82f6] text-white text-[11px] font-extrabold flex items-center justify-center shrink-0 leading-none">S</div>
        <div className="flex flex-col gap-[4px] flex-1 min-w-0">
          <div className="h-[5px] rounded-full bg-[rgba(255,255,255,0.18)] w-full" />
          <div className="h-[4px] rounded-full bg-[rgba(255,255,255,0.08)] w-[58%]" />
        </div>
      </div>
      {/* Body text stubs */}
      <div className="px-3 pt-2.5 flex flex-col gap-[5px]">
        <div className="h-[4px] rounded-full bg-[rgba(255,255,255,0.07)] w-full" />
        <div className="h-[4px] rounded-full bg-[rgba(255,255,255,0.05)] w-[88%]" />
        <div className="h-[4px] rounded-full bg-[rgba(255,255,255,0.05)] w-[76%]" />
        <div className="h-[4px] rounded-full bg-[rgba(255,255,255,0.04)] w-[82%]" />
      </div>
    </div>
  );
}

function GenerateGraphic() {
  return (
    <div className="w-[160px] h-[104px] rounded-[8px] border border-[rgba(99,102,241,0.22)] bg-[#0d1117] overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.45),0_0_0_1px_rgba(99,102,241,0.06)] relative flex flex-col">
      {/* Popup header */}
      <div className="h-[24px] px-2.5 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-[5px] bg-[#161b22] shrink-0">
        <Image src="/logo.png" width={10} height={10} alt="" />
        <div className="h-[4px] rounded-full bg-[rgba(255,255,255,0.22)] w-[44px]" />
      </div>
      {/* Letter lines */}
      <div className="px-2.5 pt-2 pb-0 flex flex-col gap-[5px] flex-1">
        {/* First line — indigo gradient signals "just generated" */}
        <div className="h-[4px] rounded-full w-full" style={{ background: 'linear-gradient(90deg, rgba(129,140,248,0.55) 0%, rgba(255,255,255,0.12) 100%)' }} />
        <div className="h-[4px] rounded-full bg-[rgba(255,255,255,0.11)] w-full" />
        <div className="h-[4px] rounded-full bg-[rgba(255,255,255,0.08)] w-[82%]" />
        <div className="h-[4px] rounded-full bg-[rgba(255,255,255,0.07)] w-full" />
        <div className="h-[4px] rounded-full bg-[rgba(255,255,255,0.06)] w-[68%]" />
      </div>
      {/* Action row */}
      <div className="px-2.5 py-[7px] border-t border-[rgba(255,255,255,0.05)] flex gap-[5px] shrink-0">
        <div className="flex-1 h-[13px] rounded-[3px] bg-[rgba(99,102,241,0.75)] flex items-center justify-center gap-[3px]">
          <div className="h-[3px] rounded-full bg-white w-[18px]" />
        </div>
        <div className="h-[13px] w-[22px] rounded-[3px] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.07)]" />
        <div className="h-[13px] w-[22px] rounded-[3px] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.07)]" />
      </div>
    </div>
  );
}

const STEP_GRAPHICS = [<InstallGraphic key="g0" />, <NavigateGraphic key="g1" />, <GenerateGraphic key="g2" />];

function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.05 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="how-it-works"
      className="py-[120px] max-[768px]:py-20"
      ref={ref}
    >
      <div className="container">
        <div className="flex flex-col gap-2.5 mb-[52px]">
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-brand">
            How it works
          </span>
          <h2 className="text-[clamp(30px,3.8vw,48px)] font-extrabold tracking-[-1.5px] leading-none text-foreground max-w-[600px]">
            How does Cover Me work?
          </h2>
          <p className="text-[15px] text-muted-foreground leading-[1.75] max-w-[600px] mt-3">
            Cover Me is a free Chrome extension that writes your cover letter and rewrites your resume to match any job posting — ATS keywords extracted, both documents done in seconds.
          </p>
        </div>
        <div className="border-t border-border">
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className={cn(
                "grid grid-cols-[52px_1fr_168px] [gap:0_48px] py-11 border-b border-border items-center opacity-0 translate-y-4 transition-[opacity,transform] duration-500 max-[1100px]:grid-cols-[52px_1fr_148px] max-[900px]:grid-cols-[40px_1fr_136px] max-[900px]:[gap:0_28px] max-[768px]:grid-cols-[36px_1fr] max-[768px]:[gap:0_20px] max-[768px]:py-8",
                visible && "opacity-100 translate-y-0",
              )}
              style={{ transitionDelay: `${i * 0.12}s` }}
            >
              <span className="text-[10px] font-bold text-brand tracking-[0.1em] uppercase self-start pt-[5px]">
                {s.n}
              </span>
              <div className="flex flex-col gap-3 self-start">
                <h3 className="text-[19px] font-bold text-foreground tracking-[-0.4px] leading-[1.25]">
                  {s.title}
                </h3>
                <p className="text-[14px] text-muted-foreground leading-[1.8] max-w-[580px]">
                  {s.body}
                </p>
              </div>
              <div className="flex items-center justify-end max-[768px]:hidden">
                {STEP_GRAPHICS[i]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── ATS Score ─────────────────────────────────────────────────────────────────

function ATSScoreGraphic() {
  const score = 78;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const filled = circ * (score / 100);

  const items: { label: string; matched: boolean }[] = [
    { label: "React 5+ years", matched: true },
    { label: "TypeScript", matched: true },
    { label: "Large-scale apps", matched: true },
    { label: "Performance optimization", matched: false },
    { label: "CI/CD pipelines", matched: false },
  ];

  return (
    <div className="w-[272px] bg-background border border-[rgba(99,102,241,0.18)] rounded-[10px] shadow-[0_32px_96px_rgba(0,0,0,0.7),0_0_0_1px_rgba(99,102,241,0.08)] overflow-hidden">
      {/* Popup header */}
      <div className="h-[34px] px-3 border-b border-border flex items-center gap-[7px] text-xs font-bold text-foreground tracking-[-0.1px] bg-elevated">
        <Image src="/logo.png" width={14} height={14} alt="" />
        <span>Cover Me</span>
        <span className="ml-auto text-[9px] font-medium text-[rgba(255,255,255,0.35)] tracking-[0.02em]">
          Resume tailored
        </span>
      </div>

      {/* Score gauge */}
      <div className="flex flex-col items-center pt-6 pb-3 bg-[rgba(0,0,0,0.15)]">
        <svg width="108" height="108" viewBox="0 0 108 108">
          {/* Outer glow ring */}
          <circle
            cx="54"
            cy="54"
            r={r + 2}
            fill="none"
            stroke="rgba(245,158,11,0.06)"
            strokeWidth="14"
          />
          {/* Track */}
          <circle
            cx="54"
            cy="54"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6.5"
          />
          {/* Score arc */}
          <circle
            cx="54"
            cy="54"
            r={r}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeDasharray={`${filled.toFixed(1)} ${(circ - filled).toFixed(1)}`}
            transform="rotate(-90 54 54)"
          />
          {/* Score number */}
          <text
            x="54"
            y="49"
            textAnchor="middle"
            fill="white"
            fontSize="24"
            fontWeight="800"
            fontFamily="system-ui,sans-serif"
          >
            {score}
          </text>
          {/* % label */}
          <text
            x="54"
            y="64"
            textAnchor="middle"
            fill="rgba(255,255,255,0.38)"
            fontSize="8.5"
            fontWeight="600"
            fontFamily="system-ui,sans-serif"
            letterSpacing="1.5"
          >
            % MATCH
          </text>
        </svg>
        <p className="text-[10.5px] font-semibold text-[#f59e0b] tracking-[0.03em] mt-0.5 mb-1">
          ATS Score
        </p>
      </div>

      {/* Requirements list */}
      <div className="px-4 py-3.5 border-t border-border">
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-dim mb-2.5">
          Requirements
        </p>
        <div className="flex flex-col gap-[8px]">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2.5">
              {item.matched ? (
                <span className="w-[15px] h-[15px] rounded-full bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.28)] flex items-center justify-center shrink-0">
                  <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                    <path
                      d="M1 2.5L2.8 4.2L6 1"
                      stroke="#22c55e"
                      strokeWidth="1.35"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              ) : (
                <span className="w-[15px] h-[15px] rounded-full bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.22)] flex items-center justify-center shrink-0">
                  <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
                    <path
                      d="M1.5 1.5L4.5 4.5M4.5 1.5L1.5 4.5"
                      stroke="#ef4444"
                      strokeWidth="1.35"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              )}
              <span
                className={cn(
                  "text-[11.5px] flex-1",
                  item.matched ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
              {!item.matched && (
                <span className="text-[9px] font-semibold text-[#ef4444] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.14)] px-[6px] py-[2px] rounded-[3px]">
                  Gap
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action */}
      <div className="px-3 pb-3">
        <button className="w-full inline-flex items-center justify-center bg-brand text-white border-none rounded-[5px] py-[8px] px-2.5 text-[11.5px] font-semibold cursor-default">
          Download Tailored PDF
        </button>
      </div>
    </div>
  );
}

function ATSScoreSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.05 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="py-[120px] max-[768px]:py-20" ref={ref}>
      <div className="container">
        <div className="grid grid-cols-[1fr_300px] gap-[80px] items-center max-[1100px]:grid-cols-[1fr_272px] max-[900px]:grid-cols-1 max-[900px]:gap-14">
          {/* Left: copy */}
          <div
            className={cn(
              "flex flex-col gap-6 opacity-0 translate-y-4 transition-[opacity,transform] duration-500",
              visible && "opacity-100 translate-y-0",
            )}
          >
            <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-brand">
              ATS scoring
            </span>
            <h2 className="text-[clamp(30px,3.8vw,48px)] font-extrabold tracking-[-1.5px] leading-none text-foreground">
              Know your score.
              <br />
              Fix what matters.
            </h2>
            <p className="text-[15px] text-muted-foreground leading-[1.75] max-w-[500px]">
              After tailoring, Cover Me scores your resume against the specific
              role and surfaces the exact gaps — the skills, tools, and keywords
              the job demands that aren&apos;t yet reflected in your experience.
              No guessing what the recruiter&apos;s filter is looking for.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                "See your ATS match percentage at a glance",
                "Pinpoint the exact keywords you're missing",
                "Understand which requirements you already meet",
                "Re-tailor in one click once you've closed the gaps",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-[14px] text-muted-foreground"
                >
                  <CheckIcon size={14} className="shrink-0 text-brand-light" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: graphic */}
          <div
            className={cn(
              "relative flex justify-center opacity-0 translate-y-4 transition-[opacity,transform] duration-700 max-[900px]:justify-start",
              visible && "opacity-100 translate-y-0",
            )}
            style={{ transitionDelay: "0.15s" }}
          >
            {/* Ambient glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[360px] h-[360px] rounded-full bg-[radial-gradient(ellipse,rgba(245,158,11,0.07)_0%,transparent_60%)]" />
            </div>
            <ATSScoreGraphic />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────

const FEATURES: {
  title: string;
  body: string;
  accent?: boolean;
  span: string;
  pad?: string;
}[] = [
  {
    title: "Bring Your Own Key",
    body: "Use your own Claude or OpenAI API key for unlimited, free generation. No account, no subscription — your key, your cost, your terms.",
    accent: true,
    span: "col-span-4 max-[1100px]:col-span-4 max-[900px]:col-span-full",
  },
  {
    title: "Local & encrypted by default",
    body: "In BYOK mode your resume is AES-GCM encrypted on-device. Cloud storage is opt-in only when you create a hosted account.",
    accent: true,
    span: "col-span-2 max-[900px]:col-span-full",
  },
  {
    title: "Fully open source",
    body: "MIT licensed. Read every line of the extension and backend. Self-host with your own Supabase and Stripe — zero lock-in.",
    accent: true,
    span: "col-span-2 max-[900px]:col-span-full",
  },
  {
    title: "Edit before you send",
    body: "Every letter is fully editable directly inside the extension — no round-trips to a text editor. Adjust tone, length, or specific details in-place before copying or exporting.",
    span: "col-span-2 max-[900px]:col-span-full",
  },
  {
    title: "Full letter history",
    body: "Every generated letter is saved locally. Review, copy, or regenerate any previous letter — even weeks after it was created.",
    span: "col-span-2 max-[900px]:col-span-full",
  },
  {
    title: "Supplemental context",
    body: "Add a note about what you want to emphasize — a recent promotion, a side project, a specific achievement. Cover Me weaves it into the letter alongside your resume and the job requirements.",
    span: "col-span-2 max-[900px]:col-span-full",
  },
  {
    title: "AI resume tailoring",
    body: "Cover Me rewrites your resume bullets to match the ATS keywords and requirements of the specific role — without inventing skills or changing your job history. Your experience, optimized for each application.",
    span: "col-span-2 max-[900px]:col-span-full",
  },
  {
    title: "Compact to one page",
    body: "Some roles require a single-page resume. Enable compact mode and Cover Me trims your tailored resume to one page automatically — keeping the most relevant content for that role.",
    span: "col-span-2 max-[900px]:col-span-full",
  },
  {
    title: "Keywords from the posting, built in",
    body: "Cover Me reads the job description to find the exact skills, tools, and terms the role demands, then weaves them into both your cover letter and your rewritten resume bullets — so you surface in ATS filters for every application.",
    span: "col-span-6 max-[1100px]:col-span-4 max-[900px]:col-span-full",
    pad: "py-7",
  },
];

function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.05 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="features" className="py-[120px] max-[768px]:py-20" ref={ref}>
      <div className="container">
        <div className="flex flex-col gap-2.5 mb-[52px]">
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-brand">
            Features
          </span>
          <h2 className="text-[clamp(30px,3.8vw,48px)] font-extrabold tracking-[-1.5px] leading-none text-foreground max-w-[600px]">
            What makes Cover Me different?
          </h2>
        </div>
        <div className="grid grid-cols-6 max-[1100px]:grid-cols-4 max-[900px]:grid-cols-2 max-[768px]:grid-cols-1 gap-px bg-border border border-border rounded-[10px] overflow-hidden">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={cn(
                "bg-elevated px-8 py-9 flex flex-col gap-3 opacity-0 translate-y-3 transition-[opacity,transform,background] [transition-duration:450ms] hover:bg-[rgba(30,39,64,0.96)]",
                f.accent &&
                  "bg-gradient-to-br from-elevated to-[rgba(99,102,241,0.06)]",
                f.pad ?? "",
                f.span,
                visible && "opacity-100 translate-y-0",
              )}
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <h3 className="text-[14px] font-bold text-foreground tracking-[-0.2px] leading-[1.3]">
                {f.title}
              </h3>
              <p className="text-[13px] text-muted-foreground leading-[1.75]">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Open source ───────────────────────────────────────────────────────────────

function OpenSource() {
  return (
    <section className="py-[120px] bg-surface max-[768px]:py-20">
      <div className="container">
        <div className="grid grid-cols-[1fr_180px] gap-20 items-center max-[900px]:grid-cols-1 max-[900px]:gap-10">
          <div className="flex flex-col gap-[22px]">
            <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-brand">
              Open source
            </span>
            <h2 className="text-[clamp(28px,3.5vw,44px)] font-extrabold tracking-[-1.5px] leading-none text-foreground">
              Built in public.
              <br />
              Auditable by anyone.
            </h2>
            <p className="text-[15px] text-muted-foreground leading-[1.75] max-w-[540px]">
              The extension and backend are MIT licensed and fully public on
              GitHub. Read every line of code, verify our privacy model,
              self-host with your own Supabase and Stripe, or contribute a
              scraper for a new job board.
            </p>
            <div className="flex items-center gap-5 flex-wrap">
              <Button asChild variant="outline">
                <a
                  href="https://github.com/TheLinc/cover-me"
                  target="_blank"
                  rel="noreferrer"
                >
                  View on GitHub
                  <ArrowUpRightIcon size={11} />
                </a>
              </Button>
              <span className="text-xs text-muted-foreground">
                MIT License · No telemetry · No ads
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center max-[900px]:hidden">
            <svg
              viewBox="0 0 98 96"
              fill="currentColor"
              className="w-[100px] h-[100px] text-dim opacity-25"
            >
              <path d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────

const FREE_FEATURES = [
  "5 AI generations/day — cover letters + resumes",
  "BYOK — your key, unlimited & free",
  "All major job boards",
  "Edit & export to PDF",
  "Local cover letter history",
];

const PRO_FEATURES = [
  "Unlimited cover letters and resume tailoring",
  "All major job boards",
  "Edit & export to PDF",
  "Cover letter history synced cross-device",
  "Priority access to new features",
];

function Pricing() {
  return (
    <section id="pricing" className="py-[120px] max-[768px]:py-20">
      <div className="container">
        <div className="flex flex-col gap-2.5 mb-[52px]">
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-brand">
            Pricing
          </span>
          <h2 className="text-[clamp(30px,3.8vw,48px)] font-extrabold tracking-[-1.5px] leading-none text-foreground max-w-[600px]">
            Start free. Upgrade when you&apos;re ready.
          </h2>
          <p className="text-[15px] text-muted-foreground leading-[1.65] max-w-[480px] mt-1">
            No contracts. Cancel any time. Or use your own API key for free,
            forever.
          </p>
        </div>
        <div className="grid grid-cols-2 max-[900px]:grid-cols-1 max-[900px]:max-w-[480px] gap-px max-w-[780px] bg-border border border-border rounded-[10px] overflow-hidden">
          {/* Free */}
          <div className="bg-surface px-9 py-10 flex flex-col relative">
            <div className="invisible inline-flex items-center text-[10px] font-bold tracking-[0.07em] uppercase px-[9px] py-[3px] rounded-[4px] w-fit mb-4">
              Most popular
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-3">
              Free
            </p>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-[52px] font-extrabold tracking-[-2.5px] leading-none text-foreground">
                $0
              </span>
              <span className="text-[14px] text-muted-foreground font-medium">/forever</span>
            </div>
            <p className="text-[13px] text-muted-foreground leading-[1.65] pb-6 border-b border-border mb-6">
              For job seekers who want to move fast without a subscription.
            </p>
            <ul className="list-none flex flex-col gap-2.5 flex-1 mb-7">
              {FREE_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-[13px] text-muted-foreground leading-[1.5]"
                >
                  <CheckIcon size={13} className="shrink-0 text-dim mt-[2px]" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              asChild
              variant="outline"
              className="w-full justify-center py-3 text-[13px]"
            >
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noreferrer"
              >
                Install free
              </a>
            </Button>
          </div>

          {/* Pro */}
          <div className="bg-gradient-to-br from-surface to-[rgba(99,102,241,0.04)] px-9 py-10 flex flex-col relative">
            <div className="inline-flex items-center text-[10px] font-bold tracking-[0.07em] uppercase text-brand-light border border-[rgba(99,102,241,0.3)] bg-brand-dim px-[9px] py-[3px] rounded-[4px] w-fit mb-4">
              Most popular
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-3">
              Pro
            </p>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-[52px] font-extrabold tracking-[-2.5px] leading-none text-brand-light">
                $8
              </span>
              <span className="text-[14px] text-muted-foreground font-medium">/month</span>
            </div>
            <p className="text-[13px] text-muted-foreground leading-[1.65] pb-6 border-b border-border mb-6">
              For active job seekers who apply to multiple roles a day and want
              their history everywhere.
            </p>
            <ul className="list-none flex flex-col gap-2.5 flex-1 mb-7">
              {PRO_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-[13px] text-muted-foreground leading-[1.5]"
                >
                  <CheckIcon
                    size={13}
                    className="shrink-0 text-brand-light mt-[2px]"
                  />
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild className="w-full justify-center py-3 text-[13px]">
              <a href="/auth?plan=pro">Get Pro</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="pb-12">
      <div className="h-px bg-border" />
      <div className="container">
        <div className="flex gap-20 pt-14 pb-10 items-start max-[768px]:flex-col max-[768px]:gap-9">
          <div className="flex flex-col gap-3 flex-1">
            <a
              href="/"
              className="flex items-center gap-[9px] text-[15px] font-bold text-foreground tracking-[-0.3px]"
            >
              <Image src="/logo.png" width={24} height={24} alt="Cover Me" />
              <span>Cover Me</span>
            </a>
            <p className="text-[13px] text-muted-foreground">
              Tailored cover letters and resumes for every job you apply to.
            </p>
          </div>
          <div className="flex gap-[60px] max-[768px]:gap-10">
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground mb-0.5">
                Product
              </span>
              <a
                href="#how-it-works"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                How it works
              </a>
              <a
                href="#features"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </a>
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Install
              </a>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground mb-0.5">
                Open source
              </span>
              <a
                href="https://github.com/TheLinc/cover-me"
                target="_blank"
                rel="noreferrer"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub
              </a>
              <a
                href="/about"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                About
              </a>
              <a
                href="/privacy"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </a>
              <a
                href="/terms"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms
              </a>
              <a
                href="/support"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Support
              </a>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground mb-0.5">
                Guides
              </span>
              <a
                href="/guides/what-is-an-ats-score"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                What is an ATS score?
              </a>
              <a
                href="/guides/cover-me-vs-chatgpt"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Cover Me vs ChatGPT
              </a>
              <a
                href="/guides/tailor-resume-to-job-description"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Tailor your resume
              </a>
              <a
                href="/guides"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                All guides
              </a>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground mb-0.5">
                Account
              </span>
              <a
                href="/auth"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </a>
              <a
                href="/auth?plan=pro"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Upgrade to Pro
              </a>
              <a
                href="/dashboard"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </a>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center pt-6 border-t border-border text-[12px] text-muted-foreground">
          <span>© {new Date().getFullYear()} Cover Me · MIT License</span>
          <span>Built in Canada</span>
        </div>
      </div>
    </footer>
  );
}

// ── Compare ───────────────────────────────────────────────────────────────────

type CellVal = string | boolean;

const COMPARE_COLS = ["Cover Me", "AI Chatbots", "AI Writing Tools"] as const;

const COMPARE_ROWS: { feature: string; vals: CellVal[] }[] = [
  { feature: "Price",                           vals: ["Free / $8/mo", "Free / $20/mo", "$39–$49/mo"] },
  { feature: "Auto-reads job posting",          vals: [true, false, false] },
  { feature: "Cover letter generation",         vals: [true, true, true] },
  { feature: "AI resume tailoring to role",     vals: [true, false, false] },
  { feature: "ATS match score & gap analysis",  vals: [true, false, false] },
  { feature: "Works inside your browser",       vals: [true, false, false] },
  { feature: "On-device privacy / BYOK mode",   vals: [true, false, false] },
  { feature: "Open source & auditable",         vals: [true, false, false] },
];

function CheckIcon2() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mx-auto shrink-0">
      <circle cx="8" cy="8" r="7.5" fill="rgba(34,197,94,0.12)" stroke="rgba(34,197,94,0.3)" />
      <path d="M5 8l2.2 2.2L11 5.5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mx-auto shrink-0">
      <circle cx="8" cy="8" r="7.5" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Compare() {
  return (
    <section className="py-[120px] max-[768px]:py-20">
      <div className="container">
        <div className="flex flex-col gap-2.5 mb-[52px]">
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-brand">
            Compare
          </span>
          <h2 className="text-[clamp(30px,3.8vw,48px)] font-extrabold tracking-[-1.5px] leading-none text-foreground max-w-[600px]">
            Cover Me vs. the alternatives
          </h2>
          <p className="text-[15px] text-muted-foreground leading-[1.75] max-w-[520px] mt-1">
            General AI tools require manual copy-paste and can&apos;t tailor your resume. Cover Me does both — automatically.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full max-w-[820px] text-[13px]" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground bg-elevated border border-border rounded-tl-[10px] w-[40%]">
                  Feature
                </th>
                {COMPARE_COLS.map((col, i) => (
                  <th
                    key={col}
                    className={cn(
                      "px-5 py-4 text-center text-[12px] font-bold border-t border-b border-r",
                      i === 0
                        ? "bg-[rgba(99,102,241,0.08)] text-brand-light border-[rgba(99,102,241,0.25)]"
                        : "bg-elevated text-muted-foreground border-border",
                      i === COMPARE_COLS.length - 1 && "rounded-tr-[10px]",
                    )}
                  >
                    <span className="block">{col}</span>
                    {i === 0 && (
                      <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-[0.07em] text-brand bg-brand-dim px-1.5 py-0.5 rounded-[3px]">
                        you&apos;re here
                      </span>
                    )}
                    {i === 1 && (
                      <span className="block text-[10px] font-normal text-dim mt-0.5">ChatGPT, Claude</span>
                    )}
                    {i === 2 && (
                      <span className="block text-[10px] font-normal text-dim mt-0.5">Jasper, Copy.ai</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map(({ feature, vals }, ri) => {
                const isLast = ri === COMPARE_ROWS.length - 1;
                return (
                  <tr key={feature}>
                    <td
                      className={cn(
                        "px-5 py-3.5 text-muted-foreground font-medium border-l border-b border-r border-border",
                        ri % 2 === 0 ? "bg-surface" : "bg-elevated",
                        isLast && "rounded-bl-[10px]",
                      )}
                    >
                      {feature}
                    </td>
                    {vals.map((val, ci) => (
                      <td
                        key={ci}
                        className={cn(
                          "px-5 py-3.5 text-center border-b border-r",
                          ci === 0
                            ? "bg-[rgba(99,102,241,0.05)] border-[rgba(99,102,241,0.2)]"
                            : cn("border-border", ri % 2 === 0 ? "bg-surface" : "bg-elevated"),
                          ci === COMPARE_COLS.length - 1 && isLast && "rounded-br-[10px]",
                        )}
                      >
                        {typeof val === "boolean" ? (
                          val ? <CheckIcon2 /> : <CrossIcon />
                        ) : (
                          <span className={ci === 0 ? "text-brand-light font-semibold" : "text-muted-foreground"}>
                            {val}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[11px] text-dim mt-3 max-w-[820px]">
            Feature comparison based on publicly available information as of June 2026.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "Is Cover Me free to use?",
    a: "Yes. Cover Me is free forever. In BYOK mode you use your own Claude or OpenAI API key — unlimited cover letters and resume tailoring at your own API cost, with no account required. The hosted free tier gives you 5 AI generations per day — cover letters and resume tailoring combined. Pro ($8/month) removes the daily limit and adds cross-device history sync.",
  },
  {
    q: "Can Cover Me tailor my resume too?",
    a: "Yes — click \"Tailor Resume to Job\" on any posting and Cover Me rewrites your resume bullets to match that role's ATS keywords, scores your match percentage, and surfaces the exact skill gaps. It never invents skills or changes your job history. Download the result as a formatted PDF instantly, or enable \"Compact to one page\" if the role requires a single-page resume.",
  },
  {
    q: "What is the ATS match score?",
    a: "The ATS match score is a percentage showing how well your tailored resume matches a specific job's requirements — for example, 78%. After tailoring, Cover Me breaks down exactly which keywords and skills you already match versus which are gaps, so you know where you stand before applying and can re-tailor with a stronger version if needed.",
  },
  {
    q: "What job boards does Cover Me support?",
    a: "Cover Me auto-scrapes job descriptions on LinkedIn, Indeed, Greenhouse, Lever, Workday, and Ashby. For any other job board or ATS, you can paste the job description manually — it works on any page in seconds.",
  },
  {
    q: "How is Cover Me different from using ChatGPT or Claude directly?",
    a: "Cover Me is purpose-built for job applications — it does things a general AI chatbot can't. It reads the job posting automatically, generates a tailored cover letter, and rewrites your resume bullets to match the role's ATS keywords, all without you copying or pasting anything. It also scores your resume against the role and surfaces the exact gaps. One click, done in seconds.",
  },
  {
    q: "Is my resume data private?",
    a: "Yes. In BYOK mode, your resume lives entirely on your device — nothing is ever sent to Cover Me servers. In hosted mode, your resume is encrypted with AES-256-GCM before being stored. Cover Me has no ads, no telemetry, and does not use your resume for AI training.",
  },
  {
    q: "Do I need an account to use Cover Me?",
    a: "No account is needed for BYOK mode — install the extension, add your resume and API key, and start generating immediately. You only need an account for the hosted free tier (5 letters/day) or Pro ($8/month).",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

function FAQ() {
  return (
    <section className="py-[120px] max-[768px]:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="container">
        <div className="flex flex-col gap-2.5 mb-[52px]">
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-brand">
            FAQ
          </span>
          <h2 className="text-[clamp(30px,3.8vw,48px)] font-extrabold tracking-[-1.5px] leading-none text-foreground max-w-[600px]">
            Common questions
          </h2>
        </div>
        <div className="max-w-[720px] divide-y divide-border border-t border-border">
          {FAQ_ITEMS.map(({ q, a }) => (
            <div key={q} className="py-8">
              <h3 className="text-[17px] font-bold text-foreground tracking-[-0.3px] mb-3 leading-[1.3]">
                {q}
              </h3>
              <p className="text-[14px] text-muted-foreground leading-[1.8]">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdApp) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdHowTo) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSpeakable) }} />
      <Nav />
      <main>
        <Hero />
        <WorksOn />
        <div className="h-px bg-border" />
        <HowItWorks />
        <div className="h-px bg-border" />
        <ATSScoreSection />
        <div className="h-px bg-border" />
        <Features />
        <div className="h-px bg-border" />
        <OpenSource />
        <div className="h-px bg-border" />
        <Pricing />
        <div className="h-px bg-border" />
        <Compare />
        <div className="h-px bg-border" />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
