"use client";

import { useState, type ReactNode } from "react";
import { openBilling } from "@/lib/billing";
import { describeAllowance, type Allowance } from "@/lib/limits";
import { LocalDate } from "./LocalDate";
import { CHROME_STORE_URL } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowUpRightIcon,
  GoogleChromeLogoIcon,
  StarIcon,
} from "@phosphor-icons/react";
import { Spinner } from "@/components/ui/spinner";
import { SiteNav } from '@/components/site/SiteNav'
import { appLinks } from '@/components/site/app-links'
import { SignOutButton } from '@/components/site/SignOutButton'

interface Props {
  email: string;
  avatar: string | null;
  tier: string;
  memberSince: string;
  allowance: Allowance | null;
  // Pro history, rendered by the server page and streamed in (2e).
  history: ReactNode;
}

export default function DashboardClient({
  email,
  avatar,
  tier,
  memberSince,
  allowance,
  history,
}: Props) {
  const [avatarFailed, setAvatarFailed]     = useState(false);
  const [upgrading, setUpgrading]           = useState<'monthly' | 'quarterly' | null>(null);
  const [upgradeError, setUpgradeError]     = useState('');
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError]     = useState('');
  const isPro = tier === "hosted_pro";
  const initial = email[0]?.toUpperCase() ?? "?";
  const usage = describeAllowance(allowance);
  const usagePct = usage ? Math.min(100, (usage.used / usage.limit) * 100) : 0;

  async function handleBillingPortal() {
    setBillingLoading(true);
    setBillingError('');
    try {
      const data = await openBilling('portal');
      if (data.url) {
        window.location.href = data.url;
      } else {
        setBillingError(data.error ?? 'Something went wrong. Please try again.');
        setBillingLoading(false);
      }
    } catch {
      setBillingError('Could not reach the server. Please try again.');
      setBillingLoading(false);
    }
  }

  async function handleUpgrade(plan: 'monthly' | 'quarterly') {
    setUpgrading(plan);
    setUpgradeError('');
    try {
      const data = await openBilling('checkout', plan);
      if (data.url) {
        window.location.href = data.url;
      } else {
        setUpgradeError(data.error ?? 'Something went wrong. Please try again.');
        setUpgrading(null);
      }
    } catch {
      setUpgradeError('Could not reach the server. Please try again.');
      setUpgrading(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">

      <SiteNav links={appLinks(isPro)} actions={<SignOutButton />} />

      <main className="relative z-[1] px-5 pb-24 pt-12">
        <div className="mx-auto flex max-w-[1040px] flex-col gap-8">

          {/* Who's here */}
          <header className="flex items-center justify-between gap-6">
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.03em] text-ink">Good to see you.</h1>
              <p className="truncate text-[14px] text-ink-2">
                {email} · Member since <LocalDate iso={memberSince} options={{ month: "long", year: "numeric" }} />
              </p>
            </div>
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-tint text-[18px] font-semibold text-brand-ink">
              {avatar && !avatarFailed ? (
                // A plain img: next/image would need Google's image host allowed in next.config.
                <img
                  src={avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                initial
              )}
            </div>
          </header>

          {/* Plan and usage: one strip, read left to right. Free accounts get the upgrade in its last slot. */}
          <div className="flex flex-col gap-3">
            <section aria-label="Plan and usage" className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-[20px] border border-line/80 bg-surface px-6 py-5 shadow-[0_1px_2px_rgba(30,27,75,0.05),0_10px_28px_-16px_rgba(30,27,75,0.22)]">
              <div className="flex flex-col gap-1.5">
                <span className="text-[12.5px] text-subtle">Plan</span>
                {isPro ? (
                  <Badge variant="pro" className="w-fit gap-1"><StarIcon size={10} weight="fill" aria-hidden />Pro</Badge>
                ) : (
                  <Badge variant="free" className="w-fit">Free</Badge>
                )}
              </div>
              <div className="flex min-w-[220px] flex-1 flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[12.5px] text-subtle">{usage?.label ?? 'Usage'}</span>
                  {usage ? (
                    <span className="text-[13px] tabular-nums text-ink-2">
                      <span className="text-[20px] font-semibold tracking-[-0.02em] text-ink">{usage.used}</span> of {usage.limit}
                    </span>
                  ) : (
                    <span className="text-[13px] text-ink-2">Unavailable right now</span>
                  )}
                </div>
                <Progress value={usagePct} className="h-1.5" aria-label={usage ? `${usage.used} of ${usage.limit} used` : 'Usage unavailable'} />
                {usage && <span className="text-[12.5px] text-subtle">{usage.resets}</span>}
              </div>
              {isPro ? (
                <div className="flex flex-col items-start gap-1.5">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={handleBillingPortal} disabled={billingLoading}>
                    {billingLoading
                      ? <><Spinner className="size-3.5" />Loading</>
                      : <>Manage billing <ArrowUpRightIcon size={12} aria-hidden /></>
                    }
                  </Button>
                  {billingError && <p className="max-w-[220px] text-[12px] leading-snug text-destructive">{billingError}</p>}
                </div>
              ) : (
                <div className="flex flex-col items-start gap-1.5">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="rounded-full px-4" onClick={() => handleUpgrade('monthly')} disabled={upgrading !== null}>
                      {upgrading === 'monthly' ? <><Spinner className="size-3.5" />Redirecting</> : <>Upgrade, $15/mo <ArrowUpRightIcon size={12} aria-hidden /></>}
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-full px-4" onClick={() => handleUpgrade('quarterly')} disabled={upgrading !== null}>
                      {upgrading === 'quarterly' ? <><Spinner className="size-3.5" />Redirecting</> : '$35 every 3 months'}
                    </Button>
                  </div>
                  {upgradeError && <p className="max-w-[260px] text-[12px] leading-snug text-destructive">{upgradeError}</p>}
                </div>
              )}
            </section>
            {!isPro && (
              <p className="px-1 text-[13.5px] text-ink-2">
                Pro gives you up to 25 generations a day and saves every application here, searchable. Cancel any time.
              </p>
            )}
          </div>

          {/* Pro history (2e), streamed in by the server page. */}
          {history}

          {/* Where the work happens */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
            <p className="flex items-center gap-2.5 text-[13.5px] text-ink-2">
              <GoogleChromeLogoIcon size={18} className="text-subtle" aria-hidden />
              Make letters on LinkedIn, Indeed, Greenhouse, Lever and Workday: one click, about 20 seconds.
            </p>
            <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13.5px] font-medium text-brand-strong underline-offset-4 hover:underline">
              Install the extension <ArrowUpRightIcon size={12} aria-hidden />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
