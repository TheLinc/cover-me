"use client";

import { useState, type ReactNode } from "react";
import { openBilling } from "@/lib/billing";
import { describeAllowance, type Allowance } from "@/lib/limits";
import { LocalDate } from "./LocalDate";
import { CHROME_STORE_URL, cn } from "@/lib/utils";
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

const TILE = "flex flex-col rounded-[20px] border border-line bg-surface px-6 py-5 shadow-[0_1px_2px_rgba(30,27,75,0.05),0_10px_28px_-16px_rgba(30,27,75,0.22)]";

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
  const leftPct = usage ? Math.max(0, ((usage.limit - usage.used) / usage.limit) * 100) : 0;
  const proDaily = allowance?.pro_daily ?? 25;

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

          {/* Plan and usage: two tiles, stacked on phones. Usage leads with what's left. */}
          <section aria-label="Plan and usage" className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className={cn(TILE, "gap-2.5")}>
              <span className="text-[12.5px] text-subtle">{usage?.label ?? 'Generations'}</span>
              {usage ? (
                <>
                  <p className="text-[14px] tabular-nums text-ink-2">
                    <span className="mr-1 text-[34px] font-semibold leading-none tracking-[-0.03em] text-ink">{usage.limit - usage.used}</span>of {usage.limit} left
                  </p>
                  {/* Free allowances are a handful of generations, one cell each; Pro's daily 25 is a bar. */}
                  {allowance?.kind === 'daily' ? (
                    <Progress value={leftPct} className="h-1.5" aria-label={`${usage.limit - usage.used} of ${usage.limit} left`} />
                  ) : (
                    <div role="img" aria-label={`${usage.limit - usage.used} of ${usage.limit} left`} className="flex gap-1">
                      {Array.from({ length: usage.limit }, (_, i) => (
                        <span key={i} className={`h-2 flex-1 rounded-full ${i < usage.limit - usage.used ? 'bg-brand' : 'bg-panel'}`} />
                      ))}
                    </div>
                  )}
                  <span className="text-[12.5px] text-subtle">{usage.resets}</span>
                </>
              ) : (
                <>
                  <p className="text-[14px] text-ink-2">Couldn&apos;t load your usage right now.</p>
                  <div aria-hidden className="h-1.5 rounded-full bg-panel" />
                </>
              )}
            </div>
            {isPro ? (
              <div className={cn(TILE, "items-start gap-2.5")}>
                <span className="text-[12.5px] text-subtle">Plan</span>
                <p className="flex items-center gap-2 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-ink">
                  Pro <StarIcon size={16} weight="fill" className="text-brand-strong" aria-hidden />
                </p>
                <p className="text-[13.5px] text-ink-2">{proDaily} generations a day. Every application saved here and searchable.</p>
                <Button variant="outline" size="sm" className="mt-1 rounded-full" onClick={handleBillingPortal} disabled={billingLoading}>
                  {billingLoading
                    ? <><Spinner className="size-3.5" />Loading</>
                    : <>Manage billing <ArrowUpRightIcon size={12} aria-hidden /></>
                  }
                </Button>
                {billingError && <p className="text-[12px] leading-snug text-destructive">{billingError}</p>}
              </div>
            ) : (
              <div className={cn(TILE, "items-start gap-2.5 border-brand-tint bg-brand-tint")}>
                <span className="text-[12.5px] font-medium text-brand-ink">Go Pro</span>
                <ul className="flex flex-col gap-1 text-[13.5px] text-ink">
                  {[`${proDaily} generations a day`, 'Every application saved here, searchable', 'Cancel any time'].map((line) => (
                    <li key={line} className="flex items-center gap-2"><span aria-hidden className="size-1.5 rounded-full bg-brand" />{line}</li>
                  ))}
                </ul>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Button size="sm" className="rounded-full px-4" onClick={() => handleUpgrade('monthly')} disabled={upgrading !== null}>
                    {upgrading === 'monthly' ? <><Spinner className="size-3.5" />Redirecting</> : <>Upgrade, $15/mo <ArrowUpRightIcon size={12} aria-hidden /></>}
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full px-4" onClick={() => handleUpgrade('quarterly')} disabled={upgrading !== null}>
                    {upgrading === 'quarterly' ? <><Spinner className="size-3.5" />Redirecting</> : '$35 every 3 months'}
                  </Button>
                </div>
                {upgradeError && <p className="text-[12px] leading-snug text-destructive">{upgradeError}</p>}
              </div>
            )}
          </section>

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
