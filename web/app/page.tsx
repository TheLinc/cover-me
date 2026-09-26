"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn, CHROME_STORE_URL } from "@/lib/utils";
import { jsonLdApp, jsonLdHowTo, jsonLdSpeakable } from "@/lib/structured-data";
import { HowItWorks } from '@/components/landing/HowItWorks'
import { AtsFit } from '@/components/landing/AtsFit'
import { CutLine } from '@/components/brand/CutLine'
import { Hero } from '@/components/landing/Hero'
import { BoardsTape } from '@/components/landing/BoardsTape'
import { FEATURES, FREE_FEATURES, PRO_FEATURES, COMPARE_COLS, COMPARE_ROWS, FAQ_ITEMS, faqJsonLd, type CellVal } from '@/components/landing/content'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import {
  ArrowUpRightIcon,
  CheckIcon,
} from "@phosphor-icons/react";

// ── Features ──────────────────────────────────────────────────────────────────


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

// ── Compare ───────────────────────────────────────────────────────────────────




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
      <SiteNav />
      <main>
        <Hero />
        <BoardsTape />
        <HowItWorks />
        <CutLine className="container" />
        <AtsFit />
        <CutLine className="container" />
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
      <SiteFooter />
    </>
  );
}
