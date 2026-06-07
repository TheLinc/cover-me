import * as Sentry from "@sentry/nextjs";

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Never send IPs, cookies, or auth headers automatically
  sendDefaultPii: false,

  // 10% of transactions in production — raise after launch if needed
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

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
