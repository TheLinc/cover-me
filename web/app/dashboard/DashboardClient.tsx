"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { CHROME_STORE_URL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowUpRightIcon,
  CheckCircleIcon,
  GoogleChromeLogoIcon,
  StarIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Spinner } from "@/components/ui/spinner";

interface Props {
  email: string;
  tier: string;
  memberSince: string;
  usageToday: number;
  justUpgraded?: boolean;
}

const FREE_LIMIT = 10;

export default function DashboardClient({
  email,
  tier,
  memberSince,
  usageToday,
  justUpgraded = false,
}: Props) {
  const [signingOut, setSigningOut]         = useState(false);
  const [upgrading, setUpgrading]           = useState(false);
  const [upgradeError, setUpgradeError]     = useState('');
  const [billingLoading, setBillingLoading] = useState(false);
  const [upgradeBanner, setUpgradeBanner]   = useState(justUpgraded);

  // Strip ?upgraded=1 from the URL so a refresh doesn't re-show the banner.
  useEffect(() => {
    if (justUpgraded) {
      window.history.replaceState(null, '', '/dashboard');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const isPro = tier === "hosted_pro" || justUpgraded;
  const initial = email[0]?.toUpperCase() ?? "?";
  const memberDate = new Date(memberSince).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const usagePct = Math.min(100, (usageToday / FREE_LIMIT) * 100);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function handleBillingPortal() {
    setBillingLoading(true);
    try {
      const res  = await fetch('/api/billing-portal', { method: 'POST' });
      const data = await res.json() as { url?: string };
      if (data.url) window.location.href = data.url;
    } catch {
      setBillingLoading(false);
    }
  }

  async function handleUpgrade() {
    setUpgrading(true);
    setUpgradeError('');
    try {
      const res  = await fetch('/api/checkout', { method: 'POST' });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setUpgradeError(data.error ?? 'Something went wrong. Please try again.');
        setUpgrading(false);
      }
    } catch {
      setUpgradeError('Could not reach the server. Please try again.');
      setUpgrading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_900px_600px_at_70%_-5%,rgba(99,102,241,0.06)_0%,transparent_65%)]" />

      {/* Nav */}
      <nav className="sticky top-0 z-20 bg-[rgba(13,17,23,0.88)] backdrop-blur-xl [-webkit-backdrop-filter:blur(20px)] border-b border-border">
        <div className="max-w-[860px] mx-auto px-10 h-[58px] flex items-center justify-between max-[700px]:px-5">
          <a
            href="/"
            className="flex items-center gap-[9px] text-[15px] font-bold text-foreground tracking-[-0.3px]"
          >
            <Image src="/logo.png" width={22} height={22} alt="Cover Me" />
            Cover Me
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <>
                <Spinner className="size-3.5" />
                Signing out
              </>
            ) : (
              "Sign out"
            )}
          </Button>
        </div>
      </nav>

      {/* Main */}
      <main className="px-5 pt-14 pb-24 relative z-[1]">
        <div className="max-w-[860px] mx-auto flex flex-col gap-4">

          {/* Upgrade success banner */}
          {upgradeBanner && (
            <div
              className="flex items-center gap-3 bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.25)] rounded-[10px] px-5 py-3.5"
              style={{ animation: 'fadeUp 0.4s ease both' }}
            >
              <CheckCircleIcon size={18} className="text-success shrink-0" weight="fill" />
              <p className="text-[13.5px] text-foreground flex-1 leading-snug">
                <span className="font-bold">You&apos;re on Pro.</span>{' '}
                <span className="text-muted-foreground">Unlimited letters, cross-device sync, and every future feature — all yours.</span>
              </p>
              <button
                aria-label="Dismiss"
                className="text-dim hover:text-muted-foreground transition-colors shrink-0"
                onClick={() => setUpgradeBanner(false)}
              >
                <XIcon size={15} />
              </button>
            </div>
          )}
          {/* Identity header */}
          <header
            className="flex items-start justify-between gap-6 pb-10 border-b border-border mb-1 max-[700px]:flex-col-reverse max-[700px]:gap-4"
            style={{ animation: "fadeUp 0.5s ease both" }}
          >
            <div className="flex flex-col gap-2.5">
              <h1 className="text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-1.8px] leading-none text-foreground">
                Good to see you.
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13.5px] text-muted-foreground">
                  {email}
                </span>
                <span className="inline-block w-[3px] h-[3px] rounded-full bg-border shrink-0" />
                <span className="text-[13px] text-muted-foreground">
                  Member since {memberDate}
                </span>
              </div>
            </div>
            <div className="w-14 h-14 max-[700px]:w-11 max-[700px]:h-11 rounded-full bg-brand-dim border border-[rgba(99,102,241,0.28)] text-brand-light text-xl font-extrabold flex items-center justify-center shrink-0 tracking-[-1px]">
              {initial}
            </div>
          </header>

          {/* Stats — hairline border grid */}
          <div
            className="grid grid-cols-[180px_1fr_160px] max-[700px]:grid-cols-2 gap-px bg-border border border-border rounded-[10px] overflow-hidden"
            style={{ animation: "fadeUp 0.5s ease 0.08s both" }}
          >
            {/* Plan */}
            <div className="bg-surface px-[26px] py-[22px] flex flex-col gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Plan
              </span>
              {isPro ? (
                <div className="inline-flex items-center gap-[5px] text-[11.5px] font-bold text-white bg-brand px-3 py-[5px] rounded-full w-fit tracking-[-0.1px]">
                  <StarIcon size={9} weight="fill" />
                  Pro
                </div>
              ) : (
                <div className="inline-flex items-center text-[11.5px] font-semibold text-muted-foreground bg-elevated border border-border px-3 py-[5px] rounded-full w-fit">
                  Free
                </div>
              )}
            </div>

            {/* Letters today */}
            <div className="bg-surface px-[26px] py-[22px] flex flex-col gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Letters today
              </span>
              {isPro ? (
                <div className="text-[28px] font-extrabold tracking-[-1.2px] text-foreground leading-none flex items-baseline gap-0.5">
                  {usageToday}
                  <span className="text-[13px] font-medium text-muted-foreground tracking-normal">
                    {" "}
                    · unlimited
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <div className="text-[28px] font-extrabold tracking-[-1.2px] text-foreground leading-none flex items-baseline gap-0.5">
                    {usageToday}
                    <span className="text-[13px] font-medium text-muted-foreground tracking-normal">
                      {" "}
                      / {FREE_LIMIT}
                    </span>
                  </div>
                  <Progress value={usagePct} className="h-1" />
                </div>
              )}
            </div>

            {/* Resets */}
            <div className="bg-surface px-[26px] py-[22px] flex flex-col gap-2.5 max-[700px]:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Resets
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-[20px] font-extrabold tracking-[-0.8px] text-foreground leading-none">
                  Midnight
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  UTC
                </span>
              </div>
            </div>
          </div>

          {/* Upgrade card (free) / Pro confirmation (pro) */}
          {!isPro ? (
            <div
              className="relative bg-gradient-to-br from-surface to-[rgba(99,102,241,0.05)] border border-[rgba(99,102,241,0.22)] rounded-[10px] px-8 py-7 flex items-center justify-between gap-8 overflow-hidden shadow-[0_0_48px_rgba(99,102,241,0.05)] max-[700px]:flex-col max-[700px]:items-start"
              style={{ animation: "fadeUp 0.5s ease 0.16s both" }}
            >
              {/* Decorative glow */}
              <div className="absolute -top-[60px] -right-[60px] w-[200px] h-[200px] rounded-full bg-[radial-gradient(ellipse,rgba(99,102,241,0.1)_0%,transparent_65%)] pointer-events-none" />

              <div className="flex flex-col gap-1.5 relative z-[1] flex-1 min-w-0">
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-light mb-0.5">
                  <StarIcon size={10} weight="fill" />
                  Cover Me Pro
                </span>
                <h2 className="text-[17px] font-extrabold tracking-[-0.4px] text-foreground leading-[1.2]">
                  Remove the daily limit.
                </h2>
                <p className="text-[13px] text-muted-foreground leading-[1.65] max-w-[420px]">
                  Unlimited letters per day, cross-device history sync, and
                  priority access to every new feature. Cancel any time.
                </p>
              </div>

              <div className="flex flex-col items-end gap-3 relative z-[1] shrink-0 max-[700px]:flex-row max-[700px]:items-center">
                <div className="text-[32px] font-extrabold tracking-[-1.5px] text-brand-light leading-none gap-1 flex items-baseline">
                  $4
                  <span className="text-[14px] font-medium text-muted-foreground tracking-normal">
                    /mo
                  </span>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Button onClick={handleUpgrade} disabled={upgrading} className="shrink-0">
                    {upgrading
                      ? <><Spinner />Redirecting</>
                      : <>Upgrade to Pro <ArrowUpRightIcon size={12} /></>
                    }
                  </Button>
                  {upgradeError && (
                    <p className="text-[12px] text-destructive max-w-[200px] text-right leading-snug">
                      {upgradeError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="bg-surface border border-[rgba(99,102,241,0.2)] rounded-[10px] px-7 py-6 flex items-start gap-4"
              style={{ animation: "fadeUp 0.5s ease 0.16s both" }}
            >
              <div className="w-10 h-10 rounded-lg bg-brand-dim border border-[rgba(99,102,241,0.2)] flex items-center justify-center shrink-0 text-brand-light">
                <StarIcon size={16} weight="fill" />
              </div>
              <div className="flex-1">
                <h2 className="text-[15px] font-bold text-foreground tracking-[-0.2px] mb-1">
                  You&apos;re on Pro
                </h2>
                <p className="text-[13px] text-muted-foreground leading-[1.65] mb-3">
                  Unlimited letters, cross-device history sync, and all future features included.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBillingPortal}
                  disabled={billingLoading}
                >
                  {billingLoading
                    ? <><Spinner className="size-3.5" />Loading</>
                    : <>Manage billing <ArrowUpRightIcon size={11} /></>
                  }
                </Button>
              </div>
            </div>
          )}

          {/* Extension CTA */}
          <div
            className="bg-surface border border-border rounded-[10px] px-7 py-[22px] flex items-center justify-between gap-6 max-[700px]:flex-col max-[700px]:items-start max-[700px]:gap-3.5"
            style={{ animation: "fadeUp 0.5s ease 0.24s both" }}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-[38px] h-[38px] rounded-[7px] bg-elevated border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                <GoogleChromeLogoIcon size={17} />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-foreground tracking-[-0.2px] mb-0.5 truncate max-[700px]:whitespace-normal">
                  Generate letters directly on any job board
                </p>
                <p className="text-[12.5px] text-muted-foreground truncate max-[700px]:whitespace-normal">
                  LinkedIn, Indeed, Greenhouse, Lever, Workday — one click, five seconds.
                </p>
              </div>
            </div>
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" size="sm">
                Install extension
                <ArrowUpRightIcon size={11} />
              </Button>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
