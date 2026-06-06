"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="/auth">Sign in</a>
            </Button>
            <Button asChild size="sm">
              <a
                href="https://chrome.google.com/webstore"
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

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 2000);
    const t2 = setTimeout(() => setPhase(2), 3800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div
      className="mt-16 border border-border rounded-[10px] overflow-hidden shadow-[0_48px_120px_rgba(0,0,0,0.55),0_0_0_1px_rgba(99,102,241,0.06)]"
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
            // mobile: align top-right with the Cover Me icon in the chrome bar (right-3 = px-3 padding)
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

          {/* Fixed-height body — skeleton and letter are stacked */}
          <div className="h-[204px] relative overflow-hidden">
            <div
              className={cn(
                "absolute inset-0 p-[14px] flex flex-col gap-[14px] transition-opacity [transition-duration:350ms]",
                phase >= 2 && "opacity-0 pointer-events-none",
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

            <div
              className={cn(
                "absolute inset-0 p-[14px] flex flex-col gap-[9px] overflow-hidden opacity-0 transition-opacity [transition-duration:450ms]",
                phase >= 2 && "opacity-100",
              )}
            >
              {DEMO_PARAS.map((p, i) => (
                <p
                  key={i}
                  className="text-[10.5px] leading-[1.75] text-foreground"
                >
                  {p}
                </p>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="px-3 py-[9px] border-t border-border flex gap-1.5">
            <button className="flex-1 inline-flex items-center justify-center gap-[5px] bg-brand text-white border-none rounded-[4px] py-[7px] px-2.5 text-[11px] font-semibold cursor-default">
              <CopyIcon size={10} />
              Copy
            </button>
            <button className="bg-elevated text-muted-foreground border border-border rounded-[4px] py-[7px] px-2.5 text-[11px] font-semibold cursor-default">
              PDF
            </button>
            <button className="bg-elevated text-muted-foreground border border-border rounded-[4px] py-[7px] px-2.5 text-[11px] font-semibold cursor-default">
              Edit
            </button>
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
        {phase === 1 && (
          <span key="1" style={{ animation: "fadeIn 0.4s ease both" }}>
            Reading the posting and your resume&hellip;
          </span>
        )}
        {phase === 2 && (
          <span key="2" style={{ animation: "fadeIn 0.4s ease both" }}>
            Done in under 5 seconds &mdash; edit, copy, or download as PDF.
          </span>
        )}
      </div>
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
          <h1 className="text-[clamp(48px,7vw,84px)] font-extrabold leading-[0.91] tracking-[-3px] text-foreground max-[768px]:tracking-[-2px]">
            The cover letter
            <br />
            that gets you <span className="hero-hired">hired.</span>
          </h1>
          <p className="text-[16px] leading-[1.7] text-muted-foreground max-w-[480px] mt-1.5">
            Stop writing cover letters from scratch. Cover Me reads the job
            posting, surfaces the keywords, and builds a tailored letter from
            your resume — in under five seconds.
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
              <p className="text-[19px] font-bold text-[#a5b4fc] leading-none">5 sec</p>
              <p className="text-[11px] font-medium text-[#818cf8] tracking-[0.06em] uppercase mt-[5px]">per application</p>
            </div>
          </div>
          <div className="flex gap-2.5 flex-wrap justify-center mt-2">
            <Button asChild size="lg">
              <a
                href="https://chrome.google.com/webstore"
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
          <p className="flex items-center gap-2.5 text-[12px] text-muted-foreground tracking-[0.01em]">
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
  const boards = [
    "LinkedIn",
    "Indeed",
    "Greenhouse",
    "Lever",
    "Workday",
    "Ashby",
    "Any job board",
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
              <span key={b} className="flex items-center gap-2.5">
                <span className="text-[12.5px] font-medium text-muted-foreground">
                  {b}
                </span>
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
    body: "Add the extension from the Chrome Web Store. Upload your resume — PDF or DOCX, text is extracted locally on your device and never stored raw. Choose BYOK with your own Claude or OpenAI key for unlimited free use, or sign up for 10 free hosted letters per day. No credit card required.",
  },
  {
    n: "02",
    title: "Navigate to any job posting",
    body: "Open a job on LinkedIn, Indeed, Greenhouse, Lever, Workday, or Ashby. Cover Me reads the page automatically. If the scraper doesn't catch it, paste the description manually — it takes five seconds and works on any page.",
  },
  {
    n: "03",
    title: "Generate, edit, and apply",
    body: "Click Generate. Cover Me reads the job requirements, identifies the keywords and skills the role demands, and maps them to your actual achievements — producing a letter specific to that posting in under five seconds. Edit inline, copy to clipboard, or export as PDF.",
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
            From job posting to tailored cover letter in 5 seconds.
          </h2>
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
    body: "Every letter is fully editable in the extension. Adjust tone, length, or specific details before copying or exporting.",
    span: "col-span-2 max-[900px]:col-span-full",
  },
  {
    title: "Full letter history",
    body: "Every generated letter is saved locally. Review, copy, or regenerate any previous letter — even weeks after it was created.",
    span: "col-span-2 max-[900px]:col-span-full",
  },
  {
    title: "Keywords from the posting, built in",
    body: "Cover Me reads the job description to find the exact skills, tools, and terms the role demands, then weaves them naturally into your letter — so you surface in ATS filters and make clear you actually read the posting.",
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
            More applications. Each one specific. Zero extra hours.
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
  "10 letters per day (hosted)",
  "BYOK — your key, unlimited & free",
  "All major job boards",
  "Edit & export to PDF",
  "Local letter history",
];

const PRO_FEATURES = [
  "Unlimited letters per day",
  "All major job boards",
  "Edit & export to PDF",
  "Letter history synced cross-device",
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
                href="https://chrome.google.com/webstore"
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
                $4
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
              A tailored cover letter for every job you apply to.
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
                href="https://chrome.google.com/webstore"
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <WorksOn />
        <div className="h-px bg-border" />
        <HowItWorks />
        <div className="h-px bg-border" />
        <Features />
        <div className="h-px bg-border" />
        <OpenSource />
        <div className="h-px bg-border" />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
