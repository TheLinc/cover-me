import * as Sentry from "@sentry/nextjs";
import { dropSurveyAccountId, sentryEnvironment } from "@/lib/sentry-env";

const environment = sentryEnvironment();
// Local `pnpm dev` would report into the same project as real users (#183)
const enabled = environment !== "development";

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment,
  enabled,

  sendDefaultPii: false,

  tracesSampleRate: 0.1,

  // No session replay: it records keystrokes in form fields (passwords, resume text).
  // https://github.com/TheLinc/cover-me/commit/7278c734f584b4f1b0edaeb85b53e08057690783
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  beforeSend(event) {
    // The body can hold cover letter or resume text: https://github.com/TheLinc/cover-me/commit/7278c734f584b4f1b0edaeb85b53e08057690783
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
    }

    if (event.user?.email) {
      event.user = { id: event.user.id };
    }

    return dropSurveyAccountId(event);
  },
  beforeSendTransaction: dropSurveyAccountId,

  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    /^Network request failed$/,
    /^Failed to fetch$/,
    /^Load failed$/,
    // Brave and Firefox on iOS inject scripts that read window.__firefox__:
    // https://sentry.io/issues/7860907106/ https://sentry.io/issues/7860907084/
    /__firefox__/,
  ],

  // A browser extension's script throws "reading 'M_ID'" from executors/<n>.js.
  // None of the site's own code lives at that path (#183).
  denyUrls: [/\/executors\/\d+\.js/],
});

// The opaque account id on signed-in events, as the privacy policy says (#183). Never
// the email. INITIAL_SESSION sets it on load, SIGNED_OUT clears it. Only with a
// Supabase auth cookie (sb-<ref>-auth-token), so signed-out visitors don't
// load the auth client; signing in reloads the page, which sets it.
if (enabled && document.cookie.includes("-auth-token")) {
  import("@/lib/supabase").then(({ createClient }) => {
    createClient().auth.onAuthStateChange((_event, session) => {
      Sentry.setUser(session ? { id: session.user.id } : null);
    });
  });
}

// Cookieless page views for UTM and referrer attribution (lib/analytics.ts).
// Off unless the key is set, which is only on Vercel's Production environment.
// /relay (app/relay) forwards to PostHog so ad blockers don't drop it: https://posthog.com/docs/advanced/proxy
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
if (posthogKey) {
  Promise.all([import("posthog-js"), import("@/lib/analytics")]).then(
    ([{ default: posthog }, { POSTHOG_LOADED, scrubEvent, storeClick }]) => {
      posthog.init(posthogKey, {
        api_host: "/relay",
        ui_host: "https://us.posthog.com",
        defaults: "2026-08-30",
        cookieless_mode: "always",
        person_profiles: "never",
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
        loaded: () => window.dispatchEvent(new Event(POSTHOG_LOADED)),
      });
      // Capture phase, so a component that stops propagation still counts: https://github.com/TheLinc/cover-me/commit/40e0259a846468cca04837426ab874f17ac1309c
      const onClick = (e: MouseEvent) => {
        const props = storeClick(e);
        if (props) posthog.capture("store_link_clicked", props);
      };
      document.addEventListener("click", onClick, true);
      document.addEventListener("auxclick", onClick, true);
    },
  );
}
