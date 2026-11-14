"use client";

import { useEffect, useState, type ReactNode } from "react";
import { firstMonthOffer, openBilling, type FirstMonthOffer } from "@/lib/billing";
import { describeAllowance, type Allowance } from "@/lib/limits";
import { DaysLeft, LocalDate } from "./LocalDate";
import type { TrialState } from "@/lib/stripe-tier";
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
import { APP_LINKS } from '@/components/site/app-links'
import { AccountMenu } from '@/components/site/AccountMenu'

const TILE = "flex flex-col rounded-[20px] border border-line bg-surface px-6 py-5 shadow-[0_1px_2px_rgba(30,27,75,0.05),0_10px_28px_-16px_rgba(30,27,75,0.22)]";

interface Props {
  email: string;
  avatar: string | null;
  // greetingFor(), picked on the server so it can't differ after hydration.
  greeting: string;
  tier: string;
  // A gift trial keeps the upgrade buttons; a plan bought during one shows its first payment.
  trial: TrialState;
  allowance: Allowance | null;
  // Recent applications, rendered by the server page and streamed in.
  history: ReactNode;
}

export default function DashboardClient({
  email,
  avatar,
  greeting,
  tier,
  trial: { giftTrialEnd, firstPayment },
  allowance,
  history,
}: Props) {
  const [upgrading, setUpgrading]           = useState<'monthly' | 'quarterly' | null>(null);
  const [upgradeError, setUpgradeError]     = useState('');
  const [offer, setOffer]                   = useState<FirstMonthOffer | null>(null);
  const isPro = tier === "hosted_pro";

  // The first-month offer (#213), if one is open. Loads after the page, and
  // any failure just leaves it out.
  useEffect(() => {
    if (!isPro) firstMonthOffer().then(setOffer, () => {});
  }, [isPro]);
  const usage = describeAllowance(allowance);
  const leftPct = usage && usage.limit > 0 ? ((usage.limit - usage.used) / usage.limit) * 100 : 0;
  const proDaily = allowance?.pro_daily ?? 25;

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

      <SiteNav links={APP_LINKS} actions={<AccountMenu email={email} avatar={avatar} />} />

      <main className="relative z-[1] px-5 pb-24 pt-12">
        <div className="mx-auto flex max-w-[1040px] flex-col gap-8">

          <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.03em] text-ink">{greeting}</h1>

          {/* Plan and usage: two tiles, stacked on phones. Usage leads with what's left. */}
          <section aria-label="Plan and usage" className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className={cn(TILE, "gap-2.5")}>
              <span className="text-[12.5px] text-subtle">{usage?.label ?? 'Generations'}</span>
              {usage ? (
                <>
                  <p className="text-[14px] tabular-nums text-ink-2">
                    <span className="text-[34px] font-semibold leading-none tracking-[-0.03em] text-ink">{usage.limit - usage.used}</span> of {usage.limit} left
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
            {isPro && !giftTrialEnd ? (
              <div className={cn(TILE, "items-start gap-2.5")}>
                <span className="text-[12.5px] text-subtle">Plan</span>
                <p className="flex items-center gap-2 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-ink">
                  Pro <StarIcon size={16} weight="fill" className="text-brand-strong" aria-hidden />
                </p>
                <p className="text-[13.5px] text-ink-2">{proDaily} generations a day. Your letters and resumes saved here, on every device.</p>
                {firstPayment && (
                  <p className="text-[13.5px] text-ink-2">
                    <strong className="font-semibold text-ink">First payment <LocalDate iso={firstPayment.date} options={{ month: "long", day: "numeric" }} />:</strong> {firstPayment.price}.
                  </p>
                )}
              </div>
            ) : (
              <div id="upgrade" className={cn(TILE, "scroll-mt-24 items-start gap-2.5 border-brand-tint bg-brand-tint")}>
                {giftTrialEnd ? (
                  <>
                    <span className="text-[12.5px] font-medium text-brand-ink">Pro trial<DaysLeft iso={giftTrialEnd} /></span>
                    <p className="text-[13.5px] text-ink">
                      Ends <LocalDate iso={giftTrialEnd} options={{ month: "long", day: "numeric" }} />, then you&apos;re back on the free plan.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-[12.5px] font-medium text-brand-ink">Go Pro</span>
                    {offer && (
                      <p className="text-[13.5px] text-ink">
                        <strong className="font-semibold">{offer.name ?? "Your first month is discounted"}</strong> on the monthly plan, taken off at checkout. Ends <LocalDate iso={offer.endsAt} options={{ month: "long", day: "numeric" }} />.
                      </p>
                    )}
                    <ul className="flex flex-col gap-1 text-[13.5px] text-ink">
                      {[`${proDaily} generations a day`, 'Your letters and resumes on every device', 'Cancel any time'].map((line) => (
                        <li key={line} className="flex items-center gap-2"><span aria-hidden className="size-1.5 rounded-full bg-brand" />{line}</li>
                      ))}
                    </ul>
                  </>
                )}
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

          {/* Recent applications, streamed in by the server page. */}
          {history}

          {/* Where the work happens */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
            <p className="flex items-center gap-2.5 text-[13.5px] text-ink-2">
              <GoogleChromeLogoIcon size={18} className="text-subtle" aria-hidden />
              Make letters on LinkedIn, Indeed, Greenhouse, Lever, Workday and Ashby in one click.
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
