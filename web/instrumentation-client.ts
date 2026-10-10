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
