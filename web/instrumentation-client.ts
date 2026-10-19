import * as Sentry from "@sentry/nextjs";
import { sentryEnvironment } from "@/lib/sentry-env";

const environment = sentryEnvironment();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment,

  // Never send IPs, cookies, or auth headers automatically
  sendDefaultPii: false,

  // 10% of transactions in production — raise after launch if needed
  tracesSampleRate: environment === "development" ? 1.0 : 0.1,

  // No session replay: it records keystrokes in form fields (passwords, resume text)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  beforeSend(event) {
    // Strip request body — could contain cover letter text or resume excerpts
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
    }

    // Strip user email — keep only the opaque ID for correlation
    if (event.user?.email) {
      event.user = { id: event.user.id };
    }

    return event;
  },

  // Silence noisy browser errors that aren't actionable
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    /^Network request failed$/,
    /^Failed to fetch$/,
    /^Load failed$/,
  ],
});

// Cookieless page views for UTM and referrer attribution (lib/analytics.ts).
// Off unless the key is set, which is only on Vercel's Production environment.
// /relay (app/relay) forwards to PostHog so ad blockers don't drop it.
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
if (posthogKey) {
  Promise.all([import("posthog-js"), import("@/lib/analytics")]).then(
    ([{ default: posthog }, { scrubEvent }]) => {
      posthog.init(posthogKey, {
        api_host: "/relay",
        ui_host: "https://us.posthog.com",
        defaults: "2026-08-30",
        cookieless_mode: "always",
        person_profiles: "never",
        // Ad click IDs (fbclid, gclid, ...) become "<masked>" in the browser
        mask_personal_data_properties: true,
        autocapture: false,
        capture_heatmaps: false,
        capture_dead_clicks: false,
        capture_exceptions: false,
        capture_performance: false,
        disable_session_recording: true,
        disable_surveys: true,
        advanced_disable_flags: true,
        before_send: scrubEvent,
      });
    },
  );
}
