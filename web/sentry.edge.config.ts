import * as Sentry from "@sentry/nextjs";
import { dropSurveyAccountId, scrubServerEvent, sentryEnvironment } from "@/lib/sentry-env";

const environment = sentryEnvironment();

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment,
  // Local `pnpm dev` would report into the same project as real users
  enabled: environment !== "development",

  sendDefaultPii: false,

  tracesSampleRate: 0.1,

  beforeSend: scrubServerEvent,
  beforeSendTransaction: dropSurveyAccountId,
});
